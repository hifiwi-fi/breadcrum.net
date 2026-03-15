import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../../test/helper.js'
import { createTestUser, insertStripeCustomer } from '../../../billing/billing-test-utils.js'

const STRIPE_TEST_ENV = {
  STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'] ?? 'sk_test_fakekeyfortesting00000000000',
  STRIPE_WEBHOOK_SECRET: process.env['STRIPE_WEBHOOK_SECRET'] ?? 'whsec_fakesecretfortesting000000000000',
}

await suite('DELETE /api/admin/users/:id', async () => {
  await test('auth and permission checks', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('returns 401 when unauthenticated', async (t) => {
      const target = await createTestUser(app, t)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${target.userId}`,
      })

      assert.strictEqual(res.statusCode, 401, 'Should require authentication')
    })

    await t.test('returns 401 when non-admin user attempts delete', async (t) => {
      const attacker = await createTestUser(app, t)
      const target = await createTestUser(app, t)

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${target.userId}`,
        headers: { authorization: `Bearer ${attacker.token}` },
      })

      assert.strictEqual(res.statusCode, 401, 'Non-admin should be rejected')
    })

    await t.test('returns 409 when admin attempts to delete themselves', async (t) => {
      const admin = await createTestUser(app, t, { admin: true })

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${admin.userId}`,
        headers: { authorization: `Bearer ${admin.token}` },
      })

      assert.strictEqual(res.statusCode, 409, 'Admin should not be able to delete themselves')
    })
  })

  await test('Stripe cleanup: user with no Stripe customer', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)

    await t.test('deletes user successfully when no Stripe customer exists', async (t) => {
      const admin = await createTestUser(app, t, { admin: true })
      const target = await createTestUser(app, t)

      // No stripe_customers row for target — no Stripe API calls needed
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${target.userId}`,
        headers: { authorization: `Bearer ${admin.token}` },
      })

      assert.strictEqual(res.statusCode, 200, 'Should delete user when no Stripe customer')
      const body = JSON.parse(res.payload)
      assert.strictEqual(body.status, 'ok')

      // User should no longer exist
      const userRow = await app.pg.query('SELECT id FROM users WHERE id = $1', [target.userId])
      assert.strictEqual(userRow.rows.length, 0, 'User should be deleted from DB')
    })
  })

  await test('Stripe cleanup: user with Stripe customer and fake key', async (t) => {
    const app = await build(t, STRIPE_TEST_ENV)
    const hasLiveStripeKey = (process.env['STRIPE_SECRET_KEY'] ?? '').startsWith('sk_test_') &&
      process.env['STRIPE_SECRET_KEY'] !== 'sk_test_fakekeyfortesting00000000000'

    await t.test('blocks deletion when Stripe API call fails with non-resource-missing error', async (t) => {
      if (hasLiveStripeKey) {
        t.skip('Using live Stripe key; skipping fake-key Stripe-error path test')
        return
      }

      const admin = await createTestUser(app, t, { admin: true })
      const target = await createTestUser(app, t)

      // Insert a Stripe customer mapping — causes Stripe API calls during deletion
      await insertStripeCustomer(app, t, { userId: target.userId, stripeCustomerId: 'cus_fakeid' })

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/admin/users/${target.userId}`,
        headers: { authorization: `Bearer ${admin.token}` },
      })

      // Stripe rejects the fake key — this is a non-resource-missing error so deletion should be blocked
      assert.ok(
        res.statusCode === 500 || res.statusCode === 400,
        `Should fail when Stripe API call throws with fake key, got ${res.statusCode}`
      )

      // User should still exist (deletion was blocked)
      const userRow = await app.pg.query('SELECT id FROM users WHERE id = $1', [target.userId])
      assert.strictEqual(userRow.rows.length, 1, 'User should NOT be deleted when Stripe call fails')
    })
  })
})
