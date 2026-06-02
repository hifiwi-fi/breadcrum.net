/// <reference lib="dom" />

/** @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js' */

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { selectOfflineBookmarkById } from './useOfflineBookmark.js'

suite('offline bookmark helpers', () => {
  test('selects a bookmark by id from synced offline rows', () => {
    const bookmark = /** @type {TypeBookmarkReadClient} */ ({
      id: 'bookmark-1',
      title: 'Saved page',
      url: 'https://example.com',
      tags: [],
      archive_urls: [],
      archives: [],
      episodes: [],
      created_at: '2026-06-02T00:00:00.000Z',
      updated_at: '2026-06-02T00:00:00.000Z',
      toread: false,
      sensitive: false,
      starred: false,
      done: true,
    })

    assert.equal(selectOfflineBookmarkById([bookmark], 'bookmark-1'), bookmark)
    assert.equal(selectOfflineBookmarkById([bookmark], 'missing'), null)
    assert.equal(selectOfflineBookmarkById(undefined, 'bookmark-1'), null)
    assert.equal(selectOfflineBookmarkById([bookmark], null), null)
  })
})
