import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import SQL from '@nearform/sql'
import { randomUUID } from 'node:crypto'
import { build } from '../../test/helper.js'
import { cleanupStaleAuthTokens } from './cleanup-stale-tokens.js'

/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TestContext } from 'node:test'
 */

/**
 * Helper to create a test user
 * @param {FastifyInstance} app
 * @param {TestContext} t
 * @returns {Promise<string>} userId
 */
async function createTestUser (app, t) {
  const uniqueId = randomUUID().slice(0, 8)
  const query = SQL`
    INSERT INTO users (username, email, password)
    VALUES (${`test_cleanup_${uniqueId}`}, ${`cleanup_${uniqueId}@test.com`}, ${'hashedpassword'})
    RETURNING id
  `
  const result = await app.pg.query(query)
  const userId = result.rows[0].id

  // Setup cleanup
  t.after(async () => {
    await app.pg.query('DELETE FROM users WHERE id = $1', [userId])
  })

  return userId
}

/**
 * Helper to create tokens with specific ages
 * @param {FastifyInstance} app
 * @param {string} userId
 * @param {Array<{daysAgo: number, protect?: boolean}>} specs
 * @returns {Promise<Array<{jti: string, last_seen: Date, protect: boolean}>>}
 */
async function createTokensWithDates (app, userId, specs) {
  const tokens = []

  for (const spec of specs) {
    const protect = spec.protect ?? false

    const query = SQL`
      INSERT INTO auth_tokens (owner_id, last_seen, user_agent, ip, source, protect)
      VALUES (
        ${userId},
        NOW() - INTERVAL '${SQL.unsafe(spec.daysAgo.toString())} days',
        'Test Agent',
        '127.0.0.1',
        'web',
        ${protect}
      )
      RETURNING jti, last_seen, protect
    `

    const result = await app.pg.query(query)
    tokens.push(result.rows[0])
  }

  return tokens
}

