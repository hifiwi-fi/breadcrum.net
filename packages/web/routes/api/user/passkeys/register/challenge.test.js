import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../../test/helper.js'
import { createTestUser } from '../../auth-tokens/auth-tokens-test-utils.js'
import { getChallengeCount } from '../challenge-store.js'

await suite('POST /api/user/passkeys/register/challenge', async () => {
  await test('register challenge - success cases', async (t) => {
    const app = await build(t)

    await t.test('generates challenge when authenticated', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const initialCount = await getChallengeCount(app)

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/challenge',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200 OK')

      const body = JSON.parse(res.payload)
      assert.ok(body.challenge, 'Response should contain challenge')
      assert.strictEqual(typeof body.challenge, 'string', 'Challenge should be a string')
      assert.ok(body.challenge.length > 0, 'Challenge should not be empty')

      // Verify challenge was stored in Redis
      const newCount = await getChallengeCount(app)
      assert.strictEqual(newCount, initialCount + 1, 'Challenge should be stored in Redis')

      // Verify challenge is stored with correct data
      const cacheRedis = app.redis['cache']
      if (!cacheRedis) throw new Error('Missing redis cache client')
      const storedData = await cacheRedis.get(`passkey:challenge:${body.challenge}`)
      assert.ok(storedData, 'Challenge data should be in Redis')

      const parsed = JSON.parse(storedData)
      assert.strictEqual(parsed.userId, user.userId, 'Challenge should be associated with user')
      assert.strictEqual(parsed.type, 'register', 'Challenge type should be register')
      assert.ok(parsed.createdAt, 'Challenge should have createdAt timestamp')
    })

    await t.test('generates unique challenges for multiple requests', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const challenges = []

      // Generate 3 challenges
      for (let i = 0; i < 3; i++) {
        /** @type {any} */
        const res = await app.inject({
          method: 'POST',
          url: '/api/user/passkeys/register/challenge',
          headers: {
            authorization: `Bearer ${user.token}`
          }
        })

        assert.strictEqual(res.statusCode, 200)
        const body = JSON.parse(res.payload)
        challenges.push(body.challenge)
      }

      // All challenges should be unique
      const uniqueChallenges = new Set(challenges)
      assert.strictEqual(uniqueChallenges.size, 3, 'All challenges should be unique')
    })

    await t.test('challenge format follows expected pattern', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/challenge',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const body = JSON.parse(res.payload)

      // Challenge should be base64url-like string (alphanumeric, -, _)
      assert.ok(/^[A-Za-z0-9_-]+$/.test(body.challenge), 'Challenge should be base64url format')

      // Challenge should be reasonably long (at least 16 characters for security)
      assert.ok(body.challenge.length >= 16, 'Challenge should be at least 16 characters')
    })

    await t.test('different users get independent challenges', async (t) => {
      const user1 = await createTestUser(app, t)
      const user2 = await createTestUser(app, t)
      if (!user1 || !user2) assert.fail('Could not create users')

      // Generate challenge for user1
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/challenge',
        headers: {
          authorization: `Bearer ${user1.token}`
        }
      })
      const body1 = JSON.parse(res1.payload)

      // Generate challenge for user2
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/challenge',
        headers: {
          authorization: `Bearer ${user2.token}`
        }
      })
      const body2 = JSON.parse(res2.payload)

      // Challenges should be different
      assert.notStrictEqual(body1.challenge, body2.challenge, 'Challenges should be unique per request')

      // Verify both are stored with correct user IDs
      const cacheRedis = app.redis['cache']
      if (!cacheRedis) throw new Error('Missing redis cache client')
      const data1 = JSON.parse(/** @type {string} */ (await cacheRedis.get(`passkey:challenge:${body1.challenge}`)))
      const data2 = JSON.parse(/** @type {string} */ (await cacheRedis.get(`passkey:challenge:${body2.challenge}`)))

      assert.strictEqual(data1.userId, user1.userId, 'Challenge 1 should be for user 1')
      assert.strictEqual(data2.userId, user2.userId, 'Challenge 2 should be for user 2')
    })
  })

  await test('register challenge - error cases', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when not authenticated', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/challenge'
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
    })

    await t.test('returns 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/user/passkeys/register/challenge',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should return 401 Unauthorized')
    })
  })
})
