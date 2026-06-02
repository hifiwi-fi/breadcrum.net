import { test, suite } from 'node:test'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { build } from '../test/helper.js'

await suite('HTML tag routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('redirects anonymous tag visits to login with the current URL', async (t) => {
    const app = await build(t)
    const res = await app.inject({
      url: '/tags/?sensitive=true',
    })

    assert.strictEqual(res.statusCode, 302)

    const location = new URL(String(res.headers['location']), 'https://breadcrum.invalid')
    assert.strictEqual(location.pathname, '/login/')
    assert.strictEqual(location.searchParams.get('redirect'), '/tags/?sensitive=true')
  })

  await test('renders the authenticated empty tags page', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/tags/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, /<h1>Tags<\/h1>/)
      assert.match(res.payload, /Tag some bookmarks!/)
      assert.doesNotMatch(res.payload, /\/tags\/client-/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders tag links and action forms', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const tag = `tag-${randomUUID().slice(0, 8)}`

    try {
      await createBookmark(app, session.cookie, {
        url: `https://example.com/tags-${randomUUID()}`,
        title: 'Tagged bookmark',
        tags: [tag],
      })

      const res = await app.inject({
        url: '/tags/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, new RegExp(`href="/bookmarks/\\?tag=${tag}"`))
      assert.match(res.payload, new RegExp(`${tag}<sup>1</sup>`))
      assert.match(res.payload, /method="post" action="\/tags\/rename\/"/)
      assert.match(res.payload, /method="post" action="\/tags\/merge\/"/)
      assert.match(res.payload, /method="post" action="\/tags\/delete\/"/)
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renames a tag from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const oldTag = `old-${randomUUID().slice(0, 8)}`
    const newTag = `new-${randomUUID().slice(0, 8)}`

    try {
      await createBookmark(app, session.cookie, {
        url: `https://example.com/rename-${randomUUID()}`,
        title: 'Rename tag bookmark',
        tags: [oldTag],
      })

      const renameRes = await app.inject({
        method: 'POST',
        url: '/tags/rename/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          old: oldTag,
          new: newTag,
          redirect: '/tags/',
        }).toString(),
      })

      assert.strictEqual(renameRes.statusCode, 302, renameRes.payload)
      assert.strictEqual(renameRes.headers['location'], '/tags/')

      const res = await app.inject({
        url: '/tags/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, new RegExp(`${newTag}<sup>1</sup>`))
      assert.doesNotMatch(res.payload, new RegExp(`${oldTag}<sup>`))
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('merges tags from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const sourceTag = `source-${randomUUID().slice(0, 8)}`
    const targetTag = `target-${randomUUID().slice(0, 8)}`

    try {
      await createBookmark(app, session.cookie, {
        url: `https://example.com/source-${randomUUID()}`,
        title: 'Source tag bookmark',
        tags: [sourceTag],
      })
      await createBookmark(app, session.cookie, {
        url: `https://example.com/target-${randomUUID()}`,
        title: 'Target tag bookmark',
        tags: [targetTag],
      })

      const mergeRes = await app.inject({
        method: 'POST',
        url: '/tags/merge/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          source: sourceTag,
          target: targetTag,
          redirect: '/tags/',
        }).toString(),
      })

      assert.strictEqual(mergeRes.statusCode, 302, mergeRes.payload)
      assert.strictEqual(mergeRes.headers['location'], '/tags/')

      const res = await app.inject({
        url: '/tags/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.match(res.payload, new RegExp(`${targetTag}<sup>2</sup>`))
      assert.doesNotMatch(res.payload, new RegExp(`${sourceTag}<sup>`))
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('deletes a tag from the HTML action route', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)
    const tag = `delete-${randomUUID().slice(0, 8)}`

    try {
      await createBookmark(app, session.cookie, {
        url: `https://example.com/delete-tag-${randomUUID()}`,
        title: 'Delete tag bookmark',
        tags: [tag],
      })

      const deleteRes = await app.inject({
        method: 'POST',
        url: '/tags/delete/',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          cookie: session.cookie,
        },
        payload: new URLSearchParams({
          name: tag,
          redirect: '/tags/',
        }).toString(),
      })

      assert.strictEqual(deleteRes.statusCode, 302, deleteRes.payload)
      assert.strictEqual(deleteRes.headers['location'], '/tags/')

      const res = await app.inject({
        url: '/tags/',
        headers: {
          cookie: session.cookie,
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.doesNotMatch(res.payload, new RegExp(`${tag}<sup>`))
    } finally {
      await deleteRegisteredSession(app, session.userId)
    }
  })

  await test('renders only the main tags fragment for htmx requests', async (t) => {
    const app = await build(t)
    const session = await createRegisteredSession(app)

    try {
      const res = await app.inject({
        url: '/tags/',
        headers: {
          cookie: session.cookie,
          'hx-request': 'true',
          'hx-target': 'bc-main',
        },
      })

      assert.strictEqual(res.statusCode, 200)
      assert.doesNotMatch(res.payload, /<!DOCTYPE html>/)
      assert.match(res.payload, /<h1>Tags<\/h1>/)
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
  const username = `tags_user_${Date.now()}_${id}`
  const email = `tags_${Date.now()}_${id}@example.com`
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
 * @param {{ url: string, title: string, tags?: string[] }} bookmark
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
