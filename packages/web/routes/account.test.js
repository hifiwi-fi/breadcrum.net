import { test, suite } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { build } from '../test/helper.js'
import { createTestPasskey } from './api/user/passkeys/passkeys-test-utils.js'

await suite('HTML account routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('redirects anonymous account visits to login with the current URL', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/account/',
    })

    assert.strictEqual(res.statusCode, 302)

    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), '/account/')
  })

  await test('renders the authenticated account page', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/account/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /<h1>Account<\/h1>/)
      assert.match(res.payload, new RegExp(session.username))
      assert.match(res.payload, new RegExp(session.email))
      assert.match(res.payload, /method="post" action="\/account\/username\/"/)
      assert.match(res.payload, /method="post" action="\/account\/password\/"/)
      assert.match(res.payload, /method="post" action="\/account\/newsletter\/"/)
      assert.match(res.payload, /action="\/account\/passkeys\/"/)
      assert.match(res.payload, /\/assets\/passkey-register\.js/)
      assert.match(res.payload, /method="post" action="\/account\/auth-tokens\/"/)
      assert.match(res.payload, /Create token/)
      assert.match(res.payload, /Current/)
      assert.doesNotMatch(res.payload, /\/account\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders only the main account fragment for htmx requests', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/account/',
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': 'bc-main',
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.doesNotMatch(res.payload, /<!DOCTYPE html>/)
      assert.match(res.payload, /<h1>Account<\/h1>/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('updates the username from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const username = `account_renamed_${randomUUID().slice(0, 8)}`

    try {
      const updateRes = await app.inject({
        method: 'POST',
        url: '/account/username/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          username,
        }).toString(),
      })

      assert.strictEqual(updateRes.statusCode, 302, updateRes.payload)
      assert.match(String(updateRes.headers['location']), /^\/account\/\?message=/)

      const res = await app.inject({
        url: '/account/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, new RegExp(username))
      assert.doesNotMatch(res.payload, new RegExp(session.username))
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('updates the password from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const password = 'UpdatedPassword123!'

    try {
      const updateRes = await app.inject({
        method: 'POST',
        url: '/account/password/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          password,
          confirmPassword: password,
        }).toString(),
      })

      assert.strictEqual(updateRes.statusCode, 302, updateRes.payload)

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/login',
        payload: {
          user: session.username,
          password,
        },
      })

      assert.strictEqual(loginRes.statusCode, 201, loginRes.payload)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('toggles newsletter subscription from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const updateRes = await app.inject({
        method: 'POST',
        url: '/account/newsletter/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          newsletter_subscription: 'true',
        }).toString(),
      })

      assert.strictEqual(updateRes.statusCode, 302, updateRes.payload)

      const res = await app.inject({
        url: '/account/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /Subscribed/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('requests an email update from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const email = `account_update_${randomUUID().slice(0, 8)}@example.com`

    try {
      const updateRes = await app.inject({
        method: 'POST',
        url: '/account/email/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          action: 'update',
          email,
        }).toString(),
      })

      assert.strictEqual(updateRes.statusCode, 302, updateRes.payload)

      const res = await app.inject({
        url: '/account/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, new RegExp(email))
      assert.match(res.payload, /pending verification/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('creates an API auth token from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const note = `html token ${randomUUID().slice(0, 8)}`

    try {
      const createRes = await app.inject({
        method: 'POST',
        url: '/account/auth-tokens/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          action: 'create',
          note,
          protect: 'true',
        }).toString(),
      })

      assert.strictEqual(createRes.statusCode, 200, createRes.payload)
      assert.match(createRes.payload, /Auth token created\./)
      assert.match(createRes.payload, /New token/)
      assert.match(createRes.payload, /This token is only shown once\./)
      assert.match(createRes.payload, new RegExp(note))

      const tokenResult = await app.pg.query(
        'SELECT note, protect, source FROM auth_tokens WHERE owner_id = $1 AND note = $2',
        [session.userId, note]
      )

      assert.strictEqual(tokenResult.rowCount, 1)
      assert.deepStrictEqual(tokenResult.rows[0], {
        note,
        protect: true,
        source: 'api',
      })
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('updates and revokes API auth tokens from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const updatedNote = `updated token ${randomUUID().slice(0, 8)}`

    try {
      const created = await createApiAuthToken(app, session.cookie, {
        note: `api token ${randomUUID().slice(0, 8)}`,
        protect: true,
      })

      const updateRes = await app.inject({
        method: 'POST',
        url: '/account/auth-tokens/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          action: 'update',
          jti: created.jti,
          note: updatedNote,
          protect: 'false',
        }).toString(),
      })

      assert.strictEqual(updateRes.statusCode, 302, updateRes.payload)
      assert.match(String(updateRes.headers['location']), /^\/account\/\?message=/)

      const updatedResult = await app.pg.query(
        'SELECT note, protect FROM auth_tokens WHERE owner_id = $1 AND jti = $2',
        [session.userId, created.jti]
      )

      assert.strictEqual(updatedResult.rowCount, 1)
      assert.deepStrictEqual(updatedResult.rows[0], {
        note: updatedNote,
        protect: false,
      })

      const deleteRes = await app.inject({
        method: 'POST',
        url: '/account/auth-tokens/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          action: 'delete',
          jti: created.jti,
        }).toString(),
      })

      assert.strictEqual(deleteRes.statusCode, 302, deleteRes.payload)
      assert.match(String(deleteRes.headers['location']), /^\/account\/\?message=/)

      const deletedResult = await app.pg.query(
        'SELECT jti FROM auth_tokens WHERE owner_id = $1 AND jti = $2',
        [session.userId, created.jti]
      )

      assert.strictEqual(deletedResult.rowCount, 0)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('does not revoke the current cookie session auth token', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const currentToken = await getCurrentAuthToken(app, session.cookie)

      const deleteRes = await app.inject({
        method: 'POST',
        url: '/account/auth-tokens/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          action: 'delete',
          jti: currentToken.jti,
        }).toString(),
      })

      assert.strictEqual(deleteRes.statusCode, 302, deleteRes.payload)
      assert.match(String(deleteRes.headers['location']), /^\/account\/\?error=/)

      const tokenResult = await app.pg.query(
        'SELECT jti FROM auth_tokens WHERE owner_id = $1 AND jti = $2',
        [session.userId, currentToken.jti]
      )

      assert.strictEqual(tokenResult.rowCount, 1)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders and manages passkeys from the HTML account page', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const updatedName = `Updated passkey ${randomUUID().slice(0, 8)}`

    try {
      const passkey = await createTestPasskey(app, session.userId, {
        name: `Main passkey ${randomUUID().slice(0, 8)}`,
        transports: ['internal', 'hybrid'],
      })

      const pageRes = await app.inject({
        url: '/account/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(pageRes.statusCode, 200, pageRes.payload)
      assert.match(pageRes.payload, new RegExp(passkey.name))
      assert.match(pageRes.payload, /internal, hybrid/)

      const updateRes = await app.inject({
        method: 'POST',
        url: '/account/passkeys/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          action: 'update',
          id: passkey.id,
          name: updatedName,
        }).toString(),
      })

      assert.strictEqual(updateRes.statusCode, 302, updateRes.payload)
      assert.match(String(updateRes.headers['location']), /^\/account\/\?message=/)

      const updatedResult = await app.pg.query(
        'SELECT name FROM passkeys WHERE user_id = $1 AND id = $2',
        [session.userId, passkey.id]
      )

      assert.strictEqual(updatedResult.rowCount, 1)
      assert.strictEqual(updatedResult.rows[0]?.name, updatedName)

      const deleteRes = await app.inject({
        method: 'POST',
        url: '/account/passkeys/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          action: 'delete',
          id: passkey.id,
        }).toString(),
      })

      assert.strictEqual(deleteRes.statusCode, 302, deleteRes.payload)
      assert.match(String(deleteRes.headers['location']), /^\/account\/\?message=/)

      const deletedResult = await app.pg.query(
        'SELECT id FROM passkeys WHERE user_id = $1 AND id = $2',
        [session.userId, passkey.id]
      )

      assert.strictEqual(deletedResult.rowCount, 0)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('redirects passkey registration form posts without browser WebAuthn', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const registerRes = await app.inject({
        method: 'POST',
        url: '/account/passkeys/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          action: 'register',
          name: 'No JS passkey',
        }).toString(),
      })

      assert.strictEqual(registerRes.statusCode, 302, registerRes.payload)
      assert.match(String(registerRes.headers['location']), /^\/account\/\?error=/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })
})

