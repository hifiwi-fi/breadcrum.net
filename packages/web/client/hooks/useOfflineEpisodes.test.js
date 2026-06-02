/// <reference lib="dom" />

/** @import { TypeBookmarkReadClient } from '../../routes/api/bookmarks/schemas/schema-bookmark-read.js' */

import { suite, test } from 'node:test'
import assert from 'node:assert/strict'
import { deriveOfflineEpisodes } from './useOfflineEpisodes.js'

/**
 * @param {Partial<TypeBookmarkReadClient['episodes'][number]>} episode
 * @returns {TypeBookmarkReadClient['episodes'][number]}
 */
function makeEpisode (episode) {
  return {
    id: episode.id ?? 'episode-1',
    url: episode.url ?? 'https://example.com/episode.mp3',
    created_at: episode.created_at ?? '2026-06-02T00:00:00.000Z',
    updated_at: episode.updated_at ?? '2026-06-02T00:00:00.000Z',
    ready: episode.ready ?? true,
    ...(episode.title ? { title: episode.title } : {}),
    ...(episode.display_title ? { display_title: episode.display_title } : {}),
    ...(episode.podcast_feed_id ? { podcast_feed_id: episode.podcast_feed_id } : {}),
    ...(episode.type ? { type: episode.type } : {}),
    ...(episode.medium ? { medium: episode.medium } : {}),
    ...(episode.mime_type ? { mime_type: episode.mime_type } : {}),
    ...(episode.author_name ? { author_name: episode.author_name } : {}),
    ...(episode.filename ? { filename: episode.filename } : {}),
    ...(episode.ext ? { ext: episode.ext } : {}),
    ...(episode.src_type ? { src_type: episode.src_type } : {}),
    ...(episode.error ? { error: episode.error } : {}),
  }
}

/**
 * @param {Partial<TypeBookmarkReadClient>} bookmark
 * @returns {TypeBookmarkReadClient}
 */
function makeBookmark (bookmark) {
  return {
    id: bookmark.id ?? 'bookmark-1',
    title: bookmark.title ?? 'Saved media',
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

suite('offline episodes helpers', () => {
  test('derives episode rows from synced bookmarks', () => {
    const bookmarks = [
      makeBookmark({
        id: 'bookmark-1',
        title: 'SQLite media bookmark',
        episodes: [
          makeEpisode({
            id: 'episode-1',
            title: 'SQLite audio notes',
            ready: true,
          }),
        ],
      }),
      makeBookmark({
        id: 'bookmark-2',
        episodes: [
          makeEpisode({
            id: 'episode-2',
            title: 'Pending media',
            ready: false,
            created_at: '2026-06-03T00:00:00.000Z',
          }),
        ],
      }),
    ]

    const episodes = deriveOfflineEpisodes(bookmarks, { readyOnly: true })

    assert.deepEqual(episodes?.map(episode => episode.id), ['episode-1'])
    assert.equal(episodes?.[0]?.display_title, 'SQLite audio notes')
    assert.equal(episodes?.[0]?.bookmark.title, 'SQLite media bookmark')
  })

  test('can select a single episode without the ready filter', () => {
    const bookmarks = [
      makeBookmark({
        id: 'bookmark-1',
        episodes: [makeEpisode({ id: 'episode-1', ready: true })],
      }),
      makeBookmark({
        id: 'bookmark-2',
        episodes: [makeEpisode({ id: 'episode-2', ready: false })],
      }),
    ]

    const episodes = deriveOfflineEpisodes(bookmarks, {
      episodeId: 'episode-2',
      readyOnly: false,
    })

    assert.deepEqual(episodes?.map(episode => episode.id), ['episode-2'])
  })

  test('can filter episodes by bookmark id', () => {
    const bookmarks = [
      makeBookmark({
        id: 'bookmark-1',
        episodes: [makeEpisode({ id: 'episode-1' })],
      }),
      makeBookmark({
        id: 'bookmark-2',
        episodes: [makeEpisode({ id: 'episode-2' })],
      }),
    ]

    const episodes = deriveOfflineEpisodes(bookmarks, { bookmarkId: 'bookmark-2' })

    assert.deepEqual(episodes?.map(episode => episode.id), ['episode-2'])
  })

  test('can filter episodes by feed id', () => {
    const bookmarks = [
      makeBookmark({
        id: 'bookmark-1',
        episodes: [makeEpisode({ id: 'episode-1', podcast_feed_id: 'feed-1' })],
      }),
      makeBookmark({
        id: 'bookmark-2',
        episodes: [makeEpisode({ id: 'episode-2', podcast_feed_id: 'feed-2' })],
      }),
    ]

    const episodes = deriveOfflineEpisodes(bookmarks, { feedId: 'feed-2' })

    assert.deepEqual(episodes?.map(episode => episode.id), ['episode-2'])
  })

  test('returns null until bookmark rows are available', () => {
    assert.equal(deriveOfflineEpisodes(undefined), null)
  })
})
