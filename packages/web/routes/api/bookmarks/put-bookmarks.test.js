import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../test/helper.js'
import {
  createTestUser,
  enableBillingFlags,
  insertCustomSubscription,
} from '../billing/billing-test-utils.js'

const STRIPE_TEST_ENV = {
  STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] ?? 'sk_test_fakekeyfortesting00000000000',
  STRIPE_WEBHOOK_SECRET: process.env['STRIPE_WEBHOOK_SECRET'] ?? 'whsec_fakesecretfortesting000000000000',
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} token
 * @param {string} [url]
 */
async function createBookmark (app, token, url = `https://example.com/${Date.now()}`) {
  return app.inject({
    method: 'PUT',
    url: '/api/bookmarks/',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    payload: { url, title: 'Test Bookmark' },
  })
}

await suite('PUT /api/bookmarks/ — quota enforcement', async () => {
  await test('subscriptions_required: false — no quota regardless of count', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('allows bookmark creation when subscriptions_required is false', async (t) => {
      // billing_enabled with subscriptions_required: false (default)
      await enableBillingFlags(app, t, { freeBookmarksPerMonth: 1 })
      const user = await createTestUser(app, t)

      // Create 2 bookmarks even though limit is 1 — quota not enforced
      const res1 = await createBookmark(app, user.token)
      assert.strictEqual(res1.statusCode, 201, 'First bookmark should be created')

      const res2 = await createBookmark(app, user.token)
      // quota not enforced when subscriptions_required is false
      assert.ok(
        res2.statusCode === 201 || res2.statusCode === 200,
        `Second bookmark should succeed (no quota), got ${res2.statusCode}: ${res2.payload}`
      )
    })
  })

  await test('subscriptions_required: true — free user quota', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('allows bookmark when free user is below the limit', async (t) => {
      await enableBillingFlags(app, t, { subscriptionsRequired: true, freeBookmarksPerMonth: 5 })
      const user = await createTestUser(app, t)

      const res = await createBookmark(app, user.token)
      assert.strictEqual(res.statusCode, 201, 'Should create bookmark when under limit')
    })

    await t.test('returns 402 when free user is at the limit', async (t) => {
      await enableBillingFlags(app, t, { subscriptionsRequired: true, freeBookmarksPerMonth: 1 })
      const user = await createTestUser(app, t)

      // Use up the 1-bookmark limit
      const first = await createBookmark(app, user.token)
      assert.strictEqual(first.statusCode, 201, 'First bookmark should be created')

      // Next create should hit the quota
      const second = await createBookmark(app, user.token)
      assert.strictEqual(second.statusCode, 402, 'Should return 402 when free limit reached')
      const body = JSON.parse(second.payload)
      assert.ok(body.error, 'Should include error message')
    })
  })

  await test('subscriptions_required: true — subscribed user bypasses quota', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('subscribed user can create bookmarks beyond the free limit', async (t) => {
      await enableBillingFlags(app, t, { subscriptionsRequired: true, freeBookmarksPerMonth: 1 })
      const user = await createTestUser(app, t)

      // Grant a custom subscription (active, no expiry)
      await insertCustomSubscription(app, t, { userId: user.userId })

      // Use up what would be the free limit
      const first = await createBookmark(app, user.token)
      assert.strictEqual(first.statusCode, 201, 'First bookmark should be created')

      // Subscribed user should not be blocked
      const second = await createBookmark(app, user.token)
      assert.ok(
        second.statusCode === 201 || second.statusCode === 200,
        `Subscribed user should not be blocked by quota, got ${second.statusCode}: ${second.payload}`
      )
    })
  })
})
