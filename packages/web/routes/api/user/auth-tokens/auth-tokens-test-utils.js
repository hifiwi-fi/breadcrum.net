import { randomUUID } from 'node:crypto'
import SQL from '@nearform/sql'

/**
 * Creates a test user and returns credentials plus cleanup function
 * @param {import('fastify').FastifyInstance} app
 * @param {import('node:test').TestContext} t
 * @returns {Promise<{
 *   userId: string,
 *   username: string,
 *   email: string,
 *   password: string,
 *   token: string
 * } | null>}
 */
export async function createTestUser (app, t) {
  const testUsername = `test_user_${Date.now()}_${randomUUID().slice(0, 8)}`
  const testEmail = `test_${Date.now()}_${randomUUID().slice(0, 8)}@example.com`
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

  // If registration is disabled, return null
  if (registerRes.statusCode === 403) {
    throw new Error('Registration is disabled, skipping test')
  }

  if (registerRes.statusCode !== 201) {
    console.error('Registration failed:', registerRes.statusCode, registerRes.payload)
    throw new Error(`Registration failed with status ${registerRes.statusCode}`)
  }

  const registerBody = JSON.parse(registerRes.payload)
  const userId = registerBody.user.id

  // Setup cleanup
  t.after(async () => {
    if (userId) {
      await app.pg.query('DELETE FROM auth_tokens WHERE owner_id = $1', [userId])
      await app.pg.query('DELETE FROM users WHERE id = $1', [userId])
    }
  })

  return {
    userId,
    username: testUsername,
    email: testEmail,
    password: testPassword,
    token: registerBody.token
  }
}

/**
 * Creates multiple sessions for a user
 * @param {import('fastify').FastifyInstance} app
 * @param {string} username
 * @param {string} password
 * @param {number} count
 * @returns {Promise<string[]>} Array of tokens
 */
export async function createMultipleTokens (app, username, password, count) {
  const tokens = []

  for (let i = 0; i < count; i++) {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/login',
      payload: {
        user: username,
        password
      }
    })

    if (loginRes.statusCode !== 201) {
      throw new Error(`Login failed with status ${loginRes.statusCode}`)
    }

    const loginBody = JSON.parse(loginRes.payload)
    tokens.push(loginBody.token)

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  return tokens
}

/**
 * Creates tokens with specific last_seen dates
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId
 * @param {Array<{daysAgo: number, source?: 'web' | 'api' }>} tokenSpecs
 * @returns {Promise<Array<{jti: string, last_seen: Date}>>}
 */
export async function createTokensWithDates (app, userId, tokenSpecs) {
  const now = new Date()
  const tokens = []

  for (const spec of tokenSpecs) {
    const lastSeen = new Date(now.getTime() - spec.daysAgo * 24 * 60 * 60 * 1000)
    const source = spec.source ?? 'web'
    const jti = randomUUID()

    const query = SQL`
       INSERT INTO auth_tokens (jti, owner_id, created_at, last_seen, user_agent, ip, source)
       VALUES (${jti}, ${userId}, ${lastSeen}, ${lastSeen}, ${'Test Agent'}, ${'127.0.0.1'}, ${source})
     `

    await app.pg.query(query)

    tokens.push({ jti, last_seen: lastSeen })
  }

  return tokens
}

/**
 * Asserts that a token object has the expected shape
 * @param {import('node:assert')} assert
 * @param {any} token
 * @param {object} options
 * @param {boolean} [options.checkCurrent]
 */
export function assertTokenShape (assert, token, options = {}) {
  assert.ok(token.jti, 'Token should have JTI')
  assert.ok(token.created_at, 'Token should have created_at')
  assert.ok(token.last_seen, 'Token should have last_seen')
  assert.ok(!token.last_seen_micros, 'Token should not have last_seen_micros')
  assert.ok(token.updated_at, 'Token should have updated_at')
  assert.strictEqual(typeof token.is_current, 'boolean', 'Token should have is_current boolean')
  assert.strictEqual(typeof token.protect, 'boolean', 'Token should have protect boolean')

  // user_agent and ip can be null
  assert.ok('user_agent' in token, 'Token should have user_agent field')
  assert.ok('ip' in token, 'Token should have ip field')
  assert.ok('note' in token, 'Token should have note field')

  if (options.checkCurrent !== undefined) {
    assert.strictEqual(token.is_current, options.checkCurrent, `Token is_current should be ${options.checkCurrent}`)
  }
}

/**
 * Asserts that pagination metadata has the expected shape
 * @param {import('node:assert')} assert
 * @param {any} pagination
 */
export function assertPaginationShape (assert, pagination) {
  assert.strictEqual(typeof pagination.top, 'boolean', 'Pagination should have top boolean')
  assert.strictEqual(typeof pagination.bottom, 'boolean', 'Pagination should have bottom boolean')
  assert.ok('before' in pagination, 'Pagination should have before field')
  assert.ok('after' in pagination, 'Pagination should have after field')
}
