/// <reference lib="dom" />

/** @import { TypeEpisodeReadClient } from '../../routes/api/episodes/schemas/schema-episode-read.js' */

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { searchOfflineEpisodes } from './useOfflineEpisodeSearch.js'

/**
 * @param {Partial<TypeEpisodeReadClient>} episode
 * @returns {TypeEpisodeReadClient}
 */
function makeEpisode (episode) {
  return {
    id: episode.id ?? 'episode-1',
    url: episode.url ?? 'https://example.com/episode.mp3',
    created_at: episode.created_at ?? '2026-06-02T00:00:00.000Z',
    updated_at: episode.updated_at ?? '2026-06-02T00:00:00.000Z',
    ready: episode.ready ?? true,
    bookmark: episode.bookmark ?? {
      id: 'bookmark-1',
      url: 'https://example.com',
      created_at: '2026-06-02T00:00:00.000Z',
      updated_at: '2026-06-02T00:00:00.000Z',
      starred: false,
      toread: false,
      sensitive: false,
      archive_urls: [],
    },
    ...(episode.title ? { title: episode.title } : {}),
    ...(episode.display_title ? { display_title: episode.display_title } : {}),
    ...(episode.author_name ? { author_name: episode.author_name } : {}),
    ...(episode.filename ? { filename: episode.filename } : {}),
    ...(episode.mime_type ? { mime_type: episode.mime_type } : {}),
    ...(episode.ext ? { ext: episode.ext } : {}),
    ...(episode.src_type ? { src_type: episode.src_type } : {}),
    ...(episode.text_content ? { text_content: episode.text_content } : {}),
  }
}

suite('offline episode search helpers', () => {
  test('matches synced episodes across episode and bookmark metadata', () => {
    const episodes = [
      makeEpisode({
        id: 'episode-1',
        display_title: 'SQLite media notes',
        url: 'https://example.com/sqlite.mp3',
        author_name: 'Breadcrum Audio',
      }),
      makeEpisode({
        id: 'episode-2',
        title: 'Other episode',
        url: 'https://example.com/other.mp3',
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
      makeEpisode({
        id: 'episode-3',
        title: 'No match',
        url: 'https://example.com/no-match.mp3',
      }),
    ]

    assert.deepEqual(
      searchOfflineEpisodes(episodes, 'sqlite')?.map(episode => episode.id),
      ['episode-1']
    )
    assert.deepEqual(
      searchOfflineEpisodes(episodes, 'opfs')?.map(episode => episode.id),
      ['episode-2']
    )
    assert.deepEqual(
      searchOfflineEpisodes(episodes, 'breadcrum sqlite')?.map(episode => episode.id),
      ['episode-1']
    )
  })

  test('returns no local results for an empty query', () => {
    assert.deepEqual(searchOfflineEpisodes([makeEpisode({})], ''), [])
    assert.equal(searchOfflineEpisodes(null, 'sqlite'), null)
  })
})
