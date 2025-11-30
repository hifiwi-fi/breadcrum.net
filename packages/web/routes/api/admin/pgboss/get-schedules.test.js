import { test, suite } from 'node:test'
import { strict as assert } from 'node:assert'
import { build } from '../../../../test/helper.js'
import { createTestUser } from './pgboss-test-utils.js'

await suite('get schedules', async () => {
  await test('get schedules', async (t) => {
    const app = await build(t)

    await t.test('returns schedules list for admin user', async (t) => {
      const { token } = await createTestUser(app, t, { admin: true })

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/schedules',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      assert.equal(response.statusCode, 200)
      const body = response.json()
      assert.ok(Array.isArray(body.schedules))

      // Check that schedules have the expected v11 properties
      if (body.schedules.length > 0) {
        const schedule = body.schedules[0]
        assert.ok(typeof schedule.name === 'string')
        assert.ok(typeof schedule.key === 'string')
        assert.ok(typeof schedule.cron === 'string')
        assert.ok(typeof schedule.timezone === 'string')
        assert.ok(schedule.created_on !== undefined)
        assert.ok(schedule.updated_on !== undefined)
      }
    })

    await t.test('requires authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/schedules'
      })

      assert.equal(response.statusCode, 401)
    })

    await t.test('requires admin role', async (t) => {
      const { token } = await createTestUser(app, t, { admin: false })

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/pgboss/schedules',
        headers: {
          authorization: `Bearer ${token}`
        }
      })

      assert.equal(response.statusCode, 401)
    })
  })
})
