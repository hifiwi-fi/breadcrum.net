import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../test/helper.js'
import { createTestUser } from '../auth-tokens/auth-tokens-test-utils.js'
import {
  createTestPasskey,
  getPasskeyCount,
  assertPasskeyShape
} from './passkeys-test-utils.js'

await suite('GET /api/user/passkeys', async () => {
  await test('list passkeys - success cases', async (t) => {
    const app = await build(t)

    await t.test('returns empty array when user has no passkeys', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200 OK')

      const body = JSON.parse(res.payload)
      assert.ok(Array.isArray(body), 'Response should be an array')
      assert.strictEqual(body.length, 0, 'Array should be empty')
    })

    await t.test('returns user passkeys when they exist', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      // Create test passkeys
      await createTestPasskey(app, user.userId, { name: 'Test Passkey 1' })
      await createTestPasskey(app, user.userId, { name: 'Test Passkey 2' })
      await createTestPasskey(app, user.userId, { name: 'Test Passkey 3' })

      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200 OK')

      const body = JSON.parse(res.payload)
      assert.ok(Array.isArray(body), 'Response should be an array')
      assert.strictEqual(body.length, 3, 'Should return 3 passkeys')

      // Verify each passkey has correct shape
      body.forEach(passkey => {
        assertPasskeyShape(assert, passkey)
      })
    })

    await t.test('only returns passkeys for the authenticated user', async (t) => {
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      if (!user1 || !user2) assert.fail('Could not create users')

      // Create passkeys for both users
      await createTestPasskey(app, user1.userId, { name: 'User 1 Passkey 1' })
      await createTestPasskey(app, user1.userId, { name: 'User 1 Passkey 2' })
      await createTestPasskey(app, user2.userId, { name: 'User 2 Passkey 1' })

      // Get passkeys for user1
      const res1 = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys',
        headers: {
          authorization: `Bearer ${user1.token}`
        }
      })

      assert.strictEqual(res1.statusCode, 200)
      const body1 = JSON.parse(res1.payload)
      assert.strictEqual(body1.length, 2, 'User 1 should have 2 passkeys')
      assert.ok(body1.every((/** @type {any} */ p) => p.name.startsWith('User 1')), 'All passkeys should belong to user 1')

      // Get passkeys for user2
      const res2 = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys',
        headers: {
          authorization: `Bearer ${user2.token}`
        }
      })

      assert.strictEqual(res2.statusCode, 200)
      const body2 = JSON.parse(res2.payload)
      assert.strictEqual(body2.length, 1, 'User 2 should have 1 passkey')
      assert.ok(body2.every((/** @type {any} */ p) => p.name.startsWith('User 2')), 'All passkeys should belong to user 2')
    })

    await t.test('passkeys are ordered by created_at desc', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      // Create passkeys with delays to ensure different timestamps
      await createTestPasskey(app, user.userId, { name: 'First' })
      await new Promise(resolve => setTimeout(resolve, 10))
      await createTestPasskey(app, user.userId, { name: 'Second' })
      await new Promise(resolve => setTimeout(resolve, 10))
      await createTestPasskey(app, user.userId, { name: 'Third' })

      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const body = JSON.parse(res.payload)
      assert.strictEqual(body.length, 3)

      // Should be in reverse order (newest first)
      assert.strictEqual(body[0].name, 'Third', 'Newest passkey should be first')
      assert.strictEqual(body[1].name, 'Second', 'Second newest should be second')
      assert.strictEqual(body[2].name, 'First', 'Oldest passkey should be last')
    })

    await t.test('returns all passkeys up to maximum of 10', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      // Create 10 passkeys
      for (let i = 1; i <= 10; i++) {
        await createTestPasskey(app, user.userId, { name: `Passkey ${i}` })
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 200)
      const body = JSON.parse(res.payload)
      assert.strictEqual(body.length, 10, 'Should return all 10 passkeys')

      // Verify count in database matches
      const count = await getPasskeyCount(app, user.userId)
      assert.strictEqual(count, 10, 'Database should have 10 passkeys')
    })

    await t.test('passkey response includes all expected fields', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const testTransports = ['internal', 'usb']
      const testAaguid = 'test-aaguid-12345'

      await createTestPasskey(app, user.userId, {
        name: 'Test Passkey',
        transports: testTransports,
        aaguid: testAaguid
      })

      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const body = JSON.parse(res.payload)
      const passkey = body[0]

      // Verify structure
      assert.ok(passkey.id, 'Should have id')
      assert.ok(passkey.credential_id, 'Should have credential_id')
      assert.strictEqual(passkey.name, 'Test Passkey', 'Should have correct name')
      assert.ok(passkey.created_at, 'Should have created_at')
      assert.ok('updated_at' in passkey, 'Should have updated_at field')
      assert.ok('last_used' in passkey, 'Should have last_used field')
      assert.deepStrictEqual(passkey.transports, testTransports, 'Should have correct transports')
      assert.strictEqual(passkey.aaguid, testAaguid, 'Should have correct aaguid')
    })

    await t.test('passkey response handles null values correctly', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      await createTestPasskey(app, user.userId, {
        name: 'Test Passkey',
        transports: null,
        aaguid: null
      })

      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const body = JSON.parse(res.payload)
      const passkey = body[0]

      assert.strictEqual(passkey.transports, null, 'Null transports should be preserved')
      assert.strictEqual(passkey.aaguid, null, 'Null aaguid should be preserved')
      assert.strictEqual(passkey.updated_at, null, 'updated_at should be null initially')
      assert.strictEqual(passkey.last_used, null, 'last_used should be null initially')
    })
  })

  await test('list passkeys - error cases', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when not authenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys'
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
    })

    await t.test('returns 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
    })
  })
})
