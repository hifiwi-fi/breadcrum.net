/// <reference lib="dom" />

/** @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js' */

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { searchOfflineBookmarks } from './useOfflineBookmarkSearch.js'

/**
 * @param {Partial<TypeBookmarkReadClient>} bookmark
 * @returns {TypeBookmarkReadClient}
 */
function makeBookmark (bookmark) {
  return {
    id: bookmark.id ?? 'bookmark-1',
    title: bookmark.title ?? 'Saved page',
    url: bookmark.url ?? 'https://example.com',
    tags: bookmark.tags ?? [],
    archive_urls: bookmark.archive_urls ?? [],
    archives: bookmark.archives ?? [],
    episodes: bookmark.episodes ?? [],
    created_at: bookmark.created_at ?? '2026-06-02T00:00:00.000Z',
    updated_at: bookmark.updated_at ?? '2026-06-02T00:00:00.000Z',
    toread: bookmark.toread ?? false,
    sensitive: bookmark.sensitive ?? false,
    starred: bookmark.starred ?? false,
    done: bookmark.done ?? true,
    ...(bookmark.note ? { note: bookmark.note } : {}),
    ...(bookmark.summary ? { summary: bookmark.summary } : {}),
    ...(bookmark.original_url ? { original_url: bookmark.original_url } : {}),
  }
}

suite('offline bookmark search helpers', () => {
  test('matches synced bookmarks across title, url, tags, note, and summary', () => {
    const bookmarks = [
      makeBookmark({
        id: 'bookmark-1',
        title: 'SQLite persistence notes',
        url: 'https://example.com/sqlite',
        tags: ['offline'],
      }),
      makeBookmark({
        id: 'bookmark-2',
        title: 'Other page',
        url: 'https://example.com/other',
        note: 'Mentions OPFS storage',
      }),
      makeBookmark({
        id: 'bookmark-3',
        title: 'No match',
        url: 'https://example.com/no-match',
      }),
    ]

    assert.deepEqual(
      searchOfflineBookmarks(bookmarks, 'sqlite')?.map(bookmark => bookmark.id),
      ['bookmark-1']
    )
    assert.deepEqual(
      searchOfflineBookmarks(bookmarks, 'opfs')?.map(bookmark => bookmark.id),
      ['bookmark-2']
    )
    assert.deepEqual(
      searchOfflineBookmarks(bookmarks, 'offline sqlite')?.map(bookmark => bookmark.id),
      ['bookmark-1']
    )
  })

  test('returns no local results for an empty query', () => {
    assert.deepEqual(searchOfflineBookmarks([makeBookmark({})], ''), [])
    assert.equal(searchOfflineBookmarks(null, 'sqlite'), null)
  })
})
