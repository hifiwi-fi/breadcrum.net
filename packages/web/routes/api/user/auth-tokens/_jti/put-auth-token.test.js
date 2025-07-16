import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../../test/helper.js'
import { randomUUID } from 'node:crypto'
import {
  createTestUser,
  createMultipleTokens
} from '../auth-tokens-test-utils.js'

await suite('update auth token', async () => {
  await test('update auth token - success cases', async (t) => {
    const app = await build(t)

    await t.test('successfully updates token note', async (t) => {
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

      // Update the note
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${tokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'My work laptop'
        }
      })

      assert.strictEqual(updateRes.statusCode, 200, 'Should return 200 OK')
      const updateBody = JSON.parse(updateRes.payload)
      assert.strictEqual(updateBody.note, 'My work laptop', 'Note should be updated')
      assert.strictEqual(updateBody.jti, tokenJti, 'Should return the same token')

      // Verify updated_at changed
      assert.ok(updateBody.updated_at, 'Should have updated_at')
      assert.ok(new Date(updateBody.updated_at) > new Date(updateBody.created_at), 'updated_at should be after created_at')
    })

    await t.test('can set note to null', async (t) => {
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

      // First set a note
      await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${tokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'Initial note'
        }
      })

      // Then set it to null
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${tokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: null
        }
      })

      assert.strictEqual(updateRes.statusCode, 200, 'Should return 200 OK')
      const updateBody = JSON.parse(updateRes.payload)
      assert.strictEqual(updateBody.note, null, 'Note should be null')
    })

    await t.test('returns all token fields after update', async (t) => {
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

      // Update the note
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${tokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'Updated note'
        }
      })

      const token = JSON.parse(updateRes.payload)

      // Check all required fields are present
      assert.ok(token.jti, 'Should have jti')
      assert.ok(token.created_at, 'Should have created_at')
      assert.ok(token.last_seen, 'Should have last_seen')
      assert.ok(token.last_seen_micros, 'Should have last_seen_micros')
      assert.ok(token.updated_at, 'Should have updated_at')
      assert.strictEqual(typeof token.is_current, 'boolean', 'Should have is_current boolean')
      assert.ok('user_agent' in token, 'Should have user_agent field')
      assert.ok('ip' in token, 'Should have ip field')
      assert.ok('note' in token, 'Should have note field')
    })

    await t.test('can update non-current token', async (t) => {
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

      // Update the old token's note
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${oldToken.jti}`,
        headers: {
          authorization: `Bearer ${newToken}`
        },
        payload: {
          note: 'Old session'
        }
      })

      assert.strictEqual(updateRes.statusCode, 200, 'Should return 200 OK')
      const updateBody = JSON.parse(updateRes.payload)
      assert.strictEqual(updateBody.note, 'Old session', 'Note should be updated')
      assert.strictEqual(updateBody.is_current, false, 'Should still be non-current')
    })

    await t.test('updated_at timestamp changes on update', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Get current token's JTI and original updated_at
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const token = listBody.data[0]
      const originalUpdatedAt = token.updated_at

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      // Update the note
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${token.jti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'Testing timestamp update'
        }
      })

      assert.strictEqual(updateRes.statusCode, 200, 'Should return 200 OK')
      const updateBody = JSON.parse(updateRes.payload)

      // Verify updated_at changed
      assert.notStrictEqual(updateBody.updated_at, originalUpdatedAt, 'updated_at should change after update')
      assert.ok(new Date(updateBody.updated_at) > new Date(originalUpdatedAt), 'New updated_at should be later')
    })
  })

  await test('update auth token - validation', async (t) => {
    const app = await build(t)

    await t.test('rejects note exceeding 255 characters', async (t) => {
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

      // Try to update with too long note
      const longNote = 'a'.repeat(256)
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${tokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: longNote
        }
      })

      assert.strictEqual(updateRes.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(updateRes.payload)
      assert.ok(body.message.includes('must NOT have more than 255 characters'), 'Should mention character limit validation')
    })

    await t.test('accepts note with exactly 255 characters', async (t) => {
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

      // Update with max length note
      const maxLengthNote = 'a'.repeat(255)
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${tokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: maxLengthNote
        }
      })

      assert.strictEqual(updateRes.statusCode, 200, 'Should accept 255 character note')
      const updateBody = JSON.parse(updateRes.payload)
      assert.strictEqual(updateBody.note, maxLengthNote, 'Note should be updated')
    })

    await t.test('rejects request without note field', async (t) => {
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

      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${tokenJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {}
      })

      assert.strictEqual(updateRes.statusCode, 400, 'Should require note field')
    })

    await t.test('returns 400 for invalid UUID format', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const invalidJti = 'not-a-uuid'
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${invalidJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'Test note'
        }
      })

      assert.strictEqual(updateRes.statusCode, 400, 'Should return 400 Bad Request')
    })
  })

  await test('update auth token - error cases', async (t) => {
    const app = await build(t)

    await t.test('returns 404 when token does not exist', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const nonExistentJti = randomUUID()
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${nonExistentJti}`,
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          note: 'Test note'
        }
      })

      assert.strictEqual(updateRes.statusCode, 404, 'Should return 404 Not Found')
      const body = JSON.parse(updateRes.payload)
      assert.strictEqual(body.message, 'Auth token not found')
    })

    await t.test('returns 404 when trying to update another user\'s token', async (t) => {
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

      // Try to update user1's token using user2's auth
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${user1TokenJti}`,
        headers: {
          authorization: `Bearer ${user2.token}`
        },
        payload: {
          note: 'Should not work'
        }
      })

      assert.strictEqual(updateRes.statusCode, 404, 'Should return 404 for another user\'s token')
      const body = JSON.parse(updateRes.payload)
      assert.strictEqual(body.message, 'Auth token not found')
    })
  })

  await test('update auth token - authentication', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when unauthenticated', async () => {
      const someJti = randomUUID()
      const res = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${someJti}`,
        payload: {
          note: 'Test note'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should require authentication')
    })

    await t.test('returns 401 with invalid token', async () => {
      const someJti = randomUUID()
      const res = await app.inject({
        method: 'PUT',
        url: `/api/user/auth-tokens/${someJti}`,
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
