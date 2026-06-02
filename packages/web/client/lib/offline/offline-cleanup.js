/// <reference lib="dom" />

/**
 * @import { QueryClient, QueryKey } from '@tanstack/query-core'
 */

import { getQueryClient } from '../query-client.js'
import { clearBookmarksCollectionCache } from './bookmarks-collection.js'
import { clearFeedsCollectionCache } from './feeds-collection.js'
import { deleteOfflinePersistence, getOfflineScope } from './offline-db.js'

/**
 * @typedef {object} OfflineRuntimeCacheClearResult
 * @property {string} runtimeNamespace
 * @property {number} bookmarkCollections
 * @property {number} feedCollections
 * @property {number} queryEntries
 */

/**
 * @typedef {OfflineRuntimeCacheClearResult & {
 *   persistentDataDeleted: boolean
 * }} OfflineDataClearResult
 */

/**
 * @param {QueryKey} queryKey
 * @param {string} runtimeNamespace
 * @returns {boolean}
 */
export function queryKeyHasOfflineRuntimeNamespace (queryKey, runtimeNamespace) {
  return queryKey.some(part => part === runtimeNamespace)
}

/**
 * Clear in-memory offline state for a user/API runtime namespace.
 *
 * Persistent IndexedDB/OPFS data and outbox entries will be added here when
 * those stores exist; for now this handles the Phase 0/1 in-memory surfaces.
 *
 * @param {{ apiUrl?: string, userId?: string | null, queryClient?: QueryClient }} [options]
 * @returns {OfflineRuntimeCacheClearResult}
 */
export function clearOfflineRuntimeCache (options = {}) {
  const scope = getOfflineScope({
    apiUrl: options.apiUrl,
    userId: options.userId,
  })
  const queryClient = options.queryClient ?? getQueryClient()
  const matchingQueries = queryClient.getQueryCache().findAll({
    predicate: query => queryKeyHasOfflineRuntimeNamespace(query.queryKey, scope.runtimeNamespace),
  })

  queryClient.removeQueries({
    predicate: query => queryKeyHasOfflineRuntimeNamespace(query.queryKey, scope.runtimeNamespace),
  })

  return {
    runtimeNamespace: scope.runtimeNamespace,
    bookmarkCollections: clearBookmarksCollectionCache(scope.runtimeNamespace),
    feedCollections: clearFeedsCollectionCache(scope.runtimeNamespace),
    queryEntries: matchingQueries.length,
  }
}

/**
 * Clear in-memory and persisted offline state for a user/API namespace.
 *
 * @param {{ apiUrl?: string, userId?: string | null, queryClient?: QueryClient }} [options]
 * @returns {Promise<OfflineDataClearResult>}
 */
export async function clearOfflineData (options = {}) {
  const runtimeResult = clearOfflineRuntimeCache(options)
  /** @type {{ apiUrl?: string, userId?: string | null }} */
  const scopeOptions = {}
  if (options.apiUrl !== undefined) scopeOptions.apiUrl = options.apiUrl
  if (options.userId !== undefined) scopeOptions.userId = options.userId
  const persistentDataDeleted = await deleteOfflinePersistence(getOfflineScope(scopeOptions))

  return {
    ...runtimeResult,
    persistentDataDeleted,
  }
}
