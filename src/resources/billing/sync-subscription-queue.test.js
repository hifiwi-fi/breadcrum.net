/** @import { PgBoss, SendOptions } from 'pg-boss' */
/** @import { SyncSubscriptionData } from './sync-subscription-queue.js' */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSyncSubscriptionQ } from './sync-subscription-queue.js'

test('subscription sync queue retains every event as a durable job', async () => {
  /** @type {{ name: string, data: { customerId: string }, options: object }[]} */
  const sent = []
  const boss = /** @type {PgBoss} */ (/** @type {unknown} */ ({
    async createQueue () {},
    async send (/** @type {string} */ name, /** @type {SyncSubscriptionData} */ data, /** @type {SendOptions} */ options) {
      sent.push({ name, data, options })
      return `job-${sent.length}`
    },
  }))

  const queue = await createSyncSubscriptionQ({ boss })
  await queue.send({ data: { customerId: 'cus_123' } })
  await queue.send({ data: { customerId: 'cus_123' } })

  assert.equal(sent.length, 2)
  assert.deepEqual(sent.map(job => job.data), [
    { customerId: 'cus_123' },
    { customerId: 'cus_123' },
  ])
})
