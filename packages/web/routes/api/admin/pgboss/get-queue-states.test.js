import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { build } from '../../../../test/helper.js'
import { createTestUser } from './pgboss-test-utils.js'

test('get queue states', async (t) => {
  const app = await build(t)

  await t.test('returns queue states for admin user', async () => {
    const { token } = await createTestUser(app, { admin: true })

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/pgboss/states',
      headers: {
        authorization: `Bearer ${token}`
      }
    })

    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.ok(typeof body.created === 'number')
    assert.ok(typeof body.retry === 'number')
    assert.ok(typeof body.active === 'number')
    assert.ok(typeof body.completed === 'number')
    assert.ok(typeof body.cancelled === 'number')
    assert.ok(typeof body.failed === 'number')
    assert.ok(typeof body.all === 'number')
    assert.ok(typeof body.queues === 'object')
  })

  await t.test('requires authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/pgboss/states'
    })

    assert.equal(response.statusCode, 401)
  })

  await t.test('requires admin role', async () => {
    const { token } = await createTestUser(app, { admin: false })

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/pgboss/states',
      headers: {
        authorization: `Bearer ${token}`
      }
    })

    assert.equal(response.statusCode, 401)
  })
})
