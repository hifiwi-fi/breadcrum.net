/**
 * @import { FastifyInstance } from 'fastify'
 */

/**
 * @typedef {'register' | 'authenticate'} PasskeyChallengeType
 */

/**
 * @typedef {object} PasskeyChallengeData
 * @property {PasskeyChallengeType} type
 * @property {string} [userId]
 * @property {number} [createdAt]
 */

/**
 * Redis-based challenge storage with automatic TTL expiry
 * Challenges are single-use and expire after 5 minutes
 *
 * Redis keys: `passkey:challenge:{challenge_string}`
 */

const CHALLENGE_PREFIX = 'passkey:challenge:'

/**
 * Store a challenge with associated data and TTL in Redis
 * This is used for both registration and authentication flows.
 * Challenges are single-use and expire after TTL.
 * @param {FastifyInstance} fastify - Fastify instance with Redis
 * @param {string} challenge - The challenge string from server.randomChallenge()
 * @param {PasskeyChallengeData} data - Associated data for the challenge
 * @param {number} [ttlSeconds] - Time to live in seconds (default: from config PASSKEY_CHALLENGE_TIMEOUT / 1000)
 * @returns {Promise<void>}
 */
export async function storeChallenge (fastify, challenge, data, ttlSeconds) {
  // Use config value if ttlSeconds not provided (convert ms to seconds)
  const effectiveTtl = ttlSeconds ?? Math.floor((fastify.config.PASSKEY_CHALLENGE_TIMEOUT || 300000) / 1000)
  const key = `${CHALLENGE_PREFIX}${challenge}`
  const cacheRedis = fastify.redis['cache']
  if (!cacheRedis) throw new Error('Missing redis cache client')

  await cacheRedis.setex(
    key,
    effectiveTtl,
    JSON.stringify(data)
  )
}

/**
 * Verify challenge exists and is valid, then consume it (single-use)
 * @param {FastifyInstance} fastify - Fastify instance with Redis
 * @param {string} challenge - The challenge to verify
 * @param {PasskeyChallengeType} expectedType - Expected challenge type
 * @returns {Promise<PasskeyChallengeData | null>} Challenge data if valid, null if invalid/expired
 */
export async function verifyAndConsumeChallenge (fastify, challenge, expectedType) {
  const key = `${CHALLENGE_PREFIX}${challenge}`
  const cacheRedis = fastify.redis['cache']
  if (!cacheRedis) throw new Error('Missing redis cache client')

  // Get and delete in a pipeline for atomicity
  const pipeline = cacheRedis.pipeline()
  pipeline.get(key)
  pipeline.del(key)
  const results = await pipeline.exec()

  // results is an array of [error, result] pairs
  if (!results || !results[0]) {
    return null
  }

  const [getErr, data] = results[0]

  if (getErr || !data) {
    return null
  }

  let parsed
  try {
    parsed = JSON.parse(/** @type {string} */ (data))
  } catch (err) {
    fastify.log.error({ err, challenge }, 'Failed to parse challenge data from Redis')
    return null
  }

  if (parsed.type !== expectedType) {
    fastify.log.warn({ challenge, expected: expectedType, actual: parsed.type }, 'Challenge type mismatch')
    return null
  }

  return parsed
}

/**
 * Get count of stored challenges (for monitoring/debugging)
 * @param {FastifyInstance} fastify - Fastify instance with Redis
 * @returns {Promise<number>} Number of challenges in Redis
 */
export async function getChallengeCount (fastify) {
  const cacheRedis = fastify.redis['cache']
  if (!cacheRedis) throw new Error('Missing redis cache client')
  const keys = await cacheRedis.keys(`${CHALLENGE_PREFIX}*`)
  return keys.length
}
