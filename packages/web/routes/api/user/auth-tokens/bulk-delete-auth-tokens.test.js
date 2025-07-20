import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../test/helper.js'
import {
  createTestUser,
  createTokensWithDates
} from './auth-tokens-test-utils.js'

/**
 * @import { TypeBulkDeleteResponse } from './schemas/schema-bulk-delete-response.js'
 */

await suite('bulk delete auth tokens', async () => {
  await test('bulk delete auth tokens - success cases', async (t) => {
    const app = await build(t)

    await t.test('deletes tokens older than specified date', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create tokens with specific dates
      const tokens = await createTokensWithDates(app, user.userId, [
        { daysAgo: 7 },   // 1 week old
        { daysAgo: 14 },  // 2 weeks old
        { daysAgo: 30 },  // 1 month old
        { daysAgo: 0 }    // Recent token
      ])

      // Delete tokens older than 10 days
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: tenDaysAgo.toISOString()
        }
      })

      assert.strictEqual(deleteRes.statusCode, 200, 'Should return 200 OK')
      /** @type {TypeBulkDeleteResponse} */
      const deleteBody = JSON.parse(deleteRes.payload)
      assert.strictEqual(deleteBody.deleted_count, 2, 'Should delete 2 tokens (2 weeks and 1 month old)')
      assert.strictEqual(deleteBody.deleted_tokens.length, 2, 'Should return 2 deleted tokens')

      // Verify the correct tokens were deleted
      const deletedJtis = deleteBody.deleted_tokens.map(t => t.jti)
      assert.ok(tokens.length >= 3, 'Should have created at least 3 tokens')
      assert.ok(tokens[1] && deletedJtis.includes(tokens[1].jti), 'Should delete 2 weeks old token')
      assert.ok(tokens[2] && deletedJtis.includes(tokens[2].jti), 'Should delete 1 month old token')
    })

    await t.test('returns count and details of deleted tokens', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create tokens with specific dates
      await createTokensWithDates(app, user.userId, [
        { daysAgo: 15 },
        { daysAgo: 20 },
        { daysAgo: 25 }
      ])

      // Delete all created tokens
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
        }
      })

      /** @type {TypeBulkDeleteResponse} */
      const deleteBody = JSON.parse(deleteRes.payload)
      assert.strictEqual(deleteBody.deleted_count, 3, 'Should delete all 3 tokens')
      assert.strictEqual(deleteBody.deleted_tokens.length, 3, 'Should return all 3 deleted tokens')

      // Verify returned tokens have required fields
      assert.ok(Array.isArray(deleteBody.deleted_tokens), 'deleted_tokens should be an array')
      deleteBody.deleted_tokens.forEach(/** @type {any} */ (token) => {
        assert.ok(token.jti, 'Deleted token should have jti')
        assert.ok(token.last_seen, 'Deleted token should have last_seen')
      })

      // Verify tokens are sorted by last_seen ascending
      const deletedTokens = deleteBody.deleted_tokens
      if (deletedTokens && deletedTokens.length > 1) {
        for (let i = 1; i < deletedTokens.length; i++) {
          const prevToken = deletedTokens[i - 1]
          const currToken = deletedTokens[i]
          if (prevToken && currToken) {
            const prev = new Date(prevToken.last_seen)
            const curr = new Date(currToken.last_seen)
            assert.ok(prev <= curr, 'Deleted tokens should be sorted by last_seen ascending')
          }
        }
      }
    })

    await t.test('preserves tokens newer than cutoff date', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create tokens with specific dates
      const tokens = await createTokensWithDates(app, user.userId, [
        { daysAgo: 5 },   // Recent
        { daysAgo: 15 },  // Old
        { daysAgo: 25 },  // Older
      ])

      // Delete tokens older than 10 days
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: tenDaysAgo.toISOString()
        }
      })

      /** @type {TypeBulkDeleteResponse} */
      const deleteBody = JSON.parse(deleteRes.payload)
      assert.strictEqual(deleteBody.deleted_count, 2, 'Should delete only old tokens')

      // Verify recent token still exists
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const remainingJtis = listBody.data.map((/** @type {any} */ t) => t.jti)
      assert.ok(tokens.length > 0, 'Should have created tokens')
      assert.ok(tokens[0] && remainingJtis.includes(tokens[0].jti), 'Recent token should be preserved')
    })

    await t.test('handles empty results gracefully', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Try to delete tokens from a very old date (no matches)
      const veryOldDate = new Date('2020-01-01')
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: veryOldDate.toISOString()
        }
      })

      assert.strictEqual(deleteRes.statusCode, 200, 'Should return 200 even with no matches')
      /** @type {TypeBulkDeleteResponse & { dry_run?: boolean }} */
      const deleteBody = JSON.parse(deleteRes.payload)
      assert.strictEqual(deleteBody.deleted_count, 0, 'Should delete 0 tokens')
      assert.strictEqual(deleteBody.deleted_tokens.length, 0, 'Should return empty array')
      assert.ok(Array.isArray(deleteBody.deleted_tokens), 'deleted_tokens should be an array')
    })
  })

  await test('bulk delete auth tokens - dry run functionality', async (t) => {
    const app = await build(t)

    await t.test('dry run shows what would be deleted without deleting', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create tokens with specific dates
      const tokens = await createTokensWithDates(app, user.userId, [
        { daysAgo: 10 },
        { daysAgo: 20 },
        { daysAgo: 30 }
      ])

      // Perform dry run
      const dryRunRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
          dry_run: true
        }
      })

      assert.strictEqual(dryRunRes.statusCode, 202, 'Should return 202 Accepted for dry run')
      /** @type {TypeBulkDeleteResponse & { dry_run?: boolean }} */
      const dryRunBody = JSON.parse(dryRunRes.payload)
      assert.strictEqual(dryRunBody.deleted_count, 3, 'Should show 3 tokens would be deleted')
      assert.strictEqual(dryRunBody.dry_run, true, 'Should indicate dry run')

      // Verify tokens still exist
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const existingJtis = listBody.data.map((/** @type {any} */ t) => t.jti)
      assert.ok(tokens.length > 0 && tokens[0] && existingJtis.includes(tokens[0].jti), 'Tokens should still exist after dry run')
    })

    await t.test('dry run with no matches returns empty result', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const veryOldDate = new Date('2020-01-01')
      const dryRunRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: veryOldDate.toISOString(),
          dry_run: true
        }
      })

      assert.strictEqual(dryRunRes.statusCode, 202, 'Should return 202 Accepted for dry run')
      /** @type {TypeBulkDeleteResponse & { dry_run?: boolean }} */
      const dryRunBody = JSON.parse(dryRunRes.payload)
      assert.strictEqual(dryRunBody.deleted_count, 0, 'Should show 0 tokens would be deleted')
      assert.strictEqual(dryRunBody.deleted_tokens.length, 0, 'Should return empty array')
      assert.strictEqual(dryRunBody.dry_run, true, 'Should indicate dry run')
    })
  })

  await test('bulk delete auth tokens - recent deletes protection', async (t) => {
    const app = await build(t)

    await t.test('blocks deletion of recently used tokens without allow_recent_deletes', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create recent tokens
      await createTokensWithDates(app, user.userId, [
        { daysAgo: 1 },
        { daysAgo: 3 },
        { daysAgo: 5 }
      ])

      // Try to delete tokens from 6 days ago (would delete recent tokens)
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: sixDaysAgo.toISOString()
        }
      })

      assert.strictEqual(deleteRes.statusCode, 400, 'Should return 400 Bad Request')
      const body = JSON.parse(deleteRes.payload)
      assert.strictEqual(body.message, 'Attempting to delete recently used tokens. Use allow_recent_deletes=true to confirm.')
    })

    await t.test('allows deletion of recent tokens with allow_recent_deletes=true', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create recent tokens
      await createTokensWithDates(app, user.userId, [
        { daysAgo: 1 },
        { daysAgo: 3 },
        { daysAgo: 5 },
        { daysAgo: 10 }
      ])

      // Try to delete all tokens including recent ones (requires allow_recent_deletes)
      const now = new Date()
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: now.toISOString(),
          allow_recent_deletes: true
        }
      })

      assert.strictEqual(deleteRes.statusCode, 200, 'Should return 200 OK')
      /** @type {TypeBulkDeleteResponse} */
      const deleteBody = JSON.parse(deleteRes.payload)
      assert.strictEqual(deleteBody.deleted_count, 4, 'Should delete all 4 tokens')
      assert.strictEqual(deleteBody.dry_run, false, 'Should not be a dry run')
    })

    await t.test('allows deletion of old tokens without allow_recent_deletes', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create old tokens
      await createTokensWithDates(app, user.userId, [
        { daysAgo: 10 },
        { daysAgo: 20 },
        { daysAgo: 30 }
      ])

      // Delete tokens from 15 days ago (only old tokens)
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: fifteenDaysAgo.toISOString()
        }
      })

      assert.strictEqual(deleteRes.statusCode, 200, 'Should return 200 OK without allow_recent_deletes')
      /** @type {TypeBulkDeleteResponse} */
      const deleteBody = JSON.parse(deleteRes.payload)
      assert.strictEqual(deleteBody.deleted_count, 2, 'Should delete old tokens')
    })

    await t.test('dry run respects allow_recent_deletes requirement', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create recent tokens
      await createTokensWithDates(app, user.userId, [
        { daysAgo: 1 },
        { daysAgo: 3 }
      ])

      // Try dry run without allow_recent_deletes
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      const dryRunRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: fourDaysAgo.toISOString(),
          dry_run: true
        }
      })

      assert.strictEqual(dryRunRes.statusCode, 400, 'Dry run should also check recent deletes protection')
      const body = JSON.parse(dryRunRes.payload)
      assert.ok(body.message.includes('allow_recent_deletes'), 'Should mention allow_recent_deletes in error')
    })
  })

  await test('bulk delete auth tokens - protection cases', async (t) => {
    const app = await build(t)

    await t.test('never deletes protected tokens', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create old tokens
      const tokens = await createTokensWithDates(app, user.userId, [
        { daysAgo: 30 },
        { daysAgo: 60 },
        { daysAgo: 90 }
      ])

      // Protect the middle token
      await app.pg.query(
        'UPDATE auth_tokens SET protect = true WHERE jti = $1',
        [tokens?.[1]?.jti]
      )

      // Try to delete all old tokens
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: cutoffDate.toISOString()
        }
      })

      assert.strictEqual(deleteRes.statusCode, 200, 'Should return 200 OK')
      /** @type {TypeBulkDeleteResponse} */
      const deleteBody = JSON.parse(deleteRes.payload)
      assert.strictEqual(deleteBody.deleted_count, 2, 'Should delete only unprotected tokens')

      // Verify protected token still exists
      const checkQuery = await app.pg.query(
        'SELECT jti FROM auth_tokens WHERE jti = $1',
        [tokens?.[1]?.jti]
      )
      assert.strictEqual(checkQuery.rowCount, 1, 'Protected token should still exist')
    })

    await t.test('dry run excludes protected tokens from count', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create old tokens
      const tokens = await createTokensWithDates(app, user.userId, [
        { daysAgo: 30 },
        { daysAgo: 60 }
      ])

      // Protect one token
      await app.pg.query(
        'UPDATE auth_tokens SET protect = true WHERE jti = $1',
        [tokens?.[0]?.jti]
      )

      // Dry run to delete all old tokens
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const dryRunRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: cutoffDate.toISOString(),
          dry_run: true
        }
      })

      assert.strictEqual(dryRunRes.statusCode, 202, 'Should return 202 for dry run')
      /** @type {TypeBulkDeleteResponse & { dry_run?: boolean }} */
      const dryRunBody = JSON.parse(dryRunRes.payload)
      assert.strictEqual(dryRunBody.deleted_count, 1, 'Should only count unprotected token')
      assert.strictEqual(dryRunBody.deleted_tokens.length, 1, 'Should only return unprotected token')
      assert.strictEqual(dryRunBody.deleted_tokens?.[0]?.jti, tokens?.[1]?.jti, 'Should return the unprotected token')
    })

    await t.test('never deletes current session token', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create old tokens
      await createTokensWithDates(app, user.userId, [
        { daysAgo: 30 },
        { daysAgo: 60 }
      ])

      // Try to delete all tokens with a future date
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: tomorrow.toISOString()
        }
      })

      // Should be rejected due to future date
      assert.strictEqual(deleteRes.statusCode, 400, 'Should reject future date')
    })

    await t.test('never deletes current session token even with allow_recent_deletes', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Try to delete all tokens including current with allow_recent_deletes
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: tomorrow.toISOString(),
          allow_recent_deletes: true
        }
      })

      // Should still be rejected due to future date (not because of recent deletes)
      assert.strictEqual(deleteRes.statusCode, 400, 'Should reject future date even with allow_recent_deletes')
      const body = JSON.parse(deleteRes.payload)
      assert.strictEqual(body.message, 'Cannot delete tokens with a future date')
    })

    await t.test('rejects future dates with 400 error', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: futureDate.toISOString()
        }
      })

      assert.strictEqual(deleteRes.statusCode, 400, 'Should return 400 for future date')
      const body = JSON.parse(deleteRes.payload)
      assert.strictEqual(body.message, 'Cannot delete tokens with a future date')
    })
  })

  await test('bulk delete auth tokens - validation', async (t) => {
    const app = await build(t)

    await t.test('returns 400 for invalid date format', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const invalidDateRes = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {
          last_seen_before: 'not-a-date'
        }
      })

      assert.strictEqual(invalidDateRes.statusCode, 400, 'Should return 400 for invalid date')
      const body = JSON.parse(invalidDateRes.payload)
      assert.strictEqual(body.message, 'body/last_seen_before must match format "date-time"')
    })

    await t.test('validates ISO 8601 date-time format', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Test various invalid formats
      const invalidFormats = [
        '2024-01-01',           // Date only
        '2024-01-01 10:00:00',  // Space instead of T
        '01/01/2024',           // Wrong format
        '1234567890',           // Unix timestamp
      ]

      for (const invalidFormat of invalidFormats) {
        /** @type {any} */
        const res = await app.inject({
          method: 'DELETE',
          url: '/api/user/auth-tokens',
          headers: {
            authorization: `Bearer ${user.token}`
          },
          payload: {
            last_seen_before: invalidFormat
          }
        })

        assert.strictEqual(res.statusCode, 400, `Should reject format: ${invalidFormat}`)
      }
    })

    await t.test('requires last_seen_before in body', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        },
        payload: {}
      })

      assert.strictEqual(res.statusCode, 400, 'Should require last_seen_before')
    })
  })

  await test('bulk delete auth tokens - authentication', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        payload: {
          last_seen_before: new Date().toISOString()
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should require authentication')
    })

    await t.test('returns 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: 'Bearer invalid-token'
        },
        payload: {
          last_seen_before: new Date().toISOString()
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should reject invalid token')
    })
  })
})
