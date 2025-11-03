import { test, suite } from 'node:test'
import { strict as assert } from 'node:assert'
import { build } from '../../../../test/helper.js'
import { createTestUser } from './pgboss-test-utils.js'

await suite('get jobs', async () => {
  await test('get jobs', async (t) => {
    const app = await build(t)

    await t.test('returns jobs list for admin user', async (t) => {
      const { token } = await createTestUser(app, t, { admin: true })

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/jobs',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      assert.equal(response.statusCode, 200)
      const body = response.json()
      assert.ok(Array.isArray(body.jobs))
      assert.ok(body.pagination)
      assert.ok(typeof body.pagination.total === 'number')
      assert.ok(typeof body.pagination.offset === 'number')
      assert.ok(typeof body.pagination.limit === 'number')
      assert.ok(typeof body.pagination.hasMore === 'boolean')
    })

    await t.test('accepts query parameters', async (t) => {
      const { token } = await createTestUser(app, t, { admin: true })

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/jobs?state=active&limit=10&offset=0',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      assert.equal(response.statusCode, 200)
      const body = response.json()
      assert.ok(Array.isArray(body.jobs))
    })

    await t.test('requires authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/jobs'
      })

      assert.equal(response.statusCode, 401)
    })

    await t.test('requires admin role', async (t) => {
      const { token } = await createTestUser(app, t, { admin: false })

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/jobs',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      assert.equal(response.statusCode, 401)
    })
  })
})
