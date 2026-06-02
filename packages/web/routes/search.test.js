import { test, suite } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { build } from '../test/helper.js'

await suite('HTML search routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('redirects anonymous search visits to login with the current URL', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/search/bookmarks/?query=needle',
    })

    assert.strictEqual(res.statusCode, 302)

    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), '/search/bookmarks/?query=needle')
  })

  await test('renders the authenticated search index', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/search/?query=needle',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /<h1>Search<\/h1>/)
      assert.match(res.payload, /method="get" action="\/search\/bookmarks\/"/)
      assert.match(res.payload, /href="\/search\/bookmarks\/\?query=needle"/)
      assert.match(res.payload, /href="\/search\/archives\/\?query=needle"/)
      assert.match(res.payload, /href="\/search\/episodes\/\?query=needle"/)
      assert.doesNotMatch(res.payload, /\/search\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders the bookmark search empty prompt without a query', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/search/bookmarks/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /<h1>Bookmark Search<\/h1>/)
      assert.match(res.payload, /Search for bookmarks\./)
      assert.doesNotMatch(res.payload, /\/search\/bookmarks\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders bookmark search results from the API query helper', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const uniqueNeedle = `needle-${randomUUID()}`

    try {
      await createBookmark(app, session.cookie, {
        url: `https://example.com/search-${randomUUID()}`,
        title: `Search result ${uniqueNeedle}`,
        note: 'Rendered by the Fastify search route.',
        tags: ['search-tag'],
      })

      const res = await app.inject({
        url: `/search/bookmarks/?query=${encodeURIComponent(uniqueNeedle)}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /Search result/)
      assert.match(res.payload, /Rendered by the Fastify search route\./)
      assert.match(res.payload, />search-tag</)
      assert.match(res.payload, /method="post"\s+action="\/bookmarks\/toggle\/"/)
      assert.doesNotMatch(res.payload, /No bookmarks found\./)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders only the main bookmark search fragment for htmx requests', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/search/bookmarks/',
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': 'bc-main',
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.doesNotMatch(res.payload, /<!DOCTYPE html>/)
      assert.match(res.payload, /<h1>Bookmark Search<\/h1>/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders archive and episode search empty prompts', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const archiveRes = await app.inject({
        url: '/search/archives/',
        headers: {
          cookie: session.cookie,
        },
      })
      const episodeRes = await app.inject({
        url: '/search/episodes/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(archiveRes.statusCode, 200)
      assert.match(archiveRes.payload, /<h1>Archive Search<\/h1>/)
      assert.match(archiveRes.payload, /Search for archives\./)
      assert.doesNotMatch(archiveRes.payload, /\/search\/archives\/client-/)

      assert.strictEqual(episodeRes.statusCode, 200)
      assert.match(episodeRes.payload, /<h1>Episode Search<\/h1>/)
      assert.match(episodeRes.payload, /Search for episodes\./)
      assert.doesNotMatch(episodeRes.payload, /\/search\/episodes\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders archive and episode search main fragments for htmx requests', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const archiveRes = await app.inject({
        url: '/search/archives/',
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': 'bc-main',
        },
      })
      const episodeRes = await app.inject({
        url: '/search/episodes/',
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': 'bc-main',
        },
      })

      assert.strictEqual(archiveRes.statusCode, 200)
      assert.doesNotMatch(archiveRes.payload, /<!DOCTYPE html>/)
      assert.match(archiveRes.payload, /<h1>Archive Search<\/h1>/)

      assert.strictEqual(episodeRes.statusCode, 200)
      assert.doesNotMatch(episodeRes.payload, /<!DOCTYPE html>/)
      assert.match(episodeRes.payload, /<h1>Episode Search<\/h1>/)
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
  const username = `search_user_${Date.now()}_${id}`
  const email = `search_${Date.now()}_${id}@example.com`
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
 * @param {string} cookie
 * @param {{ url: string, title: string, note?: string, tags?: string[] }} bookmark
 * @returns {Promise<string>}
 */
async function createBookmark (app, cookie, bookmark) {
  const res = await app.inject({
    method: 'PUT',
    url: '/api/bookmarks/?meta=false&episode=false&archive=false&normalize=false',
    headers: {
      cookie,
    },
    payload: bookmark,
  })

  assert.strictEqual(res.statusCode, 201, res.payload)
  const body = JSON.parse(res.payload)
  const id = body?.data?.id
  assert.strictEqual(typeof id, 'string')
  return id
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function deleteRegisteredSession (app, userId) {
  await app.pg.query('DELETE FROM bookmarks WHERE owner_id = $1', [userId])
  await app.pg.query('DELETE FROM tags WHERE owner_id = $1', [userId])
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
