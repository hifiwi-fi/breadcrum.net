import { test, suite } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { build } from '../test/helper.js'

await suite('HTML bookmark routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('redirects anonymous bookmark visits to login with the current URL', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/bookmarks/?tag=work',
    })

    assert.strictEqual(res.statusCode, 302)

    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), '/bookmarks/?tag=work')
  })

  await test('renders the authenticated empty bookmarks page', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/bookmarks/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /<h1>Bookmarks<\/h1>/)
      assert.match(res.payload, /method="get" action="\/bookmarks\/add\/"/)
      assert.match(res.payload, /Add your first bookmark\./)
      assert.doesNotMatch(res.payload, /\/bookmarks\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders bookmark rows from the server query helper', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const bookmark = {
      url: `https://example.com/${randomUUID()}`,
      title: 'Server-rendered bookmark',
      note: 'A bookmark rendered by Fastify.',
      tags: ['server-rendered'],
    }

    try {
      await createBookmark(app, session.cookie, bookmark)

      const res = await app.inject({
        url: '/bookmarks/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /Server-rendered bookmark/)
      assert.match(res.payload, /A bookmark rendered by Fastify\./)
      assert.match(res.payload, /server-rendered/)
      assert.match(res.payload, /href="\/bookmarks\/view\/\?id=/)
      assert.match(res.payload, /method="post"\s+action="\/bookmarks\/toggle\/"/)
      assert.match(res.payload, /method="post"\s+action="\/bookmarks\/delete\/"/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders only the main bookmarks fragment for htmx requests', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/bookmarks/',
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': 'bc-main',
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.doesNotMatch(res.payload, /<!DOCTYPE html>/)
      assert.match(res.payload, /<h1>Bookmarks<\/h1>/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders bookmark pagination links', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      await createBookmark(app, session.cookie, {
        url: `https://example.com/${randomUUID()}`,
        title: 'First paginated bookmark',
      })
      await createBookmark(app, session.cookie, {
        url: `https://example.com/${randomUUID()}`,
        title: 'Second paginated bookmark',
      })

      const res = await app.inject({
        url: '/bookmarks/?per_page=1',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /class="pagination-button" href="\/bookmarks\/\?per_page=1&amp;before=/)
      assert.match(res.payload, /Second paginated bookmark|First paginated bookmark/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('redirects anonymous bookmark submit visits to login', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/bookmarks/submit/',
    })

    assert.strictEqual(res.statusCode, 302)

    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), '/bookmarks/submit/')
  })

  await test('renders the authenticated bookmark submit page', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/bookmarks/submit/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /<h1>Submit a bookmark<\/h1>/)
      assert.match(res.payload, /method="get" action="\/bookmarks\/add\/"/)
      assert.doesNotMatch(res.payload, /\/bookmarks\/submit\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('redirects anonymous bookmark add visits to login', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/bookmarks/add/?url=https%3A%2F%2Fexample.com%2Fadd',
    })

    assert.strictEqual(res.statusCode, 302)

    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), '/bookmarks/add/?url=https%3A%2F%2Fexample.com%2Fadd')
  })

  await test('renders the authenticated bookmark add page with query values', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const url = 'https://example.com/prefilled'

    try {
      const res = await app.inject({
        url: `/bookmarks/add/?url=${encodeURIComponent(url)}&title=Prefilled&tags=alpha&tags=beta`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /<h1>Add bookmark<\/h1>/)
      assert.match(res.payload, /method="post" action="\/bookmarks\/add\/"/)
      assert.match(res.payload, /value="https:\/\/example\.com\/prefilled"/)
      assert.match(res.payload, /value="Prefilled"/)
      assert.match(res.payload, /value="alpha beta"/)
      assert.doesNotMatch(res.payload, /\/bookmarks\/add\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('creates a bookmark from the add form', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const url = `https://example.com/add-${randomUUID()}`

    try {
      const res = await app.inject({
        method: 'POST',
        url: '/bookmarks/add/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          url,
          title: 'Added from HTML',
          note: 'Created by the add form.',
          tags: 'html add',
          toread: 'true',
          normalize: 'true',
        }).toString(),
      })

      assert.strictEqual(res.statusCode, 302, res.payload)
      assert.match(String(res.headers['location']), /^\/bookmarks\/view\/\?id=/)

      const listRes = await app.inject({
        url: '/bookmarks/?toread=true',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(listRes.statusCode, 200)
      assert.match(listRes.payload, /Added from HTML/)
      assert.match(listRes.payload, /Created by the add form\./)
      assert.match(listRes.payload, />html</)
      assert.match(listRes.payload, />add</)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('redirects anonymous bookmark detail visits to login', async (t) => {
    const app = await build(t)
    const id = randomUUID()
    const res = await app.inject({
      url: `/bookmarks/view/?id=${id}`,
    })

    assert.strictEqual(res.statusCode, 302)

    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), `/bookmarks/view/?id=${id}`)
  })

  await test('redirects bookmark detail visits without an id', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/bookmarks/view/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 302)
      assert.strictEqual(res.headers['location'], '/bookmarks/')
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders the authenticated bookmark detail page', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/detail-${randomUUID()}`,
        title: 'Bookmark detail page',
        note: 'Rendered from the detail route.',
      })

      const res = await app.inject({
        url: `/bookmarks/view/?id=${bookmarkId}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /Bookmark detail page/)
      assert.match(res.payload, /Rendered from the detail route\./)
      assert.match(res.payload, /method="get" action="\/search\/bookmarks\/"/)
      assert.doesNotMatch(res.payload, /\/bookmarks\/view\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders the authenticated bookmark edit form', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/edit-${randomUUID()}`,
        title: 'Bookmark edit form',
        note: 'Ready to edit.',
        tags: ['edit-tag'],
      })

      const res = await app.inject({
        url: `/bookmarks/view/?id=${bookmarkId}&edit=true`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /method="post"\s+action="\/bookmarks\/view\/"/)
      assert.match(res.payload, new RegExp(`name="id" value="${bookmarkId}"`))
      assert.match(res.payload, /value="Bookmark edit form"/)
      assert.match(res.payload, />Ready to edit\.</)
      assert.match(res.payload, /value="edit-tag"/)
      assert.match(res.payload, /Save changes/)
      assert.doesNotMatch(res.payload, /\/bookmarks\/view\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('saves bookmark edits from the HTML detail route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/edit-save-${randomUUID()}`,
        title: 'Bookmark before edit',
        note: 'Old note.',
        tags: ['old-tag'],
      })
      const updatedUrl = `https://example.com/updated-${randomUUID()}`
      const archiveUrl = `https://archive.example.com/${randomUUID()}`

      const saveRes = await app.inject({
        method: 'POST',
        url: '/bookmarks/view/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          id: bookmarkId,
          url: updatedUrl,
          title: 'Bookmark after edit',
          note: 'New note from the edit form.',
          summary: 'New summary from the edit form.',
          tags: 'edited new-tag',
          archiveUrls: archiveUrl,
          toread: 'true',
          starred: 'true',
        }).toString(),
      })

      assert.strictEqual(saveRes.statusCode, 302, saveRes.payload)
      assert.strictEqual(saveRes.headers['location'], `/bookmarks/view/?id=${bookmarkId}`)

      const detailRes = await app.inject({
        url: `/bookmarks/view/?id=${bookmarkId}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(detailRes.statusCode, 200)
      assert.match(detailRes.payload, /Bookmark after edit/)
      assert.match(detailRes.payload, /New note from the edit form\./)
      assert.match(detailRes.payload, /New summary from the edit form\./)
      assert.match(detailRes.payload, />edited</)
      assert.match(detailRes.payload, />new-tag</)
      assert.match(detailRes.payload, /archive\.example\.com/)
      assert.match(detailRes.payload, /bc-bookmark-state-active[^>]*>To read</)
      assert.match(detailRes.payload, /bc-bookmark-state-active[^>]*>Starred</)
      assert.doesNotMatch(detailRes.payload, /Old note\./)
      assert.doesNotMatch(detailRes.payload, />old-tag</)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('returns an updated bookmark fragment for htmx edit saves', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/edit-fragment-${randomUUID()}`,
        title: 'Bookmark before htmx edit',
        note: 'Old htmx note.',
      })

      const saveRes = await app.inject({
        method: 'POST',
        url: '/bookmarks/view/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': `bc-bookmark-${bookmarkId}`,
        },
        payload: new URLSearchParams({
          id: bookmarkId,
          url: `https://example.com/fragment-updated-${randomUUID()}`,
          title: 'Bookmark after htmx edit',
          note: 'New htmx note.',
          summary: '',
          tags: 'fragment-save',
        }).toString(),
      })

      assert.strictEqual(saveRes.statusCode, 200, saveRes.payload)
      assert.strictEqual(saveRes.headers['hx-redirect'], undefined)
      assert.doesNotMatch(saveRes.payload, /<!DOCTYPE html>/)
      assert.match(saveRes.payload, new RegExp(`id="bc-bookmark-${bookmarkId}"`))
      assert.match(saveRes.payload, /Bookmark after htmx edit/)
      assert.match(saveRes.payload, /New htmx note\./)
      assert.match(saveRes.payload, />fragment-save</)
      assert.doesNotMatch(saveRes.payload, /Bookmark before htmx edit/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders only the main bookmark detail fragment for htmx requests', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/detail-fragment-${randomUUID()}`,
        title: 'Bookmark detail fragment',
      })

      const res = await app.inject({
        url: `/bookmarks/view/?id=${bookmarkId}`,
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': 'bc-main',
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.doesNotMatch(res.payload, /<!DOCTYPE html>/)
      assert.match(res.payload, /Bookmark detail fragment/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders polling markup and bookmark fragments for resolving bookmarks', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/resolving-${randomUUID()}`,
        title: 'Resolving bookmark',
      })
      await app.pg.query('UPDATE bookmarks SET done = false WHERE id = $1', [bookmarkId])

      const detailRes = await app.inject({
        url: `/bookmarks/view/?id=${bookmarkId}`,
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(detailRes.statusCode, 200)
      assert.match(detailRes.payload, /Resolving bookmark/)
      assert.match(detailRes.payload, /hx-trigger="every 5s"/)
      assert.match(detailRes.payload, /fragment=bookmark/)
      assert.match(detailRes.payload, />Resolving</)

      const fragmentRes = await app.inject({
        url: `/bookmarks/view/?id=${bookmarkId}&fragment=bookmark&redirect=${encodeURIComponent('/bookmarks/')}`,
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': `bc-bookmark-${bookmarkId}`,
        },
      })

      assert.strictEqual(fragmentRes.statusCode, 200)
      assert.doesNotMatch(fragmentRes.payload, /<!DOCTYPE html>/)
      assert.match(fragmentRes.payload, new RegExp(`id="bc-bookmark-${bookmarkId}"`))
      assert.match(fragmentRes.payload, /Resolving bookmark/)
      assert.match(fragmentRes.payload, /hx-trigger="every 5s"/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('toggles a bookmark field from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/toggle-${randomUUID()}`,
        title: 'Toggle bookmark',
      })

      const toggleRes = await app.inject({
        method: 'POST',
        url: '/bookmarks/toggle/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          id: bookmarkId,
          field: 'toread',
          redirect: '/bookmarks/?toread=true',
        }).toString(),
      })

      assert.strictEqual(toggleRes.statusCode, 302)
      assert.strictEqual(toggleRes.headers['location'], '/bookmarks/?toread=true')

      const listRes = await app.inject({
        url: '/bookmarks/?toread=true',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(listRes.statusCode, 200)
      assert.match(listRes.payload, /Toggle bookmark/)
      assert.match(listRes.payload, /bc-bookmark-state-active[^>]*>To read</)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('returns an updated bookmark fragment for htmx toggle actions', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/toggle-fragment-${randomUUID()}`,
        title: 'Toggle bookmark fragment',
      })

      const toggleRes = await app.inject({
        method: 'POST',
        url: '/bookmarks/toggle/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': `bc-bookmark-${bookmarkId}`,
        },
        payload: new URLSearchParams({
          id: bookmarkId,
          field: 'starred',
          redirect: '/bookmarks/',
        }).toString(),
      })

      assert.strictEqual(toggleRes.statusCode, 200)
      assert.strictEqual(toggleRes.headers['hx-redirect'], undefined)
      assert.doesNotMatch(toggleRes.payload, /<!DOCTYPE html>/)
      assert.match(toggleRes.payload, new RegExp(`id="bc-bookmark-${bookmarkId}"`))
      assert.match(toggleRes.payload, /Toggle bookmark fragment/)
      assert.match(toggleRes.payload, /bc-bookmark-state-active[^>]*>Starred</)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('deletes a bookmark from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/delete-${randomUUID()}`,
        title: 'Delete bookmark',
      })

      const deleteRes = await app.inject({
        method: 'POST',
        url: '/bookmarks/delete/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          id: bookmarkId,
          redirect: '/bookmarks/',
        }).toString(),
      })

      assert.strictEqual(deleteRes.statusCode, 302)
      assert.strictEqual(deleteRes.headers['location'], '/bookmarks/')

      const listRes = await app.inject({
        url: '/bookmarks/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(listRes.statusCode, 200)
      assert.doesNotMatch(listRes.payload, /Delete bookmark/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('returns an empty fragment for htmx delete actions', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const bookmarkId = await createBookmark(app, session.cookie, {
        url: `https://example.com/delete-fragment-${randomUUID()}`,
        title: 'Delete bookmark fragment',
      })

      const deleteRes = await app.inject({
        method: 'POST',
        url: '/bookmarks/delete/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': `bc-bookmark-${bookmarkId}`,
        },
        payload: new URLSearchParams({
          id: bookmarkId,
          redirect: '/bookmarks/',
        }).toString(),
      })

      assert.strictEqual(deleteRes.statusCode, 200)
      assert.strictEqual(deleteRes.payload, '')

      const listRes = await app.inject({
        url: '/bookmarks/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(listRes.statusCode, 200)
      assert.doesNotMatch(listRes.payload, /Delete bookmark fragment/)
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
  const username = `bookmarks_user_${Date.now()}_${id}`
  const email = `bookmarks_${Date.now()}_${id}@example.com`
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
