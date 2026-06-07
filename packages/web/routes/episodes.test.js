import { test, suite } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { createEpisode } from '@breadcrum/resources/episodes/episode-query-create.js'
import { build } from '../test/helper.js'

await suite('HTML episode routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('redirects anonymous episode visits to login with the current URL', async (t) => {
    const app = await build(t)
    const id = randomUUID()
    const res = await app.inject({
      url: `/episodes/?bid=${id}`,
    })

    assert.strictEqual(res.statusCode, 302)

    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), `/episodes/?bid=${id}`)
  })

  await test('renders the authenticated empty episodes page', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/episodes/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /<h1>Episodes<\/h1>/)
      assert.match(res.payload, /Bookmark some media\./)
      assert.doesNotMatch(res.payload, /\/episodes\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders episode rows from the server query helper', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/episode-row-${randomUUID()}`,
        title: 'Episode parent bookmark',
      })
      const episodeId = await createReadyEpisode(app, {
        userId: session.userId,
        bookmarkId,
        title: 'Server-rendered episode',
        textContent: 'Episode transcript text.',
      })

      const res = await app.inject({
        url: '/episodes/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /Server-rendered episode/)
      assert.match(res.payload, /Episode parent bookmark/)
      assert.match(res.payload, new RegExp(`href="/episodes/view/\\?id=${episodeId}`))
      assert.match(res.payload, /method="post"\s+action="\/episodes\/delete\/"/)
      assert.doesNotMatch(res.payload, /\/episodes\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders only the main episodes fragment for htmx requests', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/episodes/',
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': 'bc-main',
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.doesNotMatch(res.payload, /<!DOCTYPE html>/)
      assert.match(res.payload, /<h1>Episodes<\/h1>/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('redirects episode detail visits without an id', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/episodes/view/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 302)
      assert.strictEqual(res.headers['location'], '/episodes/')
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders the authenticated episode detail page with deferred embed markup', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/episode-detail-${randomUUID()}`,
        title: 'Episode detail bookmark',
      })
      const episodeId = await createReadyEpisode(app, {
        userId: session.userId,
        bookmarkId,
        url: `https://media.example.com/${randomUUID()}`,
        title: 'Episode detail page',
        embedHtml: '<iframe src="https://media.example.com/embed"></iframe>',
      })

      const res = await app.inject({
        url: `/episodes/view/?id=${episodeId}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /Episode detail page/)
      assert.match(res.payload, /Episode detail bookmark/)
      assert.match(res.payload, /data-bc-embed-template/)
      assert.match(res.payload, /<iframe credentialless src="https:\/\/media\.example\.com\/embed"><\/iframe>/)
      assert.doesNotMatch(res.payload, /\/episodes\/view\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders and saves the episode edit form', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/episode-edit-${randomUUID()}`,
        title: 'Episode edit bookmark',
      })
      const episodeId = await createReadyEpisode(app, {
        userId: session.userId,
        bookmarkId,
        title: 'Episode before edit',
      })

      const editRes = await app.inject({
        url: `/episodes/view/?id=${episodeId}&edit=true`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(editRes.statusCode, 200, editRes.payload)
      assert.match(editRes.payload, /method="post"\s+action="\/episodes\/view\/"/)
      assert.match(editRes.payload, /Save episode/)

      const saveRes = await app.inject({
        method: 'POST',
        url: '/episodes/view/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          id: episodeId,
          title: 'Episode after edit',
          explicit: 'true',
        }).toString(),
      })

      assert.strictEqual(saveRes.statusCode, 302, saveRes.payload)
      assert.strictEqual(saveRes.headers['location'], `/episodes/view/?id=${episodeId}`)

      const detailRes = await app.inject({
        url: `/episodes/view/?id=${episodeId}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(detailRes.statusCode, 200)
      assert.match(detailRes.payload, /Episode after edit/)
      assert.match(detailRes.payload, />Explicit</)
      assert.doesNotMatch(detailRes.payload, /Episode before edit/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders polling markup and episode fragments for resolving episodes', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/episode-resolving-${randomUUID()}`,
        title: 'Resolving episode bookmark',
      })
      const episodeId = await createResolvingEpisode(app, {
        userId: session.userId,
        bookmarkId,
        title: 'Resolving episode',
      })

      const listRes = await app.inject({
        url: '/episodes/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(listRes.statusCode, 200)
      assert.match(listRes.payload, /Resolving episode/)
      assert.match(listRes.payload, /hx-trigger="every 5s"/)
      assert.match(listRes.payload, /fragment=episode/)

      const fragmentRes = await app.inject({
        url: `/episodes/view/?id=${episodeId}&fragment=episode&redirect=${encodeURIComponent('/episodes/')}`,
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': `bc-episode-${episodeId}`,
        },
      })

      assert.strictEqual(fragmentRes.statusCode, 200)
      assert.doesNotMatch(fragmentRes.payload, /<!DOCTYPE html>/)
      assert.match(fragmentRes.payload, new RegExp(`id="bc-episode-${episodeId}"`))
      assert.match(fragmentRes.payload, /hx-trigger="every 5s"/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('deletes an episode from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/episode-delete-${randomUUID()}`,
        title: 'Episode delete bookmark',
      })
      const episodeId = await createReadyEpisode(app, {
        userId: session.userId,
        bookmarkId,
        title: 'Episode to delete',
      })

      const deleteRes = await app.inject({
        method: 'POST',
        url: '/episodes/delete/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': `bc-episode-${episodeId}`,
        },
        payload: new URLSearchParams({
          id: episodeId,
          redirect: '/episodes/',
        }).toString(),
      })

      assert.strictEqual(deleteRes.statusCode, 200, deleteRes.payload)
      assert.strictEqual(deleteRes.payload, '')

      const listRes = await app.inject({
        url: '/episodes/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(listRes.statusCode, 200)
      assert.doesNotMatch(listRes.payload, /Episode to delete/)
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
  const username = `episodes_user_${Date.now()}_${id}`
  const email = `episodes_${Date.now()}_${id}@example.com`
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
 * @param {{ url: string, title: string }} bookmark
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
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.bookmarkId
 * @param {string} params.title
 * @param {string} [params.url]
 * @param {string} [params.textContent]
 * @param {string} [params.embedHtml]
 * @returns {Promise<string>}
 */
async function createReadyEpisode (app, params) {
  const episode = await createEpisode({
    client: app.pg,
    userId: params.userId,
    bookmarkId: params.bookmarkId,
    type: 'redirect',
    medium: 'video',
    url: params.url ?? `https://media.example.com/${randomUUID()}.mp4`,
  })

  await app.pg.query(
    `
      update episodes
      set done = true,
          title = $2,
          text_content = $3,
          src_type = 'video',
          ext = 'mp4',
          filename = 'episode.mp4',
          mime_type = 'video/mp4',
          duration_in_seconds = 90,
          oembed = $4::jsonb
      where id = $1
    `,
    [
      episode.id,
      params.title,
      params.textContent ?? null,
      params.embedHtml
        ? JSON.stringify({
          html: params.embedHtml,
          provider_name: 'Example',
          provider_url: 'https://media.example.com',
          width: 640,
          height: 360,
        })
        : null,
    ]
  )

  return episode.id
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.bookmarkId
 * @param {string} params.title
 * @returns {Promise<string>}
 */
async function createResolvingEpisode (app, params) {
  const episode = await createEpisode({
    client: app.pg,
    userId: params.userId,
    bookmarkId: params.bookmarkId,
    type: 'redirect',
    medium: 'video',
    url: `https://media.example.com/${randomUUID()}.mp4`,
  })

  await app.pg.query(
    'update episodes set done = false, title = $2 where id = $1',
    [episode.id, params.title]
  )

  return episode.id
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
