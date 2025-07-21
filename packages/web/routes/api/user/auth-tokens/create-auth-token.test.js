import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../test/helper.js'
import {
  createTestUser,
  assertTokenShape
} from './auth-tokens-test-utils.js'

await suite('create auth token', async () => {
  await test('create auth token - success cases', async (t) => {
    const app = await build(t)

    await t.test('successfully creates a new auth token with note and protect', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'My work laptop',
          protect: true
        }
      })

      assert.strictEqual(createRes.statusCode, 201, 'Should return 201 Created')
      const createBody = JSON.parse(createRes.payload)

      // Check response structure
      assert.ok(createBody.token, 'Should return JWT token')
      assert.ok(createBody.auth_token, 'Should return auth token details')
      assert.strictEqual(typeof createBody.token, 'string', 'Token should be a string')

      // Check auth token details
      const authToken = createBody.auth_token
      assertTokenShape(assert, authToken, { checkCurrent: false })
      assert.strictEqual(authToken.note, 'My work laptop', 'Should have correct note')
      assert.strictEqual(authToken.protect, true, 'Should have correct protect status')
      assert.strictEqual(authToken.is_current, false, 'New token should not be current')
    })

    await t.test('successfully creates a new auth token with minimal payload', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {}
      })

      assert.strictEqual(createRes.statusCode, 201, 'Should return 201 Created')
      const createBody = JSON.parse(createRes.payload)

      // Check response structure
      assert.ok(createBody.token, 'Should return JWT token')
      assert.ok(createBody.auth_token, 'Should return auth token details')

      // Check auth token details
      const authToken = createBody.auth_token
      assertTokenShape(assert, authToken, { checkCurrent: false })
      assert.strictEqual(authToken.note, null, 'Should have null note when not provided')
      assert.strictEqual(authToken.protect, false, 'Should have false protect when not provided')
      assert.strictEqual(authToken.is_current, false, 'New token should not be current')
    })

    await t.test('successfully creates a new auth token with only note', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'Personal device'
        }
      })

      assert.strictEqual(createRes.statusCode, 201, 'Should return 201 Created')
      const createBody = JSON.parse(createRes.payload)

      const authToken = createBody.auth_token
      assert.strictEqual(authToken.note, 'Personal device', 'Should have correct note')
      assert.strictEqual(authToken.protect, false, 'Should default protect to false')
    })

    await t.test('successfully creates a new auth token with only protect', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          protect: true
        }
      })

      assert.strictEqual(createRes.statusCode, 201, 'Should return 201 Created')
      const createBody = JSON.parse(createRes.payload)

      const authToken = createBody.auth_token
      assert.strictEqual(authToken.note, null, 'Should have null note when not provided')
      assert.strictEqual(authToken.protect, true, 'Should have correct protect status')
    })

    await t.test('created token appears in token list', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create a new token
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'New session'
        }
      })

      const createBody = JSON.parse(createRes.payload)
      const newTokenJti = createBody.auth_token.jti

      // List tokens to verify it appears
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const newTokenInList = listBody.data.find((/** @type {any} */ t) => t.jti === newTokenJti)

      assert.ok(newTokenInList, 'New token should appear in token list')
      assert.strictEqual(newTokenInList.note, 'New session', 'Token should have correct note in list')
      assert.strictEqual(newTokenInList.is_current, false, 'New token should not be current in list')
    })

    await t.test('created token works for authentication', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create a new token
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'Test token'
        }
      })

      const createBody = JSON.parse(createRes.payload)
      const newToken = createBody.token

      // Use the new token to make an authenticated request
      const authRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${newToken}`
        }
      })

      assert.strictEqual(authRes.statusCode, 200, 'New token should work for authentication')

      // Verify that when using the new token, it's marked as current
      const authBody = JSON.parse(authRes.payload)
      const currentToken = authBody.data.find((/** @type {any} */ t) => t.is_current)
      assert.ok(currentToken, 'Should find current token')
      assert.strictEqual(currentToken.note, 'Test token', 'Current token should be the newly created one')
    })

    await t.test('returns all expected fields in auth_token', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'Field test',
          protect: true
        }
      })

      const createBody = JSON.parse(createRes.payload)
      const authToken = createBody.auth_token

      // Check all required fields are present
      assert.ok(authToken.jti, 'Should have jti')
      assert.ok(authToken.created_at, 'Should have created_at')
      assert.ok(authToken.last_seen, 'Should have last_seen')
      assert.ok(!authToken.last_seen_micros, 'Should not have last_seen_micros')
      assert.ok(authToken.updated_at, 'Should have updated_at')
      assert.strictEqual(typeof authToken.is_current, 'boolean', 'Should have is_current boolean')
      assert.strictEqual(typeof authToken.protect, 'boolean', 'Should have protect boolean')
      assert.ok('user_agent' in authToken, 'Should have user_agent field')
      assert.ok('ip' in authToken, 'Should have ip field')
      assert.ok('note' in authToken, 'Should have note field')

      // Check timestamps are reasonable
      const now = new Date()
      const createdAt = new Date(authToken.created_at)
      const lastSeen = new Date(authToken.last_seen)
      const updatedAt = new Date(authToken.updated_at)

      assert.ok(createdAt <= now, 'created_at should not be in the future')
      assert.ok(lastSeen <= now, 'last_seen should not be in the future')
      assert.ok(updatedAt <= now, 'updated_at should not be in the future')
      assert.ok(Math.abs(createdAt.getTime() - now.getTime()) < 5000, 'created_at should be recent')
    })
  })

  await test('create auth token - validation', async (t) => {
    const app = await build(t)

    await t.test('rejects note exceeding 255 characters', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const longNote = 'a'.repeat(256)
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: longNote
        }
      })

      assert.strictEqual(createRes.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(createRes.payload)
      assert.ok(body.message.includes('must NOT have more than 255 characters'), 'Should mention character limit validation')
    })

    await t.test('accepts note with exactly 255 characters', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const maxLengthNote = 'a'.repeat(255)
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: maxLengthNote
        }
      })

      assert.strictEqual(createRes.statusCode, 201, 'Should accept 255 character note')
      const createBody = JSON.parse(createRes.payload)
      assert.strictEqual(createBody.auth_token.note, maxLengthNote, 'Note should be preserved')
    })

    await t.test('accepts null note', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: null
        }
      })

      assert.strictEqual(createRes.statusCode, 201, 'Should accept null note')
      const createBody = JSON.parse(createRes.payload)
      assert.strictEqual(createBody.auth_token.note, null, 'Note should be null')
    })

    await t.test('accepts non-boolean protect value that is truthy', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          protect: 'true' // String that is truthy
        }
      })

      assert.strictEqual(createRes.statusCode, 201, 'Should accept truthy string for protect')
      const body = JSON.parse(createRes.payload)
      assert.strictEqual(body.auth_token.protect, true, 'Should coerce to true')
    })

    await t.test('ignores additional properties', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'Test',
          invalid_field: 'should be ignored'
        }
      })

      assert.strictEqual(createRes.statusCode, 201, 'Should ignore additional properties')
      const body = JSON.parse(createRes.payload)
      assert.strictEqual(body.auth_token.note, 'Test', 'Should preserve valid fields')
    })
  })

  await test('create auth token - security', async (t) => {
    const app = await build(t)

    await t.test('each created token has unique jti', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create multiple tokens
      const token1Res = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: { note: 'Token 1' }
      })

      const token2Res = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: { note: 'Token 2' }
      })

      const token1Body = JSON.parse(token1Res.payload)
      const token2Body = JSON.parse(token2Res.payload)

      assert.notStrictEqual(token1Body.auth_token.jti, token2Body.auth_token.jti, 'JTIs should be unique')
      assert.notStrictEqual(token1Body.token, token2Body.token, 'JWT tokens should be unique')
    })

    await t.test('tokens are associated with correct user', async (t) => {
      // Create two different users
      const user1 = await createTestUser(app, t)
      if (!user1) return // Registration disabled

      const user2 = await createTestUser(app, t)
      if (!user2) return // Registration disabled

      // Create tokens for each user
      const token1Res = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user1.token}`
        },
        payload: { note: 'User 1 token' }
      })

      const token2Res = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user2.token}`
        },
        payload: { note: 'User 2 token' }
      })

      const token1Body = JSON.parse(token1Res.payload)
      const token2Body = JSON.parse(token2Res.payload)

      // Verify user1 cannot see user2's token
      const user1ListRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user1.token}`
        }
      })

      const user1ListBody = JSON.parse(user1ListRes.payload)
      const user1TokenJtis = user1ListBody.data.map((/** @type {any} */ t) => t.jti)

      assert.ok(!user1TokenJtis.includes(token2Body.auth_token.jti), 'User 1 should not see user 2\'s token')
      assert.ok(user1TokenJtis.includes(token1Body.auth_token.jti), 'User 1 should see their own token')
    })
  })

  await test('create auth token - authentication', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        payload: {
          note: 'Test note'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should require authentication')
    })

    await t.test('returns 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: 'Bearer invalid-token'
        },
        payload: {
          note: 'Test note'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should reject invalid token')
    })
  })
})
