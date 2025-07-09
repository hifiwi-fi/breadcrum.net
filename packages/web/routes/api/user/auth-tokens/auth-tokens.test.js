import { test, suite } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../../test/helper.js'
import { randomUUID } from 'node:crypto'

await suite('Auth Tokens API Tests', { concurrency: false, timeout: 30000 }, async () => {
  await test('simple auth token flow - register, login, list tokens', async (t) => {
    const app = await build(t)

    // Create test data
    const testUsername = `test_user_${Date.now()}`
    const testEmail = `test_${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    // Register a new user
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/register',
      payload: {
        username: testUsername,
        email: testEmail,
        password: testPassword,
        newsletter_subscription: false
      }
    })

    // If registration is disabled, skip this test
    if (registerRes.statusCode === 403) {
      console.log('Registration is disabled, skipping test')
      return
    }

    if (registerRes.statusCode !== 201) {
      console.error('Registration failed:', registerRes.statusCode, registerRes.payload)
    }
    assert.strictEqual(registerRes.statusCode, 201, 'Registration should succeed')
    const registerBody = JSON.parse(registerRes.payload)
    assert.ok(registerBody.token, 'Should receive a JWT token from registration')
    assert.ok(registerBody.user, 'Should receive user info')
    assert.strictEqual(registerBody.user.username, testUsername)

    // Use the token from registration to list auth tokens
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/user/auth-tokens',
      headers: {
        authorization: `Bearer ${registerBody.token}`
      }
    })

    assert.strictEqual(listRes.statusCode, 200, 'Should be able to list tokens')
    const listBody = JSON.parse(listRes.payload)
    assert.ok(listBody.data, 'Should have data array')
    assert.ok(listBody.pagination, 'Should have pagination info')
    assert.strictEqual(listBody.data.length, 1, 'Should have exactly one token')

    // Verify the token details
    const token = listBody.data[0]
    assert.ok(token.jti, 'Token should have JTI')
    assert.ok(token.created_at, 'Token should have created_at')
    assert.ok(token.last_seen, 'Token should have last_seen')
    assert.strictEqual(token.is_current, true, 'Token should be marked as current')

    // Try to get the specific token
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/user/auth-tokens/${token.jti}`,
      headers: {
        authorization: `Bearer ${registerBody.token}`
      }
    })

    assert.strictEqual(getRes.statusCode, 200, 'Should be able to get specific token')
    const getBody = JSON.parse(getRes.payload)
    assert.strictEqual(getBody.jti, token.jti, 'Should return the same token')

    // Test that we cannot delete the current session
    const deleteCurrentRes = await app.inject({
      method: 'DELETE',
      url: `/api/user/auth-tokens/${token.jti}`,
      headers: {
        authorization: `Bearer ${registerBody.token}`
      }
    })

    assert.strictEqual(deleteCurrentRes.statusCode, 400, 'Should not be able to delete current session')
    const deleteBody = JSON.parse(deleteCurrentRes.payload)
    assert.strictEqual(deleteBody.message, 'Cannot delete the current session token')

    // Login again to create a second token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/login',
      payload: {
        user: testUsername,
        password: testPassword
      }
    })

    assert.strictEqual(loginRes.statusCode, 201, 'Login should succeed')
    const loginBody = JSON.parse(loginRes.payload)

    // List tokens again - should now have 2
    const listRes2 = await app.inject({
      method: 'GET',
      url: '/api/user/auth-tokens',
      headers: {
        authorization: `Bearer ${loginBody.token}`
      }
    })

    const listBody2 = JSON.parse(listRes2.payload)
    assert.strictEqual(listBody2.data.length, 2, 'Should have two tokens after second login')

    // Find the non-current token
    const oldToken = listBody2.data.find(t => !t.is_current)
    assert.ok(oldToken, 'Should have a non-current token')

    // Delete the old token
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/user/auth-tokens/${oldToken.jti}`,
      headers: {
        authorization: `Bearer ${loginBody.token}`
      }
    })

    assert.strictEqual(deleteRes.statusCode, 204, 'Should be able to delete non-current token')

    // Verify it's gone
    const listRes3 = await app.inject({
      method: 'GET',
      url: '/api/user/auth-tokens',
      headers: {
        authorization: `Bearer ${loginBody.token}`
      }
    })

    const listBody3 = JSON.parse(listRes3.payload)
    assert.strictEqual(listBody3.data.length, 1, 'Should have only one token after deletion')
  })

  await test('auth tokens API requires authentication', async (t) => {
    const app = await build(t)

    // Test unauthenticated access to list endpoint
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/user/auth-tokens'
    })

    assert.strictEqual(listRes.statusCode, 401)

    // Test unauthenticated access to get endpoint
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/user/auth-tokens/${randomUUID()}`
    })

    assert.strictEqual(getRes.statusCode, 401)

    // Test unauthenticated access to delete endpoint
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/user/auth-tokens/${randomUUID()}`
    })

    assert.strictEqual(deleteRes.statusCode, 401)
  })

  await test('auth tokens pagination', async (t) => {
    const app = await build(t)

    // Register a new user
    const testUsername = `test_pagination_${Date.now()}`
    const testEmail = `test_pagination_${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/register',
      payload: {
        username: testUsername,
        email: testEmail,
        password: testPassword,
        newsletter_subscription: false
      }
    })

    if (registerRes.statusCode === 403) {
      console.log('Registration is disabled, skipping test')
      return
    }

    const registerBody = JSON.parse(registerRes.payload)
    const initialToken = registerBody.token

    // Create multiple sessions by logging in multiple times
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/login',
        payload: {
          user: testUsername,
          password: testPassword
        }
      })
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Test pagination with small page size
    const pageRes = await app.inject({
      method: 'GET',
      url: '/api/user/auth-tokens?per_page=3&sort=desc',
      headers: {
        authorization: `Bearer ${initialToken}`
      }
    })

    assert.strictEqual(pageRes.statusCode, 200)
    const pageBody = JSON.parse(pageRes.payload)
    assert.strictEqual(pageBody.data.length, 3, 'Should return requested page size')
    assert.strictEqual(pageBody.pagination.top, true, 'Should be at top of results')
    assert.strictEqual(pageBody.pagination.bottom, false, 'Should not be at bottom')
    assert.ok(pageBody.pagination.before, 'Should have cursor for next page')

    // Get next page
    const nextPageRes = await app.inject({
      method: 'GET',
      url: `/api/user/auth-tokens?per_page=3&sort=desc&before=${pageBody.pagination.before}`,
      headers: {
        authorization: `Bearer ${initialToken}`
      }
    })

    if (nextPageRes.statusCode !== 200) {
      console.error('Next page request failed:', nextPageRes.statusCode, nextPageRes.payload)
    }
    assert.strictEqual(nextPageRes.statusCode, 200, 'Next page request should succeed')
    const nextPageBody = JSON.parse(nextPageRes.payload)
    assert.ok(nextPageBody.data, 'Should have data array')
    assert.ok(nextPageBody.data.length > 0, 'Should have results on next page')
    assert.strictEqual(nextPageBody.pagination.top, false, 'Should not be at top')
    assert.ok(nextPageBody.pagination.after, 'Should have cursor for previous page')

    // Test ascending sort
    const ascRes = await app.inject({
      method: 'GET',
      url: '/api/user/auth-tokens?per_page=10&sort=asc',
      headers: {
        authorization: `Bearer ${initialToken}`
      }
    })

    const ascBody = JSON.parse(ascRes.payload)
    for (let i = 1; i < ascBody.data.length; i++) {
      const prevDate = new Date(ascBody.data[i - 1].last_seen)
      const currDate = new Date(ascBody.data[i].last_seen)
      assert.ok(prevDate <= currDate, 'Tokens should be sorted in ascending order')
    }
  })
})
