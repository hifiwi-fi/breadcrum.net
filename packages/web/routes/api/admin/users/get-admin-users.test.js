import { test, suite } from 'node:test'
import { strict as assert } from 'node:assert'
import { build } from '../../../../test/helper.js'
import { createTestUser } from '../pgboss/pgboss-test-utils.js'

/**
 * @param {import('node:assert')} assert
 * @param {any} geoip
 */
function assertGeoipShape (assert, geoip) {
  assert.ok(geoip, 'GeoIP data should be present')
  assert.strictEqual(typeof geoip, 'object')
  assert.ok('country_iso' in geoip)
  assert.ok('country_name' in geoip)
  assert.ok('flag_emoji' in geoip)
  assert.ok('region_iso' in geoip)
  assert.ok('region_name' in geoip)
  assert.ok('city_name' in geoip)
  assert.ok('time_zone' in geoip)
}

await suite('admin users geoip', async () => {
  await test('admin users geoip', async (t) => {
    const accountId = process.env['MAXMIND_ACCOUNT_ID']
    const licenseKey = process.env['MAXMIND_LICENSE_KEY']

    assert.ok(accountId, 'MAXMIND_ACCOUNT_ID must be set for GeoIP tests')
    assert.ok(licenseKey, 'MAXMIND_LICENSE_KEY must be set for GeoIP tests')

    const app = await build(t, {
      MAXMIND_ACCOUNT_ID: accountId,
      MAXMIND_LICENSE_KEY: licenseKey,
    })
    if (!app.hasDecorator('geoip')) {
      if (process.env['CI']) {
        t.skip('GeoIP database not available in CI; skipping enrichment checks.')
        return
      }
      assert.fail('GeoIP plugin should decorate fastify')
    }

    await t.test('returns geoip enrichment for last seen and registration IPs', async (t) => {
      const adminUser = await createTestUser(app, t, { admin: true })

      await app.pg.query('UPDATE users SET registration_ip = $1 WHERE id = $2', ['2.2.2.2', adminUser.userId])
      await app.pg.query('UPDATE auth_tokens SET ip = $1 WHERE owner_id = $2', ['1.1.1.1', adminUser.userId])

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/users?per_page=50',
        headers: {
          authorization: `Bearer ${adminUser.token}`
        }
      })

      assert.equal(response.statusCode, 200)
      const body = response.json()

      const adminRecord = body.data.find((/** @type {{ id: string }} */ user) => user.id === adminUser.userId)
      assert.ok(adminRecord, 'Should include admin user record in response')

      assertGeoipShape(assert, adminRecord.geoip)
      assertGeoipShape(assert, adminRecord.registration_geoip)
    })
  })
})
