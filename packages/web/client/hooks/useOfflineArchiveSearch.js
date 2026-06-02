/// <reference lib="dom" />

/** @import { TypeArchiveReadClient } from '../../routes/api/archives/schemas/schema-archive-read.js' */

import { useMemo } from 'preact/hooks'
import { useOfflineArchives } from './useOfflineArchives.js'

/**
 * @typedef {object} OfflineArchiveSearchOptions
 * @property {boolean} [enabled]
 */

/**
 * @typedef {object} SearchResult
 * @property {TypeArchiveReadClient} archive
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
 * @param {TypeArchiveReadClient} archive
 * @param {string[]} terms
 * @returns {number}
 */
function scoreArchive (archive, terms) {
  return (
    scoreField(archive.display_title, terms, 8) +
    scoreField(archive.title, terms, 7) +
    scoreField(archive.site_name, terms, 5) +
    scoreField(archive.url, terms, 4) +
    scoreField(archive.excerpt, terms, 3) +
    scoreField(archive.bookmark?.title, terms, 3) +
    scoreField(archive.bookmark?.url, terms, 2) +
    scoreField(archive.bookmark?.note, terms, 2) +
    scoreField(archive.text_content, terms, 1)
  )
}

/**
 * @param {TypeArchiveReadClient} archive
 * @returns {string}
 */
function getArchiveSearchText (archive) {
  return normalizeSearchText([
    archive.display_title,
    archive.title,
    archive.site_name,
    archive.url,
    archive.excerpt,
    archive.byline,
    archive.language,
    archive.text_content,
    archive.bookmark?.title,
    archive.bookmark?.url,
    archive.bookmark?.note,
    archive.bookmark?.summary,
  ].filter(value => typeof value === 'string' && value.length > 0).join(' '))
}

/**
 * @param {TypeArchiveReadClient[] | null | undefined} archives
 * @param {string} query
 * @returns {TypeArchiveReadClient[] | null}
 */
export function searchOfflineArchives (archives, query) {
  if (!Array.isArray(archives)) return null

  const terms = normalizeSearchText(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (terms.length === 0) return []

  /** @type {SearchResult[]} */
  const results = []

  for (const archive of archives) {
    const searchText = getArchiveSearchText(archive)
    if (!terms.every(term => searchText.includes(term))) continue

    results.push({
      archive,
      score: scoreArchive(archive, terms),
    })
  }

  return results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score

    const createdAtCompare = b.archive.created_at.localeCompare(a.archive.created_at)
    if (createdAtCompare !== 0) return createdAtCompare

    return (a.archive.id ?? a.archive.url).localeCompare(b.archive.id ?? b.archive.url)
  }).map(result => result.archive)
}

/**
 * @param {string} query
 * @param {OfflineArchiveSearchOptions} [options]
 */
export function useOfflineArchiveSearch (query, options = {}) {
  const offlineArchives = useOfflineArchives(options)
  const archives = useMemo(
    () => searchOfflineArchives(offlineArchives.archives, query),
    [offlineArchives.archives, query]
  )

  return {
    archivesLoading: offlineArchives.archivesLoading,
    archivesError: offlineArchives.archivesError,
    archives,
    reloadArchives: offlineArchives.reloadArchives,
  }
}
