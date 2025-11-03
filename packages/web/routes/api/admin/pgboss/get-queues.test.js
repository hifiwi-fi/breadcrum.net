import { test, suite } from 'node:test'
import { strict as assert } from 'node:assert'
import { build } from '../../../../test/helper.js'
import { createTestUser } from './pgboss-test-utils.js'

await suite('get queues', async () => {
  await test('get queues', async (t) => {
    const app = await build(t)

    await t.test('returns queues list for admin user', async (t) => {
      const { token } = await createTestUser(app, t, { admin: true })

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/queues',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      assert.equal(response.statusCode, 200)
      const body = response.json()
      assert.ok(Array.isArray(body.queues))

      // Check that queues have the expected v11 properties
      if (body.queues.length > 0) {
        const queue = body.queues[0]
        assert.ok(typeof queue.name === 'string')
        assert.ok(typeof queue.policy === 'string')
        assert.ok(typeof queue.retry_limit === 'number')
        assert.ok(typeof queue.retry_delay === 'number')
        assert.ok(typeof queue.retry_backoff === 'boolean')
        assert.ok(typeof queue.expire_seconds === 'number')
        assert.ok(typeof queue.retention_seconds === 'number')
        assert.ok(typeof queue.deletion_seconds === 'number')
        assert.ok(typeof queue.partition === 'boolean')
        assert.ok(typeof queue.deferred_count === 'number')
        assert.ok(typeof queue.queued_count === 'number')
        assert.ok(typeof queue.active_count === 'number')
        assert.ok(typeof queue.total_count === 'number')
      }
    })

    await t.test('requires authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/queues'
      })

      assert.equal(response.statusCode, 401)
    })

    await t.test('requires admin role', async (t) => {
      const { token } = await createTestUser(app, t, { admin: false })

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/queues',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      assert.equal(response.statusCode, 401)
    })
  })
})
