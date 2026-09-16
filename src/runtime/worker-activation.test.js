/** @import { TestContext } from 'node:test' */
/** @import { ErrorEvent } from '@sentry/node' */
/** @import { RuntimeConfig } from '#config/env-schema.js' */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { PgBoss } from 'pg-boss'
import fp from 'fastify-plugin'
import * as Sentry from '@sentry/node'
import { context } from '@opentelemetry/api'
import workerPlugin from '#plugins/worker/pgboss.js'
import metricsPlugin from '#plugins/shared/otel-metrics.js'
import { loadConfig } from '#config/config.js'
import { createProcessorTracker, createQueueLifecycle } from './queue-lifecycle.js'

/** @param {TestContext} t @param {Partial<RuntimeConfig>} [envData] */
async function workerHarness (t, envData) {
  const app = Fastify({ logger: false })
  t.after(() => app.close())
  // Construct without starting: the instance has the real PgBoss shape but never opens a pool.
  const queueBoss = new PgBoss('postgres://postgres:postgres@127.0.0.1:5432/postgres')
  const boss = {
    work: t.mock.method(queueBoss, 'work', async (/** @type {string} */ name, /** @type {unknown} */ handler) => {
      assert.equal(typeof handler, 'function')
      assert.equal(app.hasDecorator('pgboss'), true)
      assert.equal(app.hasDecorator('otel'), true)
      assert.equal(app.hasDecorator('ytdlpCache'), true)
      return `${name}-worker`
    }),
    schedule: t.mock.method(queueBoss, 'schedule', async (/** @type {string} */ name, /** @type {string} */ cron, /** @type {unknown} */ data, /** @type {unknown} */ options) => {
      assert.equal(data, undefined)
      assert.deepEqual(options, { tz: 'UTC' })
      return `${name}:${cron}`
    }),
    offWork: t.mock.method(queueBoss, 'offWork', async () => {}),
    stop: t.mock.method(queueBoss, 'stop', async () => {}),
  }
  await app.register(fp(async fastify => {
    fastify.decorate('config', loadConfig('worker', { dotEnvPath: false, processEnv: {}, envData }))
  }, { name: 'env' }))
  await app.register(fp(async () => {}, { name: 'pg' }))
  await app.register(fp(async fastify => {
    fastify.decorate('ytdlpCache', {
      async get () { assert.fail('Activation tests must not read metadata cache') },
      async set () { assert.fail('Activation tests must not write metadata cache') },
    })
  }, { name: 'cache' }))
  await app.register(metricsPlugin)
  await app.register(fp(async fastify => {
    /** @type {Record<string, string[]>} */
    const workers = {}
    const processors = createProcessorTracker()
    const unexpectedSend = async () => { assert.fail('Activation tests must not enqueue jobs') }
    fastify.decorate('pgboss', {
      boss: queueBoss,
      config: {},
      workers,
      track: processors.track,
      queues: {
        resolveEpisodeQ: { name: 'resolveEpisode', send: unexpectedSend, insert: unexpectedSend },
        resolveArchiveQ: { name: 'resolveArchive', send: unexpectedSend, insert: unexpectedSend },
        resolveBookmarkQ: { name: 'resolveBookmark', send: unexpectedSend, insert: unexpectedSend },
        cleanupAuthTokensQ: { name: 'cleanupAuthTokens' },
        cleanupStaleResolutionsQ: { name: 'cleanupStaleResolutions' },
      },
    })
    const lifecycle = createQueueLifecycle(queueBoss, workers, 30000, processors)
    fastify.addHook('preClose', lifecycle.stopIntake)
    fastify.addHook('onClose', lifecycle.close)
  }, { name: 'pgboss' }))
  await app.register(workerPlugin)
  return { app, boss }
}

test('workers activate only at ready with shared decorators and original schedules/concurrency', async t => {
  const { app, boss } = await workerHarness(t)
  assert.equal(boss.work.mock.callCount(), 0)
  assert.equal(boss.schedule.mock.callCount(), 0)
  await app.ready()
  assert.equal(boss.work.mock.callCount(), 8)
  assert.deepEqual(boss.schedule.mock.calls.map(call => call.arguments[1]), ['0 3 * * *', '0 4 * * *'])
  assert.deepEqual(Object.values(app.pgboss.workers).map(workers => workers.length), [2, 2, 2, 1, 1])
  await app.close()
  assert.equal(boss.offWork.mock.callCount(), 5)
  assert.equal(boss.stop.mock.callCount(), 1)
})

test('job errors carry isolated user/job scopes without leaking into the surrounding request', async t => {
  /** @type {ErrorEvent[]} */
  const events = []
  const dsn = 'https://test@example.invalid/1'
  Sentry.init({
    dsn,
    defaultIntegrations: false,
    skipOpenTelemetrySetup: true,
    beforeSend (event) {
      events.push(event)
      return null
    },
    transport: () => ({
      async send () { assert.fail('Test events must never leave this process') },
      async flush () { return true },
    }),
  })
  t.after(async () => {
    Sentry.setUser(null)
    await Sentry.close(1000)
  })
  const contextManager = new Sentry.SentryContextManager().enable()
  assert.equal(context.setGlobalContextManager(contextManager), true)
  t.after(() => context.disable())
  Sentry.setUser({ id: 'request-user' })
  const { app, boss } = await workerHarness(t, { SENTRY_WORKER_DSN: dsn })
  await app.ready()
  const handler = boss.work.mock.calls[0]?.arguments[1]
  assert.ok(typeof handler === 'function')
  await Promise.all([
    assert.rejects(handler([{ id: 'job-one', name: 'resolveEpisode', data: { userId: 'user-one', url: 'invalid-url' } }])),
    assert.rejects(handler([{ id: 'job-two', name: 'resolveEpisode', data: { userId: 'user-two', url: 'invalid-url' } }])),
  ])
  assert.equal(await Sentry.flush(1000), true)
  assert.deepEqual(events.map(event => ({
    user: event.user?.id,
    queue: event.tags?.['pgboss.queue'],
    job: event.contexts?.['pgboss.job']?.['id'],
  })).sort((a, b) => String(a.job).localeCompare(String(b.job))), [
    { user: 'user-one', queue: 'resolveEpisode', job: 'job-one' },
    { user: 'user-two', queue: 'resolveEpisode', job: 'job-two' },
  ])
  assert.equal(Sentry.getIsolationScope().getUser()?.id, 'request-user')
})

test('partial consumer activation still owns and closes the shared boss', async t => {
  const { app, boss } = await workerHarness(t)
  boss.work.mock.mockImplementationOnce(async () => { throw new Error('consumer startup failed') }, 2)
  await assert.rejects(async () => { await app.ready() }, /consumer startup failed/)
  await app.close()
  assert.equal(boss.stop.mock.callCount(), 1)
})
