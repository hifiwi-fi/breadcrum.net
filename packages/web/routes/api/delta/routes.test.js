import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { build } from '../../../test/helper.js'

await suite('delta routes', { concurrency: false, timeout: 30000 }, async () => {
  await test('requires authentication', async (t) => {
    const app = await build(t)

    const lastUpdateRes = await app.inject({
      method: 'GET',
      url: '/api/delta/last_update',
    })
    const bookmarksRes = await app.inject({
      method: 'GET',
      url: '/api/delta/bookmarks',
    })
    const feedsRes = await app.inject({
      method: 'GET',
      url: '/api/delta/feeds',
    })

    assert.equal(lastUpdateRes.statusCode, 401)
    assert.equal(bookmarksRes.statusCode, 401)
    assert.equal(feedsRes.statusCode, 401)
  })

  await test('returns authenticated read-only snapshots', async (t) => {
    const app = await build(t)
    const username = `delta_user_${Date.now()}_${randomUUID().slice(0, 8)}`
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/register',
      payload: {
        username,
        email: `${username}@example.com`,
        password: 'TestPassword123!',
        newsletter_subscription: false,
      },
    })

    assert.equal(registerRes.statusCode, 201)

    /** @type {{ user: { id: string }, token: string }} */
    const registerBody = JSON.parse(registerRes.payload)
    const userId = registerBody.user.id
    const token = registerBody.token

    try {
      const lastUpdateRes = await app.inject({
        method: 'GET',
        url: '/api/delta/last_update',
        headers: {
          authorization: `Bearer ${token}`,
        },
      })
      const bookmarksRes = await app.inject({
        method: 'GET',
        url: '/api/delta/bookmarks?sensitive=true',
        headers: {
          authorization: `Bearer ${token}`,
        },
      })
      const feedsRes = await app.inject({
        method: 'GET',
        url: '/api/delta/feeds',
        headers: {
          authorization: `Bearer ${token}`,
        },
      })

      assert.equal(lastUpdateRes.statusCode, 200)
      assert.equal(bookmarksRes.statusCode, 200)
      assert.equal(feedsRes.statusCode, 200)
      assert.deepEqual(JSON.parse(lastUpdateRes.payload), { bookmarks: null, feeds: null })
      assert.deepEqual(JSON.parse(bookmarksRes.payload), { data: [], last_update: null })

      /** @type {{ data: Array<{ default_feed?: boolean, feed_url?: string }>, last_update: string | null }} */
      const feedsBody = JSON.parse(feedsRes.payload)
      assert.equal(Array.isArray(feedsBody.data), true)
      assert.equal(feedsBody.data.length, 1)
      const [feed] = feedsBody.data
      if (!feed) throw new Error('expected default feed')
      assert.equal(feed.default_feed, true)
      assert.equal(typeof feed.feed_url, 'string')
      assert.equal(typeof feedsBody.last_update, 'string')
    } finally {
      await app.pg.query('delete from users where id = $1', [userId])
    }
  })
})
