/**
 * Creates a test user with optional admin privileges
 * @param {import('fastify').FastifyInstance} app
 * @param {object} options
 * @param {boolean} [options.admin] - Whether user should be admin
 * @returns {Promise<{
 *   userId: string,
 *   username: string,
 *   email: string,
 *   password: string,
 *   token: string,
 *   isAdmin: boolean
 * }>}
 */
export async function createTestUser (app, options = {}) {
  const { admin = false } = options
  const testUsername = `test_user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const testEmail = `test_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@example.com`
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
    throw new Error('Registration is disabled, skipping test')
  }

  if (registerRes.statusCode !== 201) {
    console.error('Registration failed:', registerRes.statusCode, registerRes.payload)
    throw new Error(`Registration failed with status ${registerRes.statusCode}`)
  }

  const registerBody = JSON.parse(registerRes.payload)
  const userId = registerBody.user.id

  // Set admin role if requested
  if (admin) {
    await app.pg.query('UPDATE users SET admin = true WHERE id = $1', [userId])
  }

  return {
    userId,
    username: testUsername,
    email: testEmail,
    password: testPassword,
    token: registerBody.token,
    isAdmin: admin
  }
}
