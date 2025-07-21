import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../test/helper.js'
import {
  createTestUser,
  createMultipleTokens,
  assertTokenShape,
  assertPaginationShape
} from './auth-tokens-test-utils.js'

await suite('list auth tokens', async () => {
  await test('list auth tokens - basic functionality', async (t) => {
    const app = await build(t)

    await t.test('returns paginated list of tokens', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) assert.fail('Could not create a user')

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(listRes.statusCode, 200, 'Should return 200 OK')
      const listBody = JSON.parse(listRes.payload)

      assert.ok(listBody.data, 'Should have data array')
      assert.ok(Array.isArray(listBody.data), 'Data should be an array')
      assert.strictEqual(listBody.data.length, 1, 'Should have exactly one token')

      assert.ok(listBody.pagination, 'Should have pagination metadata')
      assertPaginationShape(assert, listBody.pagination)
    })

    await t.test('marks current token with is_current: true', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const currentToken = listBody.data[0]

      assertTokenShape(assert, currentToken, { checkCurrent: true })
    })

    await t.test('returns proper token fields', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const listBody = JSON.parse(listRes.payload)
      const token = listBody.data[0]

      assertTokenShape(assert, token)

      // Check date formats
      assert.ok(new Date(token.created_at).getTime() > 0, 'created_at should be valid date')
      assert.ok(new Date(token.last_seen).getTime() > 0, 'last_seen should be valid date')
      assert.ok(!('last_seen_micros' in token), 'last_seen_micros should not be anything')
    })
  })

  await test('list auth tokens - pagination', async (t) => {
    const app = await build(t)

    await t.test('handles before cursor correctly', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create multiple tokens
      await createMultipleTokens(app, user.username, user.password, 5)

      // Get first page
      const page1Res = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens?per_page=3&sort=desc',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(page1Res.statusCode, 200)
      const page1Body = JSON.parse(page1Res.payload)
      assert.strictEqual(page1Body.data.length, 3, 'Should return requested page size')
      assert.strictEqual(page1Body.pagination.top, true, 'Should be at top of results')
      assert.strictEqual(page1Body.pagination.bottom, false, 'Should not be at bottom')
      assert.ok(page1Body.pagination.before, 'Should have cursor for next page')

      // Get second page using before cursor
      const page2Res = await app.inject({
        method: 'GET',
        url: `/api/user/auth-tokens?per_page=3&sort=desc&before=${page1Body.pagination.before}`,
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(page2Res.statusCode, 200)
      const page2Body = JSON.parse(page2Res.payload)
      assert.ok(page2Body.data.length > 0, 'Should have results on next page')
      assert.strictEqual(page2Body.pagination.top, false, 'Should not be at top')
      assert.ok(page2Body.pagination.after, 'Should have cursor for previous page')

      // Verify no overlap between pages
      const page1Jtis = page1Body.data.map((/** @type {any} */ t) => t.jti)
      const page2Jtis = page2Body.data.map((/** @type {any} */ t) => t.jti)
      const overlap = page1Jtis.filter((/** @type {string} */ jti) => page2Jtis.includes(jti))
      assert.strictEqual(overlap.length, 0, 'Pages should not have overlapping tokens')
    })

    await t.test('handles after cursor correctly', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create multiple tokens
      await createMultipleTokens(app, user.username, user.password, 5)

      // Get page 2 first
      const page2Res = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens?per_page=3&sort=desc&before=99999999999999:00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const page2Body = JSON.parse(page2Res.payload)
      if (page2Body.pagination.after) {
        // Go back to previous page
        const page1Res = await app.inject({
          method: 'GET',
          url: `/api/user/auth-tokens?per_page=3&sort=desc&after=${page2Body.pagination.after}`,
          headers: {
            authorization: `Bearer ${user.token}`
          }
        })

        assert.strictEqual(page1Res.statusCode, 200)
        const page1Body = JSON.parse(page1Res.payload)
        assert.ok(page1Body.data.length > 0, 'Should have results when going back')
      }
    })

    await t.test('respects per_page limits', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Test minimum
      const minRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens?per_page=1',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })
      assert.strictEqual(minRes.statusCode, 200)
      const minBody = JSON.parse(minRes.payload)
      assert.strictEqual(minBody.data.length, 1, 'Should respect minimum per_page')

      // Test maximum
      const maxRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens?per_page=100',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })
      assert.strictEqual(maxRes.statusCode, 200)

      // Test out of range
      const outOfRangeRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens?per_page=101',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })
      assert.strictEqual(outOfRangeRes.statusCode, 400, 'Should reject per_page > 100')
    })

    await t.test('prevents using both before and after cursors', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const bothCursorsRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens?before=123:abc&after=456:def',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(bothCursorsRes.statusCode, 400, 'Should reject both cursors')
    })

    await t.test('handles invalid cursor format', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const invalidCursorRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens?before=invalid-cursor',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(invalidCursorRes.statusCode, 400, 'Should reject invalid cursor format')
    })
  })

  await test('list auth tokens - sorting', async (t) => {
    const app = await build(t)

    await t.test('sorts by last_seen descending (default)', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create multiple tokens
      await createMultipleTokens(app, user.username, user.password, 3)

      const descRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const descBody = JSON.parse(descRes.payload)
      for (let i = 1; i < descBody.data.length; i++) {
        const prevDate = new Date(descBody.data[i - 1].last_seen)
        const currDate = new Date(descBody.data[i].last_seen)
        assert.ok(prevDate >= currDate, 'Tokens should be sorted in descending order by default')
      }
    })

    await t.test('sorts by last_seen ascending when specified', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      // Create multiple tokens
      await createMultipleTokens(app, user.username, user.password, 3)

      const ascRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens?sort=asc',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      const ascBody = JSON.parse(ascRes.payload)
      for (let i = 1; i < ascBody.data.length; i++) {
        const prevDate = new Date(ascBody.data[i - 1].last_seen)
        const currDate = new Date(ascBody.data[i].last_seen)
        assert.ok(prevDate <= currDate, 'Tokens should be sorted in ascending order')
      }
    })

    await t.test('rejects invalid sort value', async (t) => {
      const user = await createTestUser(app, t)
      if (!user) return // Registration disabled

      const invalidSortRes = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens?sort=invalid',
        headers: {
          authorization: `Bearer ${user.token}`
        }
      })

      assert.strictEqual(invalidSortRes.statusCode, 400, 'Should reject invalid sort value')
    })
  })

  await test('list auth tokens - authentication', async (t) => {
    const app = await build(t)

    await t.test('returns 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens'
      })

      assert.strictEqual(res.statusCode, 401, 'Should require authentication')
    })

    await t.test('returns 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/user/auth-tokens',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      })

      assert.strictEqual(res.statusCode, 401, 'Should reject invalid token')
    })
  })
})
