import { test, suite } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { build } from '../test/helper.js'
import '../scripts/build-assets.js'

await suite('HTML root route', { concurrency: false, timeout: 30000 }, async () => {
  await test('renders the Fastify fragtml home page', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /text\/html/)
    assert.match(res.payload, /<!DOCTYPE html>/)
    assert.match(res.payload, /<main id="bc-main" class="bc-main" tabindex="-1" hx-history-elt>/)
    assert.match(res.payload, /<h1 class="bc-marking-hero-title">Breadcrum<\/h1>/)
    assert.match(res.payload, /\/assets\/htmx\.min\.js/)
  })

  await test('renders anonymous shell navigation without a session cookie', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.payload, /href="\/login\/"/)
    assert.match(res.payload, /href="\/register\/"/)
    assert.doesNotMatch(res.payload, /href="\/bookmarks\/"/)
  })

  await test('renders authenticated shell navigation from the session cookie', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, new RegExp(`href="\\/account\\/">${session.username}<\\/a>`))
      assert.match(res.payload, /href="\/bookmarks\/"/)
      assert.match(res.payload, /href="\/tags\/"/)
      assert.match(res.payload, /href="\/feeds\/"/)
      assert.match(res.payload, /method="post" action="\/logout\/"/)
      assert.doesNotMatch(res.payload, /href="\/login\/"/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders only the main fragment for htmx requests', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/',
      headers: {
        'hx-request': 'true',
        'hx-target': 'bc-main',
      },
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /text\/html/)
    assert.doesNotMatch(res.payload, /<!DOCTYPE html>/)
    assert.match(res.payload, /<h1 class="bc-marking-hero-title">Breadcrum<\/h1>/)
  })

  await test('serves htmx from public assets', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/assets/htmx.min.js',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /javascript/)
    assert.match(res.payload, /htmx/)
  })

  await test('serves app CSS from public assets', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/assets/app.css',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /text\/css/)
    assert.match(res.payload, /\.bc-page-container/)
  })

  await test('serves app JS from public assets', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/assets/app.js',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /javascript/)
    assert.match(res.payload, /restoreSwapFocus/)
  })

  await test('serves passkey login browser asset', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/assets/passkey-login.js',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /javascript/)
    assert.match(res.payload, /data-bc-passkey-login/)
  })

  await test('serves passkey registration browser asset', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/assets/passkey-register.js',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /javascript/)
    assert.match(res.payload, /data-bc-passkey-register/)
  })

  await test('serves WebAuthn browser module asset', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/assets/webauthn.min.js',
    })

    assert.strictEqual(res.statusCode, 200)
    assert.match(res.headers['content-type'] ?? '', /javascript/)
    assert.match(res.payload, /passwordless-id\/webauthn/)
  })
})

/**
 * @param {import('fastify').FastifyInstance} app
 * @returns {Promise<{ userId: string, username: string, cookie: string }>}
 */
async function createRegisteredSession (app) {
  const id = randomUUID().slice(0, 8)
  const username = `html_user_${Date.now()}_${id}`
  const email = `html_${Date.now()}_${id}@example.com`
  const registerRes = await app.inject({
    method: 'POST',
    url: '/api/register',
    payload: {
      username,
      email,
      password: 'TestPassword123!',
      newsletter_subscription: false,
    },
  })

  assert.strictEqual(registerRes.statusCode, 201, registerRes.payload)

  const registerBody = JSON.parse(registerRes.payload)
  const userId = registerBody.user.id

  return {
    userId,
    username,
    cookie: cookieHeader(registerRes),
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
