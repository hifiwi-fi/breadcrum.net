import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../../test/helper.js'
import { getChallengeCount } from '../challenge-store.js'

await suite('Authentication Challenge Endpoints', async () => {
  await test('GET /api/user/passkeys/authenticate/challenge - anonymous challenge for conditional mediation', async (t) => {
    const app = await build(t)
    await t.test('generates challenge without user parameter', async () => {
      const initialCount = await getChallengeCount(app)

      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys/authenticate/challenge'
      })

      assert.strictEqual(res.statusCode, 200, 'Should return 200 OK')

      const body = JSON.parse(res.payload)
      assert.ok(body.challenge, 'Response should contain challenge')
      assert.strictEqual(typeof body.challenge, 'string', 'Challenge should be a string')
      assert.ok(body.challenge.length > 0, 'Challenge should not be empty')
      assert.strictEqual(body.allowCredentials, undefined, 'Should not contain allowCredentials for anonymous challenge')

      // Verify challenge was stored in Redis
      const newCount = await getChallengeCount(app)
      assert.strictEqual(newCount, initialCount + 1, 'Challenge should be stored in Redis')

      // Verify challenge is stored WITHOUT userId (for conditional mediation)
      const cacheRedis = app.redis['cache']
      if (!cacheRedis) throw new Error('Missing redis cache client')
      const storedData = await cacheRedis.get(`passkey:challenge:${body.challenge}`)
      assert.ok(storedData, 'Challenge data should be in Redis')

      const parsed = JSON.parse(storedData)
      assert.strictEqual(parsed.userId, undefined, 'Challenge should NOT have userId for conditional mediation')
      assert.strictEqual(parsed.type, 'authenticate', 'Challenge type should be authenticate')
      assert.ok(parsed.createdAt, 'Challenge should have createdAt timestamp')
    })

    await t.test('challenge format follows expected pattern', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys/authenticate/challenge'
      })

      const body = JSON.parse(res.payload)

      // Challenge should be base64url-like string (alphanumeric, -, _)
      assert.ok(/^[A-Za-z0-9_-]+$/.test(body.challenge), 'Challenge should be base64url format')

      // Challenge should be reasonably long (at least 16 characters for security)
      assert.ok(body.challenge.length >= 16, 'Challenge should be at least 16 characters')
    })

    await t.test('generates unique challenges for multiple requests', async () => {
      const challenges = []

      // Generate 3 challenges
      for (let i = 0; i < 3; i++) {
        const res = await app.inject({
          method: 'GET',
          url: '/api/user/passkeys/authenticate/challenge'
        })

        assert.strictEqual(res.statusCode, 200)
        const body = JSON.parse(res.payload)
        challenges.push(body.challenge)
      }

      // All challenges should be unique
      const uniqueChallenges = new Set(challenges)
      assert.strictEqual(uniqueChallenges.size, 3, 'All challenges should be unique')
    })

    await t.test('works without authentication (public endpoint)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/user/passkeys/authenticate/challenge'
      })

      assert.strictEqual(res.statusCode, 200, 'Should work without authentication')
    })
  })
})
