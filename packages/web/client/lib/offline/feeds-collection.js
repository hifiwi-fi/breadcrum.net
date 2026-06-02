/// <reference lib="dom" />

/**
 * @import { Collection } from '@tanstack/db'
 * @import { TypeFeedRead } from '../../../routes/api/feeds/schemas/schema-feed-read.js'
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
 * @typedef {object} FeedsCollectionOptions
 * @property {string} [apiUrl]
 * @property {string | null} [userId]
 */

/** @type {Map<string, Collection<TypeFeedRead, string>>} */
const feedsCollections = new Map()

/**
 * @param {string} runtimeNamespace
 * @returns {number}
 */
export function clearFeedsCollectionCache (runtimeNamespace) {
  let cleared = 0
  const collectionKeyPrefix = `${runtimeNamespace}:collection:feeds`

  for (const cacheKey of feedsCollections.keys()) {
    if (cacheKey.startsWith(collectionKeyPrefix)) {
      feedsCollections.delete(cacheKey)
      cleared += 1
    }
  }

  return cleared
}

/**
 * Create or return the shared query-backed feeds collection.
 *
 * @param {FeedsCollectionOptions} [options]
 * @returns {Collection<TypeFeedRead, string>}
 */
export function getFeedsCollection (options = {}) {
  const resolvedOptions = {
    apiUrl: options.apiUrl ?? state.apiUrl,
    userId: options.userId ?? state.user?.id ?? null,
  }

  const scope = getOfflineScope({
    apiUrl: resolvedOptions.apiUrl,
    userId: resolvedOptions.userId,
  })
  const collectionId = getOfflineCollectionId({
    scope,
    collection: 'feeds',
  })
  const cacheKey = collectionId
  const existingCollection = feedsCollections.get(cacheKey)
  if (existingCollection) return existingCollection

  const collectionOptions = queryCollectionOptions({
    id: collectionId,
    queryClient: getQueryClient(),
    queryKey: [
      'offline-feeds',
      scope.runtimeNamespace,
    ],
    enabled: typeof window !== 'undefined' && Boolean(scope.privateNamespace),
    /**
     * @param {{ signal?: AbortSignal }} context
     * @returns {Promise<TypeFeedRead[]>}
     */
    queryFn: async ({ signal }) => {
      /** @type {RequestInit} */
      const requestInit = {
        method: 'get',
        headers: { accept: 'application/json' },
      }
      if (signal) requestInit.signal = signal

      const response = await fetch(`${scope.apiUrl}/delta/feeds`, requestInit)

      if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
        /** @type {{ data?: TypeFeedRead[] }} */
        const body = await response.json()
        return body.data ?? []
      }

      throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`)
    },
    getKey: (/** @type {TypeFeedRead} */ feed) => feed.id,
  })
  const persistence = getOfflinePersistence(scope)
  const persistedOptions = persistence
    ? persistedCollectionOptions({
      ...collectionOptions,
      persistence,
      schemaVersion: OFFLINE_SCHEMA_VERSION,
    })
    : collectionOptions
  const collection = /** @type {Collection<TypeFeedRead, string>} */ (createCollection(persistedOptions))

  feedsCollections.set(cacheKey, collection)
  return collection
}
