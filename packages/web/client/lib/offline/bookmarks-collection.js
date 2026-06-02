/// <reference lib="dom" />

/**
 * @import { Collection } from '@tanstack/db'
 * @import { TypeBookmarkReadClient } from '../../../routes/api/bookmarks/schemas/schema-bookmark-read.js'
 */

import { createCollection } from '@tanstack/db'
import { persistedCollectionOptions } from '@tanstack/browser-db-sqlite-persistence'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { state } from '../../hooks/state.js'
import { getQueryClient } from '../query-client.js'
import {
  getOfflineCollectionId,
  getOfflinePersistence,
  getOfflineScope,
  OFFLINE_SCHEMA_VERSION,
} from './offline-db.js'

/**
 * @typedef {object} BookmarksCollectionOptions
 * @property {string} [apiUrl]
 * @property {string | null} [userId]
 * @property {boolean} [sensitive]
 * @property {boolean} [toread]
 * @property {boolean} [starred]
 */

/** @type {Map<string, Collection<TypeBookmarkReadClient, string>>} */
const bookmarksCollections = new Map()

/**
 * @param {string} runtimeNamespace
 * @returns {number}
 */
export function clearBookmarksCollectionCache (runtimeNamespace) {
  let cleared = 0
  const collectionKeyPrefix = `${runtimeNamespace}:collection:bookmarks`

  for (const cacheKey of bookmarksCollections.keys()) {
    if (cacheKey.startsWith(collectionKeyPrefix)) {
      bookmarksCollections.delete(cacheKey)
      cleared += 1
    }
  }

  return cleared
}

/**
 * @param {Omit<Required<BookmarksCollectionOptions>, 'apiUrl' | 'userId'>} options
 * @returns {string}
 */
function getBookmarksFilterKey ({ sensitive, toread, starred }) {
  return JSON.stringify({ sensitive, toread, starred })
}

/**
 * Create or return the shared query-backed bookmarks collection for a filter set.
 * This read-only collection uses the delta endpoint because query collections
 * need the complete collection state for their current filter set.
 *
 * @param {BookmarksCollectionOptions} [options]
 * @returns {Collection<TypeBookmarkReadClient, string>}
 */
export function getBookmarksCollection (options = {}) {
  const resolvedOptions = {
    apiUrl: options.apiUrl ?? state.apiUrl,
    userId: options.userId ?? state.user?.id ?? null,
    sensitive: options.sensitive ?? state.sensitive,
    toread: options.toread ?? state.toread,
    starred: options.starred ?? state.starred,
  }

  const scope = getOfflineScope({
    apiUrl: resolvedOptions.apiUrl,
    userId: resolvedOptions.userId,
  })
  const filterKey = getBookmarksFilterKey(resolvedOptions)
  const collectionId = getOfflineCollectionId({
    scope,
    collection: 'bookmarks',
    variant: filterKey,
  })
  const cacheKey = collectionId
  const existingCollection = bookmarksCollections.get(cacheKey)
  if (existingCollection) return existingCollection

  const collectionOptions = queryCollectionOptions({
    id: collectionId,
    queryClient: getQueryClient(),
    queryKey: [
      'offline-bookmarks',
      scope.runtimeNamespace,
      resolvedOptions.sensitive,
      resolvedOptions.toread,
      resolvedOptions.starred,
    ],
    enabled: typeof window !== 'undefined' && Boolean(scope.privateNamespace),
    /**
     * @param {{ signal?: AbortSignal }} context
     * @returns {Promise<TypeBookmarkReadClient[]>}
     */
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams()
      params.set('sensitive', resolvedOptions.sensitive.toString())
      params.set('toread', resolvedOptions.toread.toString())
      params.set('starred', resolvedOptions.starred.toString())

      /** @type {RequestInit} */
      const requestInit = {
        method: 'get',
        headers: { accept: 'application/json' },
      }
      if (signal) requestInit.signal = signal

      const response = await fetch(`${scope.apiUrl}/delta/bookmarks?${params.toString()}`, requestInit)

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        /** @type {{ data?: TypeBookmarkReadClient[] }} */
        const body = await response.json()
        return body.data ?? []
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
    getKey: (/** @type {TypeBookmarkReadClient} */ bookmark) => bookmark.id,
  })
  const persistence = getOfflinePersistence(scope)
  const persistedOptions = persistence
    ? persistedCollectionOptions({
      ...collectionOptions,
      persistence,
      schemaVersion: OFFLINE_SCHEMA_VERSION,
    })
    : collectionOptions
  const collection = /** @type {Collection<TypeBookmarkReadClient, string>} */ (createCollection(persistedOptions))

  bookmarksCollections.set(cacheKey, collection)
  return collection
}
