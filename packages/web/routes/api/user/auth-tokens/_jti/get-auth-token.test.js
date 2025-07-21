import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../../test/helper.js'
import { randomUUID } from 'node:crypto'
import {
  createTestUser,
  createMultipleTokens,
  assertTokenShape
} from '../auth-tokens-test-utils.js'

await suite('get specific auth token', async () => {
  await test('get specific auth token - success cases', async (t) => {
    const app = await build(t)

    await t.test('returns token details when token exists and belongs to user', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // First, list tokens to get a valid JTI
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const tokenJti = listBody.data[0].jti

      // Get the specific token
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/user/auth-tokens/${tokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(getRes.statusCode, 200, 'Should return 200 OK')
      const getBody = JSON.parse(getRes.payload)
      assert.strictEqual(getBody.jti, tokenJti, 'Should return the requested token')
      assertTokenShape(assert, getBody)
    })

    await t.test('correctly identifies current token with is_current: true', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Get current token's JTI
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const currentTokenJti = listBody.data[0].jti

      // Get the current token
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/user/auth-tokens/${currentTokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const getBody = JSON.parse(getRes.payload)
      assert.strictEqual(getBody.is_current, true, 'Current token should have is_current: true')
    })

    await t.test('correctly identifies non-current token with is_current: false', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create additional tokens
      const newTokens = await createMultipleTokens(app, user.username, user.password, 1)
      const newToken = newTokens[0]

      // Get original token's JTI (which is now not current)
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${newToken}` // Use new token to list
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const oldTokenJti = listBody.data.find((/** @type {any} */ t) => !t.is_current)?.jti
      assert.ok(oldTokenJti, 'Should find a non-current token')

      // Get the old token
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/user/auth-tokens/${oldTokenJti}`,
        headers: {
          authorization: `Bearer ${newToken}`
        }
      })

      const getBody = JSON.parse(getRes.payload)
      assert.strictEqual(getBody.is_current, false, 'Non-current token should have is_current: false')
    })

    await t.test('returns all expected fields', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Get current token's JTI
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const tokenJti = listBody.data[0].jti

      // Get the token
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/user/auth-tokens/${tokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const token = JSON.parse(getRes.payload)

      // Check all required fields
      assert.ok(token.jti, 'Should have jti')
      assert.ok(token.created_at, 'Should have created_at')
      assert.ok(token.last_seen, 'Should have last_seen')
      assert.ok(!token.last_seen_micros, 'Should not have last_seen_micros')
      assert.ok(token.updated_at, 'Should have updated_at')
      assert.strictEqual(typeof token.is_current, 'boolean', 'Should have is_current boolean')

      // Check optional fields exist (can be null)
      assert.ok('user_agent' in token, 'Should have user_agent field')
      assert.ok('ip' in token, 'Should have ip field')
    })
  })

  await test('get specific auth token - error cases', async (t) => {
    const app = await build(t)

    await t.test('returns 404 when token does not exist', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const nonExistentJti = randomUUID()
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/user/auth-tokens/${nonExistentJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(getRes.statusCode, 404, 'Should return 404 Not Found')
      const body = JSON.parse(getRes.payload)
      assert.strictEqual(body.message, 'Auth token not found')
    })

    await t.test('returns 404 when token belongs to another user', async (t) => {
      // Create two users
      const user1 = await createTestUser(app, t)
      if (!user1) return // Registration disabled

      const user2 = await createTestUser(app, t)
      if (!user2) return // Registration disabled

      // Get user1's token JTI
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user1.token}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const user1TokenJti = listBody.data[0].jti

      // Try to get user1's token using user2's auth
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/user/auth-tokens/${user1TokenJti}`,
        headers: {
          authorization: `Bearer ${user2.token}`
        }
      })

      assert.strictEqual(getRes.statusCode, 404, 'Should return 404 for another user\'s token')
      const body = JSON.parse(getRes.payload)
      assert.strictEqual(body.message, 'Auth token not found')
    })

    await t.test('returns 400 for invalid UUID format', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const invalidJti = 'not-a-uuid'
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/user/auth-tokens/${invalidJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(getRes.statusCode, 400, 'Should return 400 Bad Request')
    })
  })

  await test('get specific auth token - authentication', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when unauthenticated', async () => {
      const someJti = randomUUID()
      const res = await app.inject({
        method: 'GET',
        url: `/api/user/auth-tokens/${someJti}`
      })

      assert.strictEqual(res.statusCode, 401, 'Should require authentication')
    })

    await t.test('returns 401 with invalid token', async () => {
      const someJti = randomUUID()
      const res = await app.inject({
        method: 'GET',
        url: `/api/user/auth-tokens/${someJti}`,
        headers: {
          authorization: 'Bearer invalid-token'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should reject invalid token')
    })
  })
})
