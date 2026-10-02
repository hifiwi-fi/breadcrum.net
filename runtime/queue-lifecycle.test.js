import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate as nextTurn } from 'node:timers/promises'
import { createProcessorTracker, createQueueLifecycle } from './queue-lifecycle.js'

import { PgBoss } from 'pg-boss'
/** @import { StopOptions } from 'pg-boss' */

test('intake stops without closing the boss pool; final close drains once', async () => {
  /** @type {string[]} */
  const stoppedQueues = []
  /** @type {StopOptions[]} */
  const stops = []
  const drained = Promise.withResolvers()
  /** @type {Pick<PgBoss, 'offWork' | 'getWipData' | 'stop'>} */
  const boss = {
    getWipData () { return [] },
    async offWork (name, options) {
      assert.equal(options?.wait, false)
      stoppedQueues.push(name)
    },
    async stop (options) {
      assert.ok(options)
      stops.push(options)
      await drained.promise
    },
  }
  const workers = { resolveBookmark: ['worker-1'], resolveEpisode: ['worker-2'] }
  const lifecycle = createQueueLifecycle(boss, workers, 30000, createProcessorTracker())
  await Promise.all([lifecycle.stopIntake(), lifecycle.stopIntake()])
  assert.deepEqual(stoppedQueues, ['resolveBookmark', 'resolveEpisode'])
  assert.deepEqual(stops, [])
  const close = lifecycle.close()
  const secondClose = lifecycle.close()
  await nextTurn()
  assert.deepEqual(stops, [{ graceful: true, timeout: 30000 }])
  drained.resolve(undefined)
  await Promise.all([close, secondClose])
  assert.equal(stops.length, 1)
})

test('cleanup also stops boss after partial startup, before workers exist', async () => {
  let stopped = false
  const lifecycle = createQueueLifecycle({
    getWipData () { return [] },
    async offWork () { assert.fail('No consumer was registered') },
    async stop () { stopped = true },
  }, {}, 1000, createProcessorTracker())
  await lifecycle.stopIntake()
  await lifecycle.close()
  assert.equal(stopped, true)
})

test('detached processors settle before boss closes, preserving results and rejections', async () => {
  const processors = createProcessorTracker()
  const release = Promise.withResolvers()
  const failure = new Error('processor failed')
  let stopped = false
  let intakeStopped = false
  const lifecycle = createQueueLifecycle({
    async offWork () { intakeStopped = true },
    // pg-boss has already expired/aborted this batch and no longer reports it.
    getWipData () { return [] },
    async stop () { stopped = true },
  }, { example: ['worker'] }, 1000, processors)
  const success = processors.track(async () => {
    await release.promise
    assert.equal(stopped, false, 'Follow-up sends must retain the boss pool')
    return 'completed'
  })()
  const rejected = processors.track(async () => {
    await release.promise
    throw failure
  })()
  const rejection = assert.rejects(rejected, error => error === failure)
  const closing = lifecycle.close()
  await nextTurn()
  assert.equal(intakeStopped, true)
  assert.equal(stopped, false)
  release.resolve(undefined)
  assert.equal(await success, 'completed')
  await Promise.all([rejection, closing])
  assert.equal(stopped, true)
})

test('drain observes synchronous throws without swallowing them or leaking rejected promises', async () => {
  const processors = createProcessorTracker()
  const failure = new Error('synchronous processor failure')
  const handler = processors.track(() => { throw failure })
  await assert.rejects(handler(), error => error === failure)
  await processors.drain()
})

test('an in-progress fetch can invoke a tracked processor after intake stops', async t => {
  const processors = createProcessorTracker()
  const release = Promise.withResolvers()
  const boss = new PgBoss('postgres://postgres:postgres@127.0.0.1:5432/postgres')
  t.mock.method(boss, 'offWork', async () => {})
  let fetching = true
  const wip = {
    id: 'worker',
    name: 'example',
    options: { pollingInterval: 1000, notifyPollingInterval: 1000 },
    state: 'stopping',
    count: 0,
    createdOn: Date.now(),
    lastFetchedOn: null,
    lastJobStartedOn: null,
    lastJobEndedOn: null,
    lastJobDuration: null,
    lastError: null,
    lastErrorOn: null,
  }
  t.mock.method(boss, 'getWipData', () => fetching ? [wip] : [])
  const stop = t.mock.method(boss, 'stop', async () => {})
  const lifecycle = createQueueLifecycle(boss, { example: ['worker'] }, 1000, processors)
  const closing = lifecycle.close()
  await nextTurn()
  assert.equal(stop.mock.callCount(), 0)
  const processing = processors.track(async () => { await release.promise })()
  fetching = false
  await nextTurn()
  assert.equal(stop.mock.callCount(), 0)
  release.resolve(undefined)
  await Promise.all([processing, closing])
  assert.equal(stop.mock.callCount(), 1)
})
