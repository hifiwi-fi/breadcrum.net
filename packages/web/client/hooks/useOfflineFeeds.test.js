/// <reference lib="dom" />

/** @import { TypeFeedRead } from '../../routes/api/feeds/schemas/schema-feed-read.js' */

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { selectOfflineFeed } from './useOfflineFeeds.js'

/**
 * @param {Partial<TypeFeedRead>} feed
 * @returns {TypeFeedRead}
 */
function makeFeed (feed) {
  return {
    id: feed.id ?? 'feed-1',
    created_at: feed.created_at ?? '2026-06-02T00:00:00.000Z',
    title: feed.title ?? 'Breadcrum feed',
    description: feed.description ?? 'Saved media',
    explicit: feed.explicit ?? false,
    image_url: feed.image_url ?? 'https://example.com/feed.png',
    default_feed: feed.default_feed ?? false,
    feed_url: feed.feed_url ?? 'https://example.com/feed.xml',
    token: feed.token ?? 'feed-token',
    ...(feed.updated_at ? { updated_at: feed.updated_at } : {}),
  }
}

suite('offline feed helpers', () => {
  test('selects the requested feed by id', () => {
    const feeds = [
      makeFeed({ id: 'feed-1', default_feed: true }),
      makeFeed({ id: 'feed-2', title: 'Custom feed' }),
    ]

    assert.equal(selectOfflineFeed(feeds, 'feed-2')?.title, 'Custom feed')
  })

  test('selects the default feed when no feed id is requested', () => {
    const feeds = [
      makeFeed({ id: 'feed-1' }),
      makeFeed({ id: 'feed-2', default_feed: true }),
    ]

    assert.equal(selectOfflineFeed(feeds, null)?.id, 'feed-2')
  })

  test('returns null until feed rows are available', () => {
    assert.equal(selectOfflineFeed(undefined, null), null)
  })
})
