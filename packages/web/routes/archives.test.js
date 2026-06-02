import { test, suite } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { createArchive } from '@breadcrum/resources/archives/archive-query-create.js'
import { build } from '../test/helper.js'

await suite('HTML archive routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('redirects anonymous archive visits to login with the current URL', async (t) => {
    const app = await build(t)
    const id = randomUUID()
    const res = await app.inject({
      url: `/archives/?bid=${id}`,
    })

    assert.strictEqual(res.statusCode, 302)

    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), `/archives/?bid=${id}`)
  })

  await test('renders the authenticated empty archives page', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/archives/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /<h1>Archives<\/h1>/)
      assert.match(res.payload, /Bookmark some articles\./)
      assert.doesNotMatch(res.payload, /\/archives\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders archive rows from the server query helper', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/archive-row-${randomUUID()}`,
        title: 'Archive parent bookmark',
      })
      const archiveId = await createReadyArchive(app, {
        userId: session.userId,
        bookmarkId,
        bookmarkTitle: 'Archive parent bookmark',
        title: 'Server-rendered archive',
        excerpt: 'Archive excerpt text.',
      })

      const res = await app.inject({
        url: '/archives/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /Server-rendered archive/)
      assert.match(res.payload, /Archive parent bookmark/)
      assert.match(res.payload, /Archive excerpt text\./)
      assert.match(res.payload, new RegExp(`href="/archives/view/\\?id=${archiveId}`))
      assert.match(res.payload, /method="post"\s+action="\/archives\/delete\/"/)
      assert.doesNotMatch(res.payload, /\/archives\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders only the main archives fragment for htmx requests', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/archives/',
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': 'bc-main',
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.doesNotMatch(res.payload, /<!DOCTYPE html>/)
      assert.match(res.payload, /<h1>Archives<\/h1>/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('redirects archive detail visits without an id', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/archives/view/',
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

  await test('renders the authenticated archive detail page with sanitized raw article content', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/archive-detail-${randomUUID()}`,
        title: 'Archive detail bookmark',
      })
      const archiveId = await createReadyArchive(app, {
        userId: session.userId,
        bookmarkId,
        bookmarkTitle: 'Archive detail bookmark',
        title: 'Archive detail page',
        htmlContent: '<article><h2>Stored article html</h2></article>',
      })

      const res = await app.inject({
        url: `/archives/view/?id=${archiveId}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200, res.payload)
      assert.match(res.payload, /Archive detail page/)
      assert.match(res.payload, /Archive detail bookmark/)
      assert.match(res.payload, /<h2>Stored article html<\/h2>/)
      assert.doesNotMatch(res.payload, /&lt;h2&gt;Stored article html/)
      assert.doesNotMatch(res.payload, /\/archives\/view\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders and saves the archive edit form', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/archive-edit-${randomUUID()}`,
        title: 'Archive edit bookmark',
      })
      const archiveId = await createReadyArchive(app, {
        userId: session.userId,
        bookmarkId,
        bookmarkTitle: 'Archive edit bookmark',
        title: 'Archive before edit',
      })

      const editRes = await app.inject({
        url: `/archives/view/?id=${archiveId}&edit=true`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(editRes.statusCode, 200, editRes.payload)
      assert.match(editRes.payload, /method="post"\s+action="\/archives\/view\/"/)
      assert.match(editRes.payload, /Save archive/)

      const saveRes = await app.inject({
        method: 'POST',
        url: '/archives/view/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          id: archiveId,
          title: 'Archive after edit',
        }).toString(),
      })

      assert.strictEqual(saveRes.statusCode, 302, saveRes.payload)
      assert.strictEqual(saveRes.headers['location'], `/archives/view/?id=${archiveId}`)

      const detailRes = await app.inject({
        url: `/archives/view/?id=${archiveId}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(detailRes.statusCode, 200)
      assert.match(detailRes.payload, /Archive after edit/)
      assert.doesNotMatch(detailRes.payload, /Archive before edit/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders polling markup and archive fragments for resolving archives', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/archive-resolving-${randomUUID()}`,
        title: 'Resolving archive bookmark',
      })
      const archiveId = await createResolvingArchive(app, {
        userId: session.userId,
        bookmarkId,
        bookmarkTitle: 'Resolving archive bookmark',
        title: 'Resolving archive',
      })

      const listRes = await app.inject({
        url: '/archives/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(listRes.statusCode, 200)
      assert.match(listRes.payload, /Resolving archive/)
      assert.match(listRes.payload, /hx-trigger="every 5s"/)
      assert.match(listRes.payload, /fragment=archive/)

      const fragmentRes = await app.inject({
        url: `/archives/view/?id=${archiveId}&fragment=archive&redirect=${encodeURIComponent('/archives/')}`,
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': `bc-archive-${archiveId}`,
        },
      })

      assert.strictEqual(fragmentRes.statusCode, 200)
      assert.doesNotMatch(fragmentRes.payload, /<!DOCTYPE html>/)
      assert.match(fragmentRes.payload, new RegExp(`id="bc-archive-${archiveId}"`))
      assert.match(fragmentRes.payload, /hx-trigger="every 5s"/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('deletes an archive from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/archive-delete-${randomUUID()}`,
        title: 'Archive delete bookmark',
      })
      const archiveId = await createReadyArchive(app, {
        userId: session.userId,
        bookmarkId,
        bookmarkTitle: 'Archive delete bookmark',
        title: 'Archive to delete',
      })

      const deleteRes = await app.inject({
        method: 'POST',
        url: '/archives/delete/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': `bc-archive-${archiveId}`,
        },
        payload: new URLSearchParams({
          id: archiveId,
          redirect: '/archives/',
        }).toString(),
      })

      assert.strictEqual(deleteRes.statusCode, 200, deleteRes.payload)
      assert.strictEqual(deleteRes.payload, '')

      const listRes = await app.inject({
        url: '/archives/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(listRes.statusCode, 200)
      assert.doesNotMatch(listRes.payload, /Archive to delete/)
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
  const username = `archives_user_${Date.now()}_${id}`
  const email = `archives_${Date.now()}_${id}@example.com`
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
 * @param {string} params.bookmarkTitle
 * @param {string} params.title
 * @param {string} [params.excerpt]
 * @param {string} [params.htmlContent]
 * @returns {Promise<string>}
 */
async function createReadyArchive (app, params) {
  const archive = await createArchive({
    client: app.pg,
    userId: params.userId,
    bookmarkId: params.bookmarkId,
    bookmarkTitle: params.bookmarkTitle,
    extractionMethod: 'server',
    url: `https://article.example.com/${randomUUID()}`,
  })

  await app.pg.query(
    `
      update archives
      set done = true,
          title = $2,
          excerpt = $3,
          html_content = $4,
          text_content = $5,
          site_name = 'Article Example',
          byline = 'Test Author',
          language = 'en',
          direction = 'ltr'
      where id = $1
    `,
    [
      archive.id,
      params.title,
      params.excerpt ?? null,
      params.htmlContent ?? null,
      params.htmlContent ? null : 'Archive text content.',
    ]
  )

  return archive.id
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.bookmarkId
 * @param {string} params.bookmarkTitle
 * @param {string} params.title
 * @returns {Promise<string>}
 */
async function createResolvingArchive (app, params) {
  const archive = await createArchive({
    client: app.pg,
    userId: params.userId,
    bookmarkId: params.bookmarkId,
    bookmarkTitle: params.bookmarkTitle,
    extractionMethod: 'server',
    url: `https://article.example.com/${randomUUID()}`,
  })

  await app.pg.query(
    'update archives set done = false, title = $2 where id = $1',
    [archive.id, params.title]
  )

  return archive.id
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
