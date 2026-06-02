/// <reference lib="dom" />

/** @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js' */

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveOfflineArchives } from './useOfflineArchives.js'

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

suite('offline archives helpers', () => {
  test('derives ready archive rows from synced bookmarks', () => {
    const archives = deriveOfflineArchives([
      makeBookmark({
        id: 'bookmark-1',
        title: 'Bookmark title',
        archives: [
          {
            id: 'archive-1',
            created_at: '2026-06-02T00:00:00.000Z',
            updated_at: '2026-06-02T00:00:00.000Z',
            url: 'https://example.com/archive-1',
            extraction_method: 'server',
            ready: true,
          },
          {
            id: 'archive-2',
            created_at: '2026-06-03T00:00:00.000Z',
            updated_at: '2026-06-03T00:00:00.000Z',
            url: 'https://example.com/archive-2',
            extraction_method: 'server',
            ready: false,
          },
        ],
      }),
    ])

    assert.equal(archives?.length, 1)
    assert.equal(archives?.[0]?.id, 'archive-1')
    assert.equal(archives?.[0]?.bookmark.id, 'bookmark-1')
    assert.equal(archives?.[0]?.bookmark.title, 'Bookmark title')
  })

  test('can select a single archive without the ready filter', () => {
    const archives = deriveOfflineArchives([
      makeBookmark({
        archives: [
          {
            id: 'archive-2',
            created_at: '2026-06-03T00:00:00.000Z',
            updated_at: '2026-06-03T00:00:00.000Z',
            url: 'https://example.com/archive-2',
            extraction_method: 'server',
            ready: false,
          },
        ],
      }),
    ], { archiveId: 'archive-2', readyOnly: false })

    assert.equal(archives?.[0]?.id, 'archive-2')
  })

  test('returns null until bookmark rows are available', () => {
    assert.equal(deriveOfflineArchives(undefined), null)
  })
})
