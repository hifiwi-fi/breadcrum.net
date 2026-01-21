import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../test/helper.js'
import { storeChallenge, verifyAndConsumeChallenge, getChallengeCount } from './challenge-store.js'

await suite('challenge store', async () => {
  await test('stores and retrieves challenge', async (t) => {
    const app = await build(t)

    const challenge = 'test_challenge_123'
    /** @type {import('./challenge-store.js').PasskeyChallengeData} */
    const data = {
      userId: 'user-123',
      type: 'register',
      createdAt: Date.now(),
    }

    // Store challenge
    await storeChallenge(app, challenge, data)

    // Verify it can be retrieved
    const retrieved = await verifyAndConsumeChallenge(app, challenge, 'register')

    assert.ok(retrieved, 'Challenge should be retrieved')
    const typedRetrieved = /** @type {any} */ (retrieved)
    assert.strictEqual(typedRetrieved.userId, data.userId, 'User ID should match')
    assert.strictEqual(typedRetrieved.type, data.type, 'Type should match')
    assert.strictEqual(typedRetrieved.createdAt, data.createdAt, 'Created at should match')
  })

  await test('challenge is single-use (consumed after verification)', async (t) => {
    const app = await build(t)

    const challenge = 'test_challenge_single_use'
    /** @type {import('./challenge-store.js').PasskeyChallengeData} */
    const data = {
      userId: 'user-456',
      type: 'authenticate',
      createdAt: Date.now(),
    }

    // Store challenge
    await storeChallenge(app, challenge, data)

    // First retrieval should work
    const first = await verifyAndConsumeChallenge(app, challenge, 'authenticate')
    assert.ok(first, 'First retrieval should succeed')

    // Second retrieval should fail (single-use)
    const second = await verifyAndConsumeChallenge(app, challenge, 'authenticate')
    assert.strictEqual(second, null, 'Second retrieval should return null')
  })

  await test('rejects challenge with wrong type', async (t) => {
    const app = await build(t)

    const challenge = 'test_challenge_type_mismatch'
    /** @type {import('./challenge-store.js').PasskeyChallengeData} */
    const data = {
      userId: 'user-789',
      type: 'register',
      createdAt: Date.now(),
    }

    // Store as register type
    await storeChallenge(app, challenge, data)

    // Try to verify as authenticate type
    const result = await verifyAndConsumeChallenge(app, challenge, 'authenticate')
    assert.strictEqual(result, null, 'Should return null for type mismatch')

    // Challenge should still be consumed (deleted) even on type mismatch
    const secondAttempt = await verifyAndConsumeChallenge(app, challenge, 'register')
    assert.strictEqual(secondAttempt, null, 'Challenge should be consumed after type mismatch')
  })

  await test('returns null for non-existent challenge', async (t) => {
    const app = await build(t)

    const result = await verifyAndConsumeChallenge(app, 'non_existent_challenge', 'register')
    assert.strictEqual(result, null, 'Should return null for non-existent challenge')
  })

  await test('handles malformed JSON in Redis', async (t) => {
    const app = await build(t)

    const challenge = 'test_challenge_malformed'

    // Manually store malformed JSON in Redis
    const cacheRedis = app.redis['cache']
    if (!cacheRedis) throw new Error('Missing redis cache client')
    await cacheRedis.setex('passkey:challenge:' + challenge, 300, 'not valid json {')

    const result = await verifyAndConsumeChallenge(app, challenge, 'register')
    assert.strictEqual(result, null, 'Should return null for malformed JSON')
  })

  await test('getChallengeCount returns correct count', async (t) => {
    const app = await build(t)

    // Get initial count
    const initialCount = await getChallengeCount(app)

    // Store some challenges
    await storeChallenge(app, 'challenge_1', /** @type {import('./challenge-store.js').PasskeyChallengeData} */ ({ type: 'register', userId: 'user-1' }))
    await storeChallenge(app, 'challenge_2', /** @type {import('./challenge-store.js').PasskeyChallengeData} */ ({ type: 'authenticate', userId: 'user-2' }))
    await storeChallenge(app, 'challenge_3', /** @type {import('./challenge-store.js').PasskeyChallengeData} */ ({ type: 'register', userId: 'user-3' }))

    // Check count increased
    const newCount = await getChallengeCount(app)
    assert.strictEqual(newCount, initialCount + 3, 'Count should increase by 3')

    // Consume one challenge
    await verifyAndConsumeChallenge(app, 'challenge_1', 'register')

    // Check count decreased
    const afterConsume = await getChallengeCount(app)
    assert.strictEqual(afterConsume, initialCount + 2, 'Count should decrease by 1')

    // Cleanup remaining challenges
    await verifyAndConsumeChallenge(app, 'challenge_2', 'authenticate')
    await verifyAndConsumeChallenge(app, 'challenge_3', 'register')
  })

  await test('custom TTL is respected', async (t) => {
    const app = await build(t)

    const challenge = 'test_challenge_ttl'
    /** @type {import('./challenge-store.js').PasskeyChallengeData} */
    const data = { userId: 'user-ttl', type: 'register' }

    const cacheRedis = app.redis['cache']
    if (!cacheRedis) throw new Error('Missing redis cache client')

    // Store with 1 second TTL
    await storeChallenge(app, challenge, data, 1)

    // Should be available immediately
    const immediate = await cacheRedis.get('passkey:challenge:' + challenge)
    assert.ok(immediate, 'Challenge should be available immediately')

    // Wait 1.5 seconds for expiry
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Should be expired
    const expired = await cacheRedis.get('passkey:challenge:' + challenge)
    assert.strictEqual(expired, null, 'Challenge should be expired after TTL')
  })

  await test('multiple challenges can coexist', async (t) => {
    const app = await build(t)

    /** @type {{ challenge: string, data: import('./challenge-store.js').PasskeyChallengeData }[]} */
    const challenges = [
      { challenge: 'multi_1', data: { userId: 'user-1', type: 'register' } },
      { challenge: 'multi_2', data: { userId: 'user-2', type: 'authenticate' } },
      { challenge: 'multi_3', data: { userId: 'user-1', type: 'authenticate' } },
    ]

    // Store all challenges
    for (const item of challenges) {
      await storeChallenge(app, item.challenge, item.data)
    }

    // Verify each can be retrieved with correct data
    for (const item of challenges) {
      const retrieved = await verifyAndConsumeChallenge(app, item.challenge, item.data.type)
      assert.ok(retrieved, `Challenge ${item.challenge} should be retrieved`)
      const typedRetrieved = /** @type {any} */ (retrieved)
      assert.strictEqual(typedRetrieved.userId, item.data.userId, 'User ID should match')
    }
  })
})
