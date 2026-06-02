/// <reference lib="dom" />

/** @import { TypeEpisodeReadClient } from '../../routes/api/episodes/schemas/schema-episode-read.js' */

import { useMemo } from 'preact/hooks'
import { useOfflineEpisodes } from './useOfflineEpisodes.js'

/**
 * @typedef {object} OfflineEpisodeSearchOptions
 * @property {boolean} [enabled]
 */

/**
 * @typedef {object} SearchResult
 * @property {TypeEpisodeReadClient} episode
 * @property {number} score
 */

/**
 * @param {string | undefined} value
 * @returns {string}
 */
function normalizeSearchText (value) {
  return (value ?? '').toLocaleLowerCase()
}

/**
 * @param {string | undefined} value
 * @param {string[]} terms
 * @param {number} weight
 * @returns {number}
 */
function scoreField (value, terms, weight) {
  const normalized = normalizeSearchText(value)
  let score = 0

  for (const term of terms) {
    if (!normalized.includes(term)) continue
    score += normalized.startsWith(term) ? weight * 2 : weight
  }

  return score
}

/**
 * @param {TypeEpisodeReadClient} episode
 * @param {string[]} terms
 * @returns {number}
 */
function scoreEpisode (episode, terms) {
  return (
    scoreField(episode.display_title, terms, 8) +
    scoreField(episode.title, terms, 7) +
    scoreField(episode.author_name, terms, 5) +
    scoreField(episode.url, terms, 4) +
    scoreField(episode.filename, terms, 3) +
    scoreField(episode.bookmark?.title, terms, 3) +
    scoreField(episode.bookmark?.url, terms, 2) +
    scoreField(episode.bookmark?.note, terms, 2) +
    scoreField(episode.text_content, terms, 1)
  )
}

/**
 * @param {TypeEpisodeReadClient} episode
 * @returns {string}
 */
function getEpisodeSearchText (episode) {
  return normalizeSearchText([
    episode.display_title,
    episode.title,
    episode.author_name,
    episode.url,
    episode.filename,
    episode.mime_type,
    episode.ext,
    episode.src_type,
    episode.text_content,
    episode.bookmark?.title,
    episode.bookmark?.url,
    episode.bookmark?.note,
    episode.bookmark?.summary,
  ].filter(value => typeof value === 'string' && value.length > 0).join(' '))
}

/**
 * @param {TypeEpisodeReadClient[] | null | undefined} episodes
 * @param {string} query
 * @returns {TypeEpisodeReadClient[] | null}
 */
export function searchOfflineEpisodes (episodes, query) {
  if (!Array.isArray(episodes)) return null

  const terms = normalizeSearchText(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (terms.length === 0) return []

  /** @type {SearchResult[]} */
  const results = []

  for (const episode of episodes) {
    const searchText = getEpisodeSearchText(episode)
    if (!terms.every(term => searchText.includes(term))) continue

    results.push({
      episode,
      score: scoreEpisode(episode, terms),
    })
  }

  return results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score

    const createdAtCompare = (b.episode.created_at ?? '').localeCompare(a.episode.created_at ?? '')
    if (createdAtCompare !== 0) return createdAtCompare

    return (a.episode.id ?? a.episode.url ?? '').localeCompare(b.episode.id ?? b.episode.url ?? '')
  }).map(result => result.episode)
}

/**
 * @param {string} query
 * @param {OfflineEpisodeSearchOptions} [options]
 */
export function useOfflineEpisodeSearch (query, options = {}) {
  const offlineEpisodes = useOfflineEpisodes({
    ...options,
    listFilters: true,
  })
  const episodes = useMemo(
    () => searchOfflineEpisodes(offlineEpisodes.episodes, query),
    [offlineEpisodes.episodes, query]
  )

  return {
    episodesLoading: offlineEpisodes.episodesLoading,
    episodesError: offlineEpisodes.episodesError,
    episodes,
    reloadEpisodes: offlineEpisodes.reloadEpisodes,
  }
}
