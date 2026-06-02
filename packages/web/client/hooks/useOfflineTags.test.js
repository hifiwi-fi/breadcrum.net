/// <reference lib="dom" />

/** @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js' */

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveOfflineTags } from './useOfflineTags.js'

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
  }
}

suite('offline tags helpers', () => {
  test('derives tag counts from synced bookmarks', () => {
    const tags = deriveOfflineTags([
      makeBookmark({ id: 'bookmark-1', tags: ['offline', 'sqlite'] }),
      makeBookmark({ id: 'bookmark-2', tags: ['offline'] }),
      makeBookmark({ id: 'bookmark-3', tags: ['sync'] }),
    ])

    assert.deepEqual(tags, [
      { name: 'offline', count: 2 },
      { name: 'sqlite', count: 1 },
      { name: 'sync', count: 1 },
    ])
  })

  test('returns null until bookmark rows are available', () => {
    assert.equal(deriveOfflineTags(undefined), null)
  })
})
