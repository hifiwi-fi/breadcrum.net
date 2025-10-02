import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { build } from '../../../../test/helper.js'
import { createTestUser } from './pgboss-test-utils.js'

test('get maintenance', async (t) => {
  const app = await build(t)

  await t.test('returns maintenance info for admin user', async () => {
    const { token } = await createTestUser(app, { admin: true })

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/pgboss/maintenance',
      headers: {
        authorization: `Bearer ${token}`
      }
    })

    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.ok(body.version !== undefined)
    assert.ok(body.is_installed !== undefined)
    assert.ok(typeof body.maintenance_interval_seconds === 'number')
    assert.ok(typeof body.supervise_interval_seconds === 'number')
    assert.ok(typeof body.delete_after_seconds === 'number')
    assert.ok(typeof body.supervision_overdue === 'boolean')
    assert.ok(typeof body.maintenance_overdue === 'boolean')
    // last_supervise and last_maintenance can be null or date strings
    assert.ok(body.last_supervise === null || typeof body.last_supervise === 'string')
    assert.ok(body.last_maintenance === null || typeof body.last_maintenance === 'string')
  })

  await t.test('requires authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/pgboss/maintenance'
    })

    assert.equal(response.statusCode, 401)
  })

  await t.test('requires admin role', async () => {
    const { token } = await createTestUser(app, { admin: false })

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/pgboss/maintenance',
      headers: {
        authorization: `Bearer ${token}`
      }
    })

    assert.equal(response.statusCode, 401)
  })
})
