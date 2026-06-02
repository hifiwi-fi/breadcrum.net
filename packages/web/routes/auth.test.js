import { test, suite } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { build } from '../test/helper.js'

await suite('HTML auth routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('renders the Fastify login page', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/login/',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /text\/html/)
    assert.match(res.payload, /<h1>Log in<\/h1>/)
    assert.match(res.payload, /method="post" action="\/login\/"/)
    assert.match(res.payload, /data-bc-passkey-login/)
    assert.match(res.payload, /\/assets\/passkey-login\.js/)
    assert.doesNotMatch(res.payload, /\/login\/client-/)
  })

  await test('renders login form validation errors', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/login/',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: new URLSearchParams({
        user: '',
        password: '',
      }).toString(),
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /Email or username is required\./)
    assert.match(res.payload, /Password is required\./)
  })

  await test('logs in with a form post and sets a session cookie', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/login/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        payload: new URLSearchParams({
          user: session.username,
          password: session.password,
          redirect: '/feeds/?page=2',
        }).toString(),
      })

      assert.strictEqual(res.statusCode, 302)
      assert.strictEqual(res.headers['location'], '/feeds/?page=2')
      assert.ok(cookieHeader(res))
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('redirects authenticated login visits using the session cookie', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/login/?redirect=/archives/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 302)
      assert.strictEqual(res.headers['location'], '/archives/')
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('logs out with a form post and invalidates the old session cookie', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const logoutRes = await app.inject({
        method: 'POST',
        url: '/logout/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(logoutRes.statusCode, 302)
      assert.strictEqual(logoutRes.headers['location'], '/')
      assert.ok(cookieHeader(logoutRes))

      const rootRes = await app.inject({
        url: '/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.match(rootRes.payload, /href="\/login\/"/)
      assert.doesNotMatch(rootRes.payload, new RegExp(`>${session.username}<`))
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders the Fastify password reset page', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/password_reset/',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /<h1>Reset password<\/h1>/)
    assert.match(res.payload, /method="post" action="\/password_reset\/"/)
    assert.doesNotMatch(res.payload, /\/password_reset\/client-/)
  })

  await test('renders password reset validation errors', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/password_reset/',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: new URLSearchParams({
        email: 'not-an-email',
      }).toString(),
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /Enter a valid email address\./)
  })

  await test('requests a password reset and confirms a new password', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const newPassword = 'NewPassword123!'

    try {
      const requestRes = await app.inject({
        method: 'POST',
        url: '/password_reset/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        payload: new URLSearchParams({
          email: session.email,
        }).toString(),
      })

      assert.strictEqual(requestRes.statusCode, 200)
      assert.match(requestRes.payload, /Email sent with password reset instructions\./)

      const token = await getPasswordResetToken(app, session.userId)
      assert.strictEqual(token.length, 64)

      const confirmPageRes = await app.inject({
        url: `/password_reset/confirm?token=${token}&user_id=${session.userId}`,
      })

      assert.strictEqual(confirmPageRes.statusCode, 200)
      assert.match(confirmPageRes.payload, /<h1>Set new password<\/h1>/)
      assert.match(confirmPageRes.payload, new RegExp(`name="token" value="${token}"`))
      assert.match(confirmPageRes.payload, new RegExp(`name="userId" value="${session.userId}"`))

      const confirmRes = await app.inject({
        method: 'POST',
        url: '/password_reset/confirm/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        payload: new URLSearchParams({
          token,
          userId: session.userId,
          password: newPassword,
        }).toString(),
      })

      assert.strictEqual(confirmRes.statusCode, 200)
      assert.match(confirmRes.payload, /New password set\./)

      const loginRes = await app.inject({
        method: 'POST',
        url: '/login/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        payload: new URLSearchParams({
          user: session.username,
          password: newPassword,
        }).toString(),
      })

      assert.strictEqual(loginRes.statusCode, 302)
      assert.strictEqual(loginRes.headers['location'], '/bookmarks/')
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders the Fastify register page', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/register/',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /<h1>Register<\/h1>/)
    assert.match(res.payload, /method="post" action="\/register\/"/)
    assert.doesNotMatch(res.payload, /\/register\/client-/)
  })

  await test('renders register validation errors', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/register/',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: new URLSearchParams({
        email: 'not-an-email',
        username: 'bad username',
        password: 'short',
      }).toString(),
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /Enter a valid email address\./)
    assert.match(res.payload, /Use letters and numbers with \., _, or - between characters\./)
    assert.match(res.payload, /Password must be at least 8 characters\./)
  })

  await test('registers with a form post and sets a session cookie', async (t) => {
    const app = await build(t)
    const id = randomUUID().slice(0, 8)
    const username = `html_register_${Date.now()}_${id}`
    const email = `html_register_${Date.now()}_${id}@example.com`
    /** @type {string | null} */
    let userId = null

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/register/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        payload: new URLSearchParams({
          email,
          username,
          password: 'TestPassword123!',
          newsletter_subscription: 'true',
        }).toString(),
      })

      assert.strictEqual(res.statusCode, 302, res.payload)
      assert.strictEqual(res.headers['location'], '/docs/tutorial/')
      assert.ok(cookieHeader(res))

      const results = await app.pg.query('SELECT id, newsletter_subscription FROM users WHERE username = $1', [username])
      userId = results.rows[0]?.id ?? null
      assert.strictEqual(typeof userId, 'string')
      assert.strictEqual(results.rows[0]?.newsletter_subscription, true)
    } finally {
      if (userId) await deleteRegisteredSession(app, userId)
    }
  })

  await test('renders closed registration state from flags', async (t) => {
    const app = await build(t)
    await setRegistrationFlag(app, false)

    try {
      const res = await app.inject({
        url: '/register/',
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /Registration closed\. Please come back soon\./)
      assert.doesNotMatch(res.payload, /method="post" action="\/register\/"/)
    } finally {
      await clearRegistrationFlag(app)
    }
  })

  await test('redirects anonymous email confirmation visits to login with the current URL', async (t) => {
    const app = await build(t)
    const token = 'a'.repeat(64)
    const res = await app.inject({
      url: `/email_confirm/?token=${token}`,
    })

    assert.strictEqual(res.statusCode, 302)

    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), `/email_confirm/?token=${token}`)
  })

  await test('renders the Fastify email confirmation page for authenticated users', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const token = await getEmailVerifyToken(app, session.userId)
      const res = await app.inject({
        url: `/email_confirm?token=${token}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /<h1>Email confirmation<\/h1>/)
      assert.match(res.payload, /method="post" action="\/email_confirm\/"/)
      assert.match(res.payload, new RegExp(`name="token" value="${token}"`))
      assert.match(res.payload, /name="update" value="false"/)
      assert.doesNotMatch(res.payload, /\/email_confirm\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('confirms account email with a form post', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const token = await getEmailVerifyToken(app, session.userId)
      const res = await app.inject({
        method: 'POST',
        url: '/email_confirm/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          token,
          update: 'false',
        }).toString(),
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /Email address confirmed!/)

      const emailState = await getEmailState(app, session.userId)
      assert.strictEqual(emailState.email_confirmed, true)
      assert.strictEqual(emailState.email_verify_token, null)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders the Fastify unsubscribe page', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/unsubscribe/',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /<h1>Unsubscribe<\/h1>/)
    assert.match(res.payload, /method="post" action="\/unsubscribe\/"/)
    assert.doesNotMatch(res.payload, /\/unsubscribe\/client-/)
  })

  await test('unsubscribes email links with a query email', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      await setNewsletterSubscription(app, session.userId, true)

      const res = await app.inject({
        url: `/unsubscribe?email=${encodeURIComponent(session.email)}`,
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, new RegExp(`${session.email} will no longer receive any emails from Breadcrum\\.`))
      assert.strictEqual(await getNewsletterSubscription(app, session.userId), false)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders unsubscribe validation errors', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/unsubscribe/',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: new URLSearchParams({
        email: 'not-an-email',
      }).toString(),
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /Enter a valid email address\./)
  })
})

/**
 * @param {import('fastify').FastifyInstance} app
 * @returns {Promise<{ userId: string, username: string, email: string, password: string, cookie: string }>}
 */
async function createRegisteredSession (app) {
  const id = randomUUID().slice(0, 8)
  const username = `auth_user_${Date.now()}_${id}`
  const email = `auth_${Date.now()}_${id}@example.com`
  const password = 'TestPassword123!'
  const registerRes = await app.inject({
    method: 'POST',
    url: '/api/register',
    payload: {
      username,
      email,
      password,
      newsletter_subscription: false,
    },
  })

  assert.strictEqual(registerRes.statusCode, 201, registerRes.payload)

  const registerBody = JSON.parse(registerRes.payload)

  return {
    userId: registerBody.user.id,
    username,
    email,
    password,
    cookie: cookieHeader(registerRes),
  }
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getPasswordResetToken (app, userId) {
  const results = await app.pg.query('SELECT password_reset_token FROM users WHERE id = $1', [userId])
  const token = results.rows[0]?.password_reset_token
  assert.strictEqual(typeof token, 'string')
  return token
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getEmailVerifyToken (app, userId) {
  const results = await app.pg.query('SELECT email_verify_token FROM users WHERE id = $1', [userId])
  const token = results.rows[0]?.email_verify_token
  assert.strictEqual(typeof token, 'string')
  return token
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId
 * @returns {Promise<{ email_confirmed: boolean, email_verify_token: string | null }>}
 */
async function getEmailState (app, userId) {
  const results = await app.pg.query('SELECT email_confirmed, email_verify_token FROM users WHERE id = $1', [userId])
  const state = results.rows[0]
  assert.ok(state)
  return state
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId
 * @param {boolean} subscribed
 * @returns {Promise<void>}
 */
async function setNewsletterSubscription (app, userId, subscribed) {
  await app.pg.query('UPDATE users SET newsletter_subscription = $1 WHERE id = $2', [subscribed, userId])
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function getNewsletterSubscription (app, userId) {
  const results = await app.pg.query('SELECT newsletter_subscription FROM users WHERE id = $1', [userId])
  const subscribed = results.rows[0]?.newsletter_subscription
  assert.strictEqual(typeof subscribed, 'boolean')
  return subscribed
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function deleteRegisteredSession (app, userId) {
  await app.pg.query('DELETE FROM auth_tokens WHERE owner_id = $1', [userId])
  await app.pg.query('DELETE FROM users WHERE id = $1', [userId])
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {boolean} value
 * @returns {Promise<void>}
 */
async function setRegistrationFlag (app, value) {
  await app.pg.query(
    `
      INSERT INTO feature_flags (name, value)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (name)
      DO UPDATE SET value = EXCLUDED.value
    `,
    ['registration', JSON.stringify(value)]
  )
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @returns {Promise<void>}
 */
async function clearRegistrationFlag (app) {
  await app.pg.query('DELETE FROM feature_flags WHERE name = $1', ['registration'])
}

/**
 * @param {{ headers: Record<string, string | number | string[] | undefined> }} response
 * @returns {string}
 */
function cookieHeader (response) {
  const setCookie = response.headers['set-cookie']
  assert.ok(setCookie, 'expected Set-Cookie header')
  if (typeof setCookie === 'number') {
    assert.fail('expected Set-Cookie header to be a string')
  }

  return (Array.isArray(setCookie) ? setCookie : [setCookie])
    .map(cookie => cookie.split(';')[0])
    .join('; ')
}