/**
 * @param {import('fastify').FastifyInstance} app
 * @returns {Promise<{ userId: string, username: string, email: string, password: string, cookie: string }>}
 */
async function createRegisteredSession (app) {
  const id = randomUUID().slice(0, 8)
  const username = `account_user_${Date.now()}_${id}`
  const email = `account_${Date.now()}_${id}@example.com`
  const password = 'TestPassword123!'

  const userResults = await app.pg.query(
    `
      INSERT INTO users (
        username,
        email,
        password,
        email_confirmed,
        newsletter_subscription
      ) VALUES (
        $1,
        $2,
        crypt($3, gen_salt('bf')),
        true,
        false
      )
      RETURNING id
    `,
    [username, email, password]
  )
  const userId = userResults.rows[0]?.id
  assert.strictEqual(typeof userId, 'string')

  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/login',
    payload: {
      user: username,
      password,
    },
  })

  assert.strictEqual(loginRes.statusCode, 201, loginRes.payload)

  return {
    userId,
    username,
    email,
    password,
    cookie: cookieHeader(loginRes),
  }
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function deleteRegisteredSession (app, userId) {
  await app.pg.query('DELETE FROM passkeys WHERE user_id = $1', [userId])
  await app.pg.query('DELETE FROM auth_tokens WHERE owner_id = $1', [userId])
  await app.pg.query('DELETE FROM users WHERE id = $1', [userId])
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

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} cookie
 * @param {{ note: string, protect: boolean }} token
 * @returns {Promise<{ jti: string }>}
 */
async function createApiAuthToken (app, cookie, token) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/user/auth-tokens/',
    headers: {
      cookie,
    },
    payload: token,
  })

  assert.strictEqual(res.statusCode, 201, res.payload)
  /** @type {{ auth_token?: { jti?: unknown } }} */
  const body = JSON.parse(res.payload)
  const jti = body.auth_token?.jti
  if (typeof jti !== 'string') {
    assert.fail('expected created auth token jti')
  }

  return {
    jti,
  }
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} cookie
 * @returns {Promise<{ jti: string }>}
 */
async function getCurrentAuthToken (app, cookie) {
  const res = await app.inject({
    url: '/api/user/auth-tokens/',
    headers: {
      cookie,
    },
  })

  assert.strictEqual(res.statusCode, 200, res.payload)
  /** @type {{ data: Array<{ jti: string, is_current: boolean }> }} */
  const body = JSON.parse(res.payload)
  const token = body.data.find(authToken => authToken.is_current)
  if (!token) {
    assert.fail('expected current auth token')
  }

  return {
    jti: token.jti,
  }
}
