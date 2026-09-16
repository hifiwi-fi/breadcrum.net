import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createShutdown } from './shutdown.js'
import { createProcessorTracker, createQueueLifecycle } from './queue-lifecycle.js'

test('repeated shutdown waits for app/jobs before flushing telemetry exactly once', async () => {
  const drained = Promise.withResolvers()
  /** @type {string[]} */
  const events = []
  const shutdown = createShutdown({
    timeoutMs: 1000,
    async closeApp () {
      events.push('drain')
      await drained.promise
      events.push('pools closed')
    },
    async shutdownTelemetry () { events.push('telemetry closed') },
    onTimeout () { assert.fail('Shutdown should drain before deadline') },
  })
  const first = shutdown()
  const second = shutdown()
  assert.equal(first, second)
  assert.deepEqual(events, ['drain'])
  drained.resolve(undefined)
  await first
  assert.deepEqual(events, ['drain', 'pools closed', 'telemetry closed'])
})

test('telemetry is flushed even if app cleanup fails', async () => {
  let flushed = false
  const shutdown = createShutdown({
    timeoutMs: 1000,
    async closeApp () { throw new Error('pool close failed') },
    async shutdownTelemetry () { flushed = true },
    onTimeout () { assert.fail('Unexpected deadline') },
  })
  await assert.rejects(shutdown(), /pool close failed/)
  assert.equal(flushed, true)
})

test('shutdown is bounded when startup or resource drain hangs', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let expired = false
  const shutdown = createShutdown({
    timeoutMs: 1000,
    closeApp: () => new Promise(() => {}),
    async shutdownTelemetry () { assert.fail('App is still draining') },
    onTimeout (error) {
      assert.match(error.message, /interrupted jobs may be retried/)
      expired = true
    },
  })
  const closed = shutdown()
  t.mock.timers.tick(1000)
  await assert.rejects(closed, /Shutdown exceeded/)
  assert.equal(expired, true)
})

test('a processor ignored by pg-boss keeps pools open and the process deadline armed', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const processors = createProcessorTracker()
  processors.track(async () => new Promise(() => {}))()
  const lifecycle = createQueueLifecycle({
    async offWork () {},
    getWipData () { return [] },
    async stop () { assert.fail('Boss must remain available to the real processor') },
  }, { stuck: ['worker'] }, 30000, processors)
  let expired = false
  const shutdown = createShutdown({
    timeoutMs: 45000,
    async closeApp () {
      await lifecycle.close()
      assert.fail('Application pools must not close before the processor settles')
    },
    async shutdownTelemetry () { assert.fail('Shutdown is still draining') },
    onTimeout () { expired = true },
  })
  const closing = shutdown()
  await lifecycle.stopIntake()
  t.mock.timers.tick(30001)
  assert.equal(expired, false)
  t.mock.timers.tick(14999)
  await assert.rejects(closing, /Shutdown exceeded 45000ms/)
  assert.equal(expired, true)
})