/**
 * Helper to count tokens for a user
 * @param {FastifyInstance} app
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function countUserTokens (app, userId) {
  const query = SQL`
    SELECT COUNT(*)::int as count
    FROM auth_tokens
    WHERE owner_id = ${userId}
  `
  const result = await app.pg.query(query)
  return result.rows[0].count
}

describe('cleanup stale auth tokens', () => {
  it('deletes tokens older than default retention period (365 days)', async (t) => {
    const app = await build(t)

    await t.test('deletes tokens older than default retention period (365 days)', async (t) => {
      const userId = await createTestUser(app, t)

      // Create tokens at various ages
      await createTokensWithDates(app, userId, [
        { daysAgo: 400 }, // Should be deleted
        { daysAgo: 366 }, // Should be deleted
        { daysAgo: 100 }, // Should remain
        { daysAgo: 1 }    // Should remain
      ])

      const initialCount = await countUserTokens(app, userId)
      assert.strictEqual(initialCount, 4, 'Should start with 4 tokens')

      const result = await cleanupStaleAuthTokens({
        pg: app.pg,
        logger: app.log
      })

      assert.strictEqual(result.deletedCount, 2, 'Should delete 2 old tokens')

      const finalCount = await countUserTokens(app, userId)
      assert.strictEqual(finalCount, 2, 'Should have 2 tokens remaining')
    })

    await t.test('does NOT delete protected tokens even if old', async (t) => {
      const userId = await createTestUser(app, t)

      // Create old tokens, some protected
      await createTokensWithDates(app, userId, [
        { daysAgo: 400, protect: true },  // Protected, should NOT be deleted
        { daysAgo: 400, protect: false }, // Not protected, should be deleted
        { daysAgo: 366, protect: true },  // Protected, should NOT be deleted
        { daysAgo: 366, protect: false }  // Not protected, should be deleted
      ])

      const result = await cleanupStaleAuthTokens({
        pg: app.pg,
        logger: app.log
      })

      assert.strictEqual(result.deletedCount, 2, 'Should only delete unprotected tokens')

      const finalCount = await countUserTokens(app, userId)
      assert.strictEqual(finalCount, 2, 'Should have 2 protected tokens remaining')

      // Verify the remaining tokens are all protected
      const checkQuery = SQL`
        SELECT protect FROM auth_tokens WHERE owner_id = ${userId}
      `
      const checkResult = await app.pg.query(checkQuery)
      assert.ok(checkResult.rows.every((/** @type {{ protect: boolean }} */ row) => row.protect === true), 'All remaining tokens should be protected')
    })

    await t.test('does NOT delete tokens newer than retention period', async (t) => {
      const userId = await createTestUser(app, t)

      // Create only recent tokens
      await createTokensWithDates(app, userId, [
        { daysAgo: 1 },
        { daysAgo: 30 },
        { daysAgo: 180 },
        { daysAgo: 364 }
      ])

      const result = await cleanupStaleAuthTokens({
        pg: app.pg,
        logger: app.log
      })

      assert.strictEqual(result.deletedCount, 0, 'Should not delete any recent tokens')

      const finalCount = await countUserTokens(app, userId)
      assert.strictEqual(finalCount, 4, 'All tokens should remain')
    })

    await t.test('handles boundary case - token exactly 365 days old', async (t) => {
      const userId = await createTestUser(app, t)

      await createTokensWithDates(app, userId, [
        { daysAgo: 365 } // Exactly at boundary
      ])

      const result = await cleanupStaleAuthTokens({
        pg: app.pg,
        logger: app.log
      })

      // Token at exactly 365 days SHOULD be deleted (query uses <, and 365 days ago is older than NOW() - INTERVAL '365 days')
      assert.strictEqual(result.deletedCount, 1, 'Token exactly 365 days old should be deleted')
    })

    await t.test('handles empty result when no tokens to delete', async (t) => {
      const userId = await createTestUser(app, t)

      // Create only recent tokens
      await createTokensWithDates(app, userId, [
        { daysAgo: 1 },
        { daysAgo: 10 }
      ])

      const result = await cleanupStaleAuthTokens({
        pg: app.pg,
        logger: app.log
      })

      assert.strictEqual(result.deletedCount, 0, 'Should return 0 when no tokens to delete')
      assert.ok(typeof result.deletedCount === 'number', 'deletedCount should be a number')
    })

    await t.test('handles no tokens at all', async (t) => {
      await createTestUser(app, t)

      // Don't create any tokens

      const result = await cleanupStaleAuthTokens({
        pg: app.pg,
        logger: app.log
      })

      assert.strictEqual(result.deletedCount, 0, 'Should handle no tokens gracefully')
    })

    await t.test('works with custom retention period - 30 days', async (t) => {
      const userId = await createTestUser(app, t)

      await createTokensWithDates(app, userId, [
        { daysAgo: 90 },  // Should be deleted
        { daysAgo: 31 },  // Should be deleted
        { daysAgo: 30 },  // Should be deleted (at boundary)
        { daysAgo: 29 },  // Should remain
        { daysAgo: 1 }    // Should remain
      ])

      await cleanupStaleAuthTokens({
        pg: app.pg,
        logger: app.log,
        retentionDays: 30
      })

      // Check that only this user's recent tokens remain (global count not reliable in concurrent tests)
      const finalCount = await countUserTokens(app, userId)
      assert.strictEqual(finalCount, 2, 'Should have 2 tokens remaining for this user')
    })

    await t.test('works with custom retention period - 730 days (2 years)', async (t) => {
      const userId = await createTestUser(app, t)

      await createTokensWithDates(app, userId, [
        { daysAgo: 800 },  // Should be deleted
        { daysAgo: 731 },  // Should be deleted
        { daysAgo: 729 },  // Should remain
        { daysAgo: 365 }   // Should remain
      ])

      const result = await cleanupStaleAuthTokens({
        pg: app.pg,
        logger: app.log,
        retentionDays: 730
      })

      assert.strictEqual(result.deletedCount, 2, 'Should delete tokens older than 730 days')
    })

    await t.test('validates retention period is positive integer', async (_t) => {
      // Test negative number
      await assert.rejects(
        async () => {
          await cleanupStaleAuthTokens({
            pg: app.pg,
            logger: app.log,
            retentionDays: -10
          })
        },
        {
          name: 'TypeError',
          message: 'retentionDays must be a positive integer'
        },
        'Should reject negative retention period'
      )

      // Test zero
      await assert.rejects(
        async () => {
          await cleanupStaleAuthTokens({
            pg: app.pg,
            logger: app.log,
            retentionDays: 0
          })
        },
        {
          name: 'TypeError',
          message: 'retentionDays must be a positive integer'
        },
        'Should reject zero retention period'
      )

      // Test non-integer
      await assert.rejects(
        async () => {
          await cleanupStaleAuthTokens({
            pg: app.pg,
            logger: app.log,
            retentionDays: 30.5
          })
        },
        {
          name: 'TypeError',
          message: 'retentionDays must be a positive integer'
        },
        'Should reject non-integer retention period'
      )
    })

    await t.test('actually deletes from database (verification test)', async (t) => {
      const userId = await createTestUser(app, t)

      const tokens = await createTokensWithDates(app, userId, [
        { daysAgo: 400 },
        { daysAgo: 366 }
      ])

      const jtiToDelete = tokens[0]?.jti
      assert.ok(jtiToDelete, 'Should have token to delete')

      await cleanupStaleAuthTokens({
        pg: app.pg,
        logger: app.log
      })

      // Verify token is actually gone from database
      const checkQuery = SQL`
        SELECT COUNT(*)::int as count
        FROM auth_tokens
        WHERE jti = ${jtiToDelete}
      `
      const checkResult = await app.pg.query(checkQuery)

      assert.strictEqual(checkResult.rows[0].count, 0, 'Deleted token should not exist in database')
    })

    await t.test('handles mixed scenario - old, protected, and recent tokens', async (t) => {
      const userId = await createTestUser(app, t)

      await createTokensWithDates(app, userId, [
        { daysAgo: 500, protect: false }, // Should delete
        { daysAgo: 400, protect: true },  // Should keep (protected)
        { daysAgo: 366, protect: false }, // Should delete
        { daysAgo: 365, protect: false }, // Should delete (at boundary)
        { daysAgo: 200, protect: false }, // Should keep (recent)
        { daysAgo: 100, protect: true },  // Should keep (recent + protected)
        { daysAgo: 1, protect: false }    // Should keep (recent)
      ])

      const initialCount = await countUserTokens(app, userId)
      assert.strictEqual(initialCount, 7, 'Should start with 7 tokens')

      const result = await cleanupStaleAuthTokens({
        pg: app.pg,
        logger: app.log
      })

      assert.strictEqual(result.deletedCount, 3, 'Should delete exactly 3 unprotected old tokens')

      const finalCount = await countUserTokens(app, userId)
      assert.strictEqual(finalCount, 4, 'Should have 4 tokens remaining')
    })

    await t.test('uses fallback for unsupported retention periods', async (t) => {
      const userId = await createTestUser(app, t)

      await createTokensWithDates(app, userId, [
        { daysAgo: 400 }, // Should be deleted with 365 day fallback
        { daysAgo: 100 }  // Should remain
      ])

      // Pass an unsupported value (not in union type) - should fallback to 365
      const result = await cleanupStaleAuthTokens({
        pg: app.pg,
        logger: app.log,
        retentionDays: 500 // Not in union type, will fallback to 365
      })

      assert.strictEqual(result.deletedCount, 1, 'Should use 365 day fallback')

      const finalCount = await countUserTokens(app, userId)
      assert.strictEqual(finalCount, 1, 'Should have 1 token remaining')
    })
  })
})
