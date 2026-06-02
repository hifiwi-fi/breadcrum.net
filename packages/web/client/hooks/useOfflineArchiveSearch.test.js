/// <reference lib="dom" />

/** @import { TypeArchiveReadClient } from '../../routes/api/archives/schemas/schema-archive-read.js' */

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { searchOfflineArchives } from './useOfflineArchiveSearch.js'

/**
 * @param {Partial<TypeArchiveReadClient>} archive
 * @returns {TypeArchiveReadClient}
 */
function makeArchive (archive) {
  return {
    id: archive.id ?? 'archive-1',
    url: archive.url ?? 'https://example.com/archive',
    created_at: archive.created_at ?? '2026-06-02T00:00:00.000Z',
    updated_at: archive.updated_at ?? '2026-06-02T00:00:00.000Z',
    extraction_method: archive.extraction_method ?? 'server',
    ready: archive.ready ?? true,
    bookmark: archive.bookmark ?? {
      id: 'bookmark-1',
      url: 'https://example.com',
      created_at: '2026-06-02T00:00:00.000Z',
      updated_at: '2026-06-02T00:00:00.000Z',
      starred: false,
      toread: false,
      sensitive: false,
      archive_urls: [],
    },
    ...(archive.title ? { title: archive.title } : {}),
    ...(archive.display_title ? { display_title: archive.display_title } : {}),
    ...(archive.site_name ? { site_name: archive.site_name } : {}),
    ...(archive.excerpt ? { excerpt: archive.excerpt } : {}),
    ...(archive.byline ? { byline: archive.byline } : {}),
    ...(archive.language ? { language: archive.language } : {}),
    ...(archive.text_content ? { text_content: archive.text_content } : {}),
  }
}

suite('offline archive search helpers', () => {
  test('matches synced archives across archive and bookmark metadata', () => {
    const archives = [
      makeArchive({
        id: 'archive-1',
        display_title: 'SQLite persistence notes',
        url: 'https://example.com/sqlite',
        site_name: 'Breadcrum Docs',
      }),
      makeArchive({
        id: 'archive-2',
        title: 'Other article',
        url: 'https://example.com/other',
        bookmark: {
          id: 'bookmark-2',
          url: 'https://example.com/other',
          created_at: '2026-06-02T00:00:00.000Z',
          updated_at: '2026-06-02T00:00:00.000Z',
          starred: false,
          toread: false,
          sensitive: false,
          archive_urls: [],
          note: 'Mentions OPFS storage',
        },
      }),
      makeArchive({
        id: 'archive-3',
        title: 'No match',
        url: 'https://example.com/no-match',
      }),
    ]

    assert.deepEqual(
      searchOfflineArchives(archives, 'sqlite')?.map(archive => archive.id),
      ['archive-1']
    )
    assert.deepEqual(
      searchOfflineArchives(archives, 'opfs')?.map(archive => archive.id),
      ['archive-2']
    )
    assert.deepEqual(
      searchOfflineArchives(archives, 'breadcrum sqlite')?.map(archive => archive.id),
      ['archive-1']
    )
  })

  test('returns no local results for an empty query', () => {
    assert.deepEqual(searchOfflineArchives([makeArchive({})], ''), [])
    assert.equal(searchOfflineArchives(null, 'sqlite'), null)
  })
})
