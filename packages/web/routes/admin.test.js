import { test, suite } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { build } from '../test/helper.js'

await suite('HTML admin routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('redirects anonymous admin visits to login', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/admin/',
    })

    assert.strictEqual(res.statusCode, 302, res.payload)
    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), '/admin/')
  })

  await test('rejects non-admin sessions', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app, { admin: false })

    try {
      const res = await app.inject({
        url: '/admin/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 403, res.payload)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders the admin index for admins', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app, { admin: true })

    try {
      const res = await app.inject({
        url: '/admin/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /<h1>Admin<\/h1>/)
      assert.match(res.payload, /\/admin\/flags\//)
      assert.match(res.payload, /\/admin\/stats\//)
      assert.doesNotMatch(res.payload, /<!DOCTYPE html>[\s\S]*<script type="module" src="\/admin\//)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders only the main admin fragment for htmx requests', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app, { admin: true })

    try {
      const res = await app.inject({
        url: '/admin/',
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': 'bc-main',
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.doesNotMatch(res.payload, /<!DOCTYPE html>/)
      assert.match(res.payload, /<h1>Admin<\/h1>/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders and updates admin flags', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app, { admin: true })

    try {
      const pageRes = await app.inject({
        url: '/admin/flags/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(pageRes.statusCode, 200, pageRes.payload)
      assert.match(pageRes.payload, /Admin flags/)
      assert.match(pageRes.payload, /name="registration"/)

      const message = `Admin notice ${randomUUID().slice(0, 8)}`
      const updateRes = await app.inject({
        method: 'POST',
        url: '/admin/flags/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          registration: 'true',
          registration_invite_required: 'false',
          service_notice_message: message,
          service_notice_message_color: '',
          service_notice_dismissible_message: '',
          service_notice_dismissible_message_color: '',
          placeholder_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }).toString(),
      })

      assert.strictEqual(updateRes.statusCode, 302, updateRes.payload)
      assert.match(String(updateRes.headers['location']), /^\/admin\/flags\/\?message=/)

      const flagResult = await app.pg.query(
        'SELECT value FROM feature_flags WHERE name = $1',
        ['service_notice_message']
      )

      assert.strictEqual(flagResult.rowCount, 1)
      assert.strictEqual(flagResult.rows[0]?.value, message)
    } finally {
      await app.pg.query('DELETE FROM feature_flags WHERE name = $1', ['service_notice_message'])
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders admin stats, redis cache, and deps pages', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app, { admin: true })

    try {
      /** @type {Array<[string, RegExp]>} */
      const pages = [
        ['/admin/stats/', /<h1>Stats<\/h1>/],
        ['/admin/redis-cache/', /<h1>Redis cache<\/h1>/],
        ['/admin/deps/', /<h1>Deps<\/h1>/],
      ]

      for (const [url, pattern] of pages) {
        const res = await app.inject({
          url,
          headers: {
            cookie: session.cookie,
          },
        })

        assert.strictEqual(res.statusCode, 200, `${url}: ${res.payload}`)
        assert.match(res.payload, pattern)
      }
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders and manages admin users', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app, { admin: true })
    const target = await createUser(app, { admin: false })
    const internalNote = `note ${randomUUID().slice(0, 8)}`

    try {
      const listRes = await app.inject({
        url: `/admin/users/?username=${encodeURIComponent(target.username)}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(listRes.statusCode, 200, listRes.payload)
      assert.match(listRes.payload, /<h1>Users<\/h1>/)
      assert.match(listRes.payload, new RegExp(target.username))
      assert.match(listRes.payload, /action="\/admin\/users\/"/)

      const viewRes = await app.inject({
        url: `/admin/users/view/?id=${target.userId}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(viewRes.statusCode, 200, viewRes.payload)
      assert.match(viewRes.payload, /<h1>Admin user<\/h1>/)
      assert.match(viewRes.payload, new RegExp(target.email))

      const updateRes = await app.inject({
        method: 'POST',
        url: '/admin/users/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          action: 'update',
          id: target.userId,
          redirect: `/admin/users/view/?id=${target.userId}`,
          username: target.username,
          email: target.email,
          email_confirmed: 'true',
          pending_email_update: '',
          newsletter_subscription: 'false',
          disabled_email: 'false',
          disabled: 'true',
          disabled_reason: 'test disabled',
          internal_note: internalNote,
        }).toString(),
      })

      assert.strictEqual(updateRes.statusCode, 302, updateRes.payload)
      assert.match(String(updateRes.headers['location']), /^\/admin\/users\/view\/\?/)

      const updatedResult = await app.pg.query(
        'SELECT disabled, disabled_reason, internal_note FROM users WHERE id = $1',
        [target.userId]
      )

      assert.strictEqual(updatedResult.rowCount, 1)
      assert.deepStrictEqual(updatedResult.rows[0], {
        disabled: true,
        disabled_reason: 'test disabled',
        internal_note: internalNote,
      })

      const deleteRes = await app.inject({
        method: 'POST',
        url: '/admin/users/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          action: 'delete',
          id: target.userId,
          redirect: '/admin/users/',
        }).toString(),
      })

      assert.strictEqual(deleteRes.statusCode, 302, deleteRes.payload)

      const deletedResult = await app.pg.query(
        'SELECT id FROM users WHERE id = $1',
        [target.userId]
      )

      assert.strictEqual(deletedResult.rowCount, 0)
    } finally {
      await app.pg.query('DELETE FROM users WHERE id = $1', [target.userId])
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders admin pg-boss page', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app, { admin: true })

    try {
      const res = await app.inject({
        url: '/admin/pgboss/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /pg-boss queue dashboard/)
      assert.match(res.payload, /Recent jobs/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })
})

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ admin: boolean }} options
 * @returns {Promise<{ userId: string, username: string, email: string, password: string, cookie: string }>}
 */
async function createRegisteredSession (app, options) {
  const user = await createUser(app, options)
  const password = 'TestPassword123!'

  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/login',
    payload: {
      user: user.username,
      password,
    },
  })

  assert.strictEqual(loginRes.statusCode, 201, loginRes.payload)

  return {
    userId: user.userId,
    username: user.username,
    email: user.email,
    password,
    cookie: cookieHeader(loginRes),
  }
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ admin: boolean }} options
 * @returns {Promise<{ userId: string, username: string, email: string }>}
 */
async function createUser (app, options) {
  const id = randomUUID().slice(0, 8)
  const username = `admin_html_user_${Date.now()}_${id}`
  const email = `admin_html_${Date.now()}_${id}@example.com`
  const password = 'TestPassword123!'

  const userResults = await app.pg.query(
    `
      INSERT INTO users (
        username,
        email,
        password,
        email_confirmed,
        newsletter_subscription,
        admin
      ) VALUES (
        $1,
        $2,
        crypt($3, gen_salt('bf')),
        true,
        false,
        $4
      )
      RETURNING id
    `,
    [username, email, password, options.admin]
  )
  const userId = userResults.rows[0]?.id
  assert.strictEqual(typeof userId, 'string')

  return {
    userId,
    username,
    email,
  }
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
