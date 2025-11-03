import { test, suite } from 'node:test'
import { strict as assert } from 'node:assert'
import { build } from '../../../../test/helper.js'
import { createTestUser } from './pgboss-test-utils.js'

await suite('get summary', async () => {
  await test('get summary', async (t) => {
    const app = await build(t)

    await t.test('returns summary for admin user', async (t) => {
      const { token } = await createTestUser(app, t, { admin: true })

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/summary',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      assert.equal(response.statusCode, 200)
      const body = response.json()

      // Check overall health status
      assert.ok(typeof body.healthy === 'boolean')

      // Check totals (v11 doesn't include completed count)
      assert.ok(body.totals)
      assert.ok(typeof body.totals.jobs === 'number')
      assert.ok(typeof body.totals.active === 'number')
      assert.ok(typeof body.totals.pending === 'number')
      assert.ok(typeof body.totals.failed === 'number')

      // Check queues array
      assert.ok(Array.isArray(body.queues))
      if (body.queues.length > 0) {
        const queue = body.queues[0]
        assert.ok(typeof queue.name === 'string')
        assert.ok(typeof queue.total === 'number')
        assert.ok(typeof queue.active === 'number')
        assert.ok(typeof queue.pending === 'number')
        assert.ok(typeof queue.failed === 'number')
      }

      // Check recent failures
      assert.ok(Array.isArray(body.recent_failures))

      // Check maintenance status
      assert.ok(body.maintenance)
      assert.ok(typeof body.maintenance.overdue === 'boolean')
    })

    await t.test('requires authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/summary'
      })

      assert.equal(response.statusCode, 401)
    })

    await t.test('requires admin role', async (t) => {
      const { token } = await createTestUser(app, t, { admin: false })

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/summary',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      assert.equal(response.statusCode, 401)
    })
  })
})
