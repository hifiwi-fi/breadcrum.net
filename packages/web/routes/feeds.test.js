import { test, suite } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { build } from '../test/helper.js'

await suite('HTML feed routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('redirects anonymous feed visits to login with the current URL', async (t) => {
    const app = await build(t)
    const id = randomUUID()
    const res = await app.inject({
      url: `/feeds/?feed_id=${id}`,
    })

    assert.strictEqual(res.statusCode, 302)

    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), `/feeds/?feed_id=${id}`)
  })

  await test('renders the authenticated default feed details page', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/feeds/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /<h1>Feeds<\/h1>/)
      assert.match(res.payload, /breadcrum\.net/)
      assert.match(res.payload, />Default</)
      assert.match(res.payload, /\/api\/feeds\/[^"]+\?format=json/)
      assert.match(res.payload, /\/api\/feeds\/[^"]+\?format=rss/)
      assert.match(res.payload, new RegExp(`${session.userId}:[^@"]+@`))
      assert.doesNotMatch(res.payload, /\/feeds\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders the feed edit form', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      await app.inject({
        url: '/feeds/',
        headers: {
          cookie: session.cookie,
        },
      })
      const feedId = await getDefaultFeedId(app, session.userId)
      const res = await app.inject({
        url: `/feeds/?feed_id=${feedId}&edit=true`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /method="post" action="\/feeds\/update\/"/)
      assert.match(res.payload, new RegExp(`name="id" value="${feedId}"`))
      assert.match(res.payload, /Save feed/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('updates feed metadata from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const title = `Updated feed ${randomUUID().slice(0, 8)}`

    try {
      await app.inject({
        url: '/feeds/',
        headers: {
          cookie: session.cookie,
        },
      })
      const feedId = await getDefaultFeedId(app, session.userId)

      const updateRes = await app.inject({
        method: 'POST',
        url: '/feeds/update/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          id: feedId,
          title,
          description: 'Updated feed description.',
          explicit: 'true',
        }).toString(),
      })

      assert.strictEqual(updateRes.statusCode, 302, updateRes.payload)
      assert.strictEqual(updateRes.headers['location'], `/feeds/?feed_id=${feedId}`)

      const res = await app.inject({
        url: `/feeds/?feed_id=${feedId}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, new RegExp(title))
      assert.match(res.payload, /Updated feed description\./)
      assert.match(res.payload, />Explicit</)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders only the main feeds fragment for htmx requests', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/feeds/',
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': 'bc-main',
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.doesNotMatch(res.payload, /<!DOCTYPE html>/)
      assert.match(res.payload, /<h1>Feeds<\/h1>/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })
})

/**
 * @param {import('fastify').FastifyInstance} app
 * @returns {Promise<{ userId: string, username: string, email: string, cookie: string }>}
 */
async function createRegisteredSession (app) {
  const id = randomUUID().slice(0, 8)
  const username = `feeds_user_${Date.now()}_${id}`
  const email = `feeds_${Date.now()}_${id}@example.com`
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
    cookie: cookieHeader(loginRes),
  }
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getDefaultFeedId (app, userId) {
  const results = await app.pg.query('SELECT default_podcast_feed_id FROM users WHERE id = $1', [userId])
  const feedId = results.rows[0]?.default_podcast_feed_id
  assert.strictEqual(typeof feedId, 'string')
  return feedId
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
