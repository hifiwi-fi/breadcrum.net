import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../../test/helper.js'
import { randomUUID } from 'node:crypto'
import {
  createTestUser,
  createMultipleTokens
} from '../auth-tokens-test-utils.js'

await suite('delete auth token', async () => {
  await test('delete auth token - success cases', async (t) => {
    const app = await build(t)

    await t.test('successfully deletes non-current token', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create an additional token
      const newTokens = await createMultipleTokens(app, user.username, user.password, 1)
      const newToken = newTokens[0]

      // List tokens to find the non-current one
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${newToken}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const oldToken = listBody.data.find((/** @type {any} */ t) => !t.is_current)
      assert.ok(oldToken, 'Should find a non-current token')

      // Delete the old token
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/user/auth-tokens/${oldToken.jti}`,
        headers: {
          authorization: `Bearer ${newToken}`
        }
      })

      assert.strictEqual(deleteRes.statusCode, 204, 'Should return 204 No Content')
      assert.strictEqual(deleteRes.payload, '', 'Should have empty response body')

      // Verify token is deleted
      const verifyRes = await app.inject({
        method: 'GET',
        url: `/api/user/auth-tokens/${oldToken.jti}`,
        headers: {
          authorization: `Bearer ${newToken}`
        }
      })

      assert.strictEqual(verifyRes.statusCode, 404, 'Deleted token should not be found')
    })

    await t.test('returns 204 No Content on success', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create additional tokens
      const newTokens = await createMultipleTokens(app, user.username, user.password, 1)
      const newToken = newTokens[0]

      // List tokens to find the old one
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${newToken}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const oldToken = listBody.data.find((/** @type {any} */ t) => !t.is_current)

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/user/auth-tokens/${oldToken.jti}`,
        headers: {
          authorization: `Bearer ${newToken}`
        }
      })

      assert.strictEqual(deleteRes.statusCode, 204, 'Should return 204 No Content')
      assert.strictEqual(deleteRes.payload, '', 'Should have empty response body')
    })
  })

  await test('delete auth token - protection cases', async (t) => {
    const app = await build(t)

    await t.test('returns 400 when trying to delete current session', async (t) => {
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

      // Try to delete current session
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/user/auth-tokens/${currentTokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(deleteRes.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(deleteRes.payload)
      assert.strictEqual(body.message, 'Cannot delete the current session token')
    })

    await t.test('provides clear error message for current session protection', async (t) => {
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

      // Try to delete current session
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/user/auth-tokens/${currentTokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const body = JSON.parse(deleteRes.payload)
      assert.ok(body.error, 'Should have error field')
      assert.ok(body.message, 'Should have message field')
      assert.ok(body.statusCode, 'Should have statusCode field')
      assert.strictEqual(body.statusCode, 400)
      assert.strictEqual(body.message, 'Cannot delete the current session token')
    })
  })

  await test('delete auth token - error cases', async (t) => {
    const app = await build(t)

    await t.test('returns 404 when token does not exist', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const nonExistentJti = randomUUID()
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/user/auth-tokens/${nonExistentJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(deleteRes.statusCode, 404, 'Should return 404 Not Found')
      const body = JSON.parse(deleteRes.payload)
      assert.strictEqual(body.message, 'Auth token not found')
    })

    await t.test('returns 404 when trying to delete another user\'s token', async (t) => {
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

      // Try to delete user1's token using user2's auth
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/user/auth-tokens/${user1TokenJti}`,
        headers: {
          authorization: `Bearer ${user2.token}`
        }
      })

      assert.strictEqual(deleteRes.statusCode, 404, 'Should return 404 for another user\'s token')
      const body = JSON.parse(deleteRes.payload)
      assert.strictEqual(body.message, 'Auth token not found')
    })

    await t.test('returns 400 for invalid UUID format', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const invalidJti = 'not-a-uuid'
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/user/auth-tokens/${invalidJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(deleteRes.statusCode, 400, 'Should return 400 Bad Request')
    })
  })

  await test('delete auth token - authentication', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when unauthenticated', async () => {
      const someJti = randomUUID()
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/user/auth-tokens/${someJti}`
      })

      assert.strictEqual(res.statusCode, 401, 'Should require authentication')
    })

    await t.test('returns 401 with invalid token', async () => {
      const someJti = randomUUID()
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/user/auth-tokens/${someJti}`,
        headers: {
          authorization: 'Bearer invalid-token'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should reject invalid token')
    })
  })
})
