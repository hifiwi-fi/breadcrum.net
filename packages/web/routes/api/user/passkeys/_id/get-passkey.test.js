import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../../test/helper.js'
import { createTestUser } from '../../auth-tokens/auth-tokens-test-utils.js'
import { createTestPasskey, assertPasskeyShape } from '../passkeys-test-utils.js'

await suite('GET /api/user/passkeys/:id', async () => {
  await test('get passkey - success cases', async (t) => {
    const app = await build(t)

    await t.test('returns passkey when it exists and belongs to user', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test Passkey' })

      const res = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200 OK')

      const body = JSON.parse(res.payload)
      assert.strictEqual(body.id, passkey.id, 'Should return correct passkey ID')
      assert.strictEqual(body.name, 'Test Passkey', 'Should return correct name')
      assertPasskeyShape(assert, body)
    })

    await t.test('returns all passkey fields correctly', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const testTransports = ['internal', 'usb']
      const testAaguid = 'test-aaguid-12345'

      const passkey = await createTestPasskey(app, user.userId, {
        name: 'Full Passkey',
        transports: testTransports,
        aaguid: testAaguid
      })

      const res = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 200)

      const body = JSON.parse(res.payload)
      assert.strictEqual(body.id, passkey.id)
      assert.ok(body.credential_id, 'Should have credential_id')
      assert.strictEqual(body.name, 'Full Passkey')
      assert.ok(body.created_at, 'Should have created_at')
      assert.ok('updated_at' in body, 'Should have updated_at field')
      assert.ok('last_used' in body, 'Should have last_used field')
      assert.deepStrictEqual(body.transports, testTransports, 'Should have correct transports')
      assert.strictEqual(body.aaguid, testAaguid, 'Should have correct aaguid')
    })

    await t.test('handles null values correctly', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, {
        name: 'Null Fields Passkey',
        transports: null,
        aaguid: null
      })

      const res = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 200)

      const body = JSON.parse(res.payload)
      assert.strictEqual(body.transports, null, 'Null transports should be preserved')
      assert.strictEqual(body.aaguid, null, 'Null aaguid should be preserved')
      assert.strictEqual(body.updated_at, null, 'updated_at should be null initially')
      assert.strictEqual(body.last_used, null, 'last_used should be null initially')
    })

    await t.test('does not expose sensitive fields', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Secure Passkey' })

      const res = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 200)

      const body = JSON.parse(res.payload)
      assert.ok(!('public_key' in body), 'Should not expose public_key')
      assert.ok(!('counter' in body), 'Should not expose counter')
      assert.ok(!('user_id' in body), 'Should not expose user_id')
    })
  })

  await test('get passkey - error cases', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when not authenticated', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test Passkey' })

      const res = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey.id}`
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
    })

    await t.test('returns 401 with invalid token', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const passkey = await createTestPasskey(app, user.userId, { name: 'Test Passkey' })

      const res = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: 'Bearer invalid-token'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
    })

    await t.test('returns 404 when passkey does not exist', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const res = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${nonExistentId}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 Not Found')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('not found'), 'Error should mention not found')
    })

    await t.test('returns 404 when passkey belongs to different user', async (t) => {
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      if (!user1 || !user2) assert.fail('Could not create users')

      // Create passkey for user1
      const passkey = await createTestPasskey(app, user1.userId, { name: 'User 1 Passkey' })

      // Try to access with user2's token
      const res = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey.id}`,
        headers: {
          authorization: `Bearer ${user2.token}`
        }
      })

      assert.strictEqual(res.statusCode, 404, 'Should return 404 Not Found')
      const body = JSON.parse(res.payload)
      assert.ok(body.message.includes('not found'), 'Should not reveal passkey exists for different user')
    })

    await t.test('returns 400 with invalid UUID format', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys/not-a-valid-uuid',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 400, 'Should return 400 Bad Request')
    })
  })

  await test('get passkey - isolation cases', async (t) => {
    const app = await build(t)

    await t.test('user can only access their own passkeys', async (t) => {
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      if (!user1 || !user2) assert.fail('Could not create users')

      // Create passkeys for both users
      const passkey1 = await createTestPasskey(app, user1.userId, { name: 'User 1 Passkey' })
      const passkey2 = await createTestPasskey(app, user2.userId, { name: 'User 2 Passkey' })

      // User1 can access their own passkey
      const res1 = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey1.id}`,
        headers: {
          authorization: `Bearer ${user1.token}`
        }
      })
      assert.strictEqual(res1.statusCode, 200, 'User 1 should access their own passkey')

      // User1 cannot access user2's passkey
      const res2 = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey2.id}`,
        headers: {
          authorization: `Bearer ${user1.token}`
        }
      })
      assert.strictEqual(res2.statusCode, 404, 'User 1 should not access user 2 passkey')

      // User2 can access their own passkey
      const res3 = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey2.id}`,
        headers: {
          authorization: `Bearer ${user2.token}`
        }
      })
      assert.strictEqual(res3.statusCode, 200, 'User 2 should access their own passkey')

      // User2 cannot access user1's passkey
      const res4 = await app.inject({
        method: 'GET',
        url: `/api/user/passkeys/${passkey1.id}`,
        headers: {
          authorization: `Bearer ${user2.token}`
        }
      })
      assert.strictEqual(res4.statusCode, 404, 'User 2 should not access user 1 passkey')
    })
  })
})
