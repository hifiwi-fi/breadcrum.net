/// <reference lib="dom" />

/**
 * @import { BrowserWASQLiteDatabase, PersistedCollectionPersistence } from '@tanstack/browser-db-sqlite-persistence'
 *
 * @typedef {object} OfflineScope
 * @property {string} apiUrl
 * @property {string | null} userId
 * @property {string | null} privateNamespace
 * @property {string} runtimeNamespace
 */

import {
  createBrowserWASQLitePersistence,
  openBrowserWASQLiteOPFSDatabase,
} from '@tanstack/browser-db-sqlite-persistence'
import { state } from '../../hooks/state.js'

/**
 * @typedef {object} OfflinePersistenceRecord
 * @property {BrowserWASQLiteDatabase} database
 * @property {PersistedCollectionPersistence} persistence
 */

/**
 * @typedef {object} OfflinePersistenceGlobal
 * @property {{ storage?: { getDirectory?: unknown } }} [navigator]
 * @property {unknown} [Worker]
 */

export const OFFLINE_SCHEMA_VERSION = 1
export const OFFLINE_STORAGE_PREFIX = `breadcrum:offline:v${OFFLINE_SCHEMA_VERSION}`

/** @type {Map<string, OfflinePersistenceRecord>} */
const persistenceRecords = new Map()
/** @type {Map<string, Promise<PersistedCollectionPersistence | null>>} */
const persistencePromises = new Map()

/**
 * @param {string | undefined} apiUrl
 * @returns {string}
 */
export function normalizeOfflineApiUrl (apiUrl) {
  const trimmedApiUrl = (apiUrl ?? '/api').trim()
  const normalizedApiUrl = trimmedApiUrl === '' ? '/api' : trimmedApiUrl

  if (normalizedApiUrl.length <= 1) return normalizedApiUrl
  return normalizedApiUrl.replace(/\/+$/, '')
}

/**
 * @param {string | null | undefined} userId
 * @returns {string | null}
 */
export function normalizeOfflineUserId (userId) {
  const normalizedUserId = userId?.trim() ?? ''
  return normalizedUserId === '' ? null : normalizedUserId
}

/**
 * @param {string} value
 * @returns {string}
 */
function getStoragePart (value) {
  return encodeURIComponent(value)
}

/**
 * @param {{ apiUrl?: string | undefined, userId?: string | null | undefined }} [options]
 * @returns {OfflineScope}
 */
export function getOfflineScope (options = {}) {
  const apiUrl = normalizeOfflineApiUrl(options.apiUrl)
  const userId = normalizeOfflineUserId(options.userId)
  const apiPart = getStoragePart(apiUrl)

  const privateNamespace = userId
    ? `${OFFLINE_STORAGE_PREFIX}:api:${apiPart}:user:${getStoragePart(userId)}`
    : null

  return {
    apiUrl,
    userId,
    privateNamespace,
    runtimeNamespace: privateNamespace ?? `${OFFLINE_STORAGE_PREFIX}:api:${apiPart}:anonymous`,
  }
}

/**
 * @param {{ scope: OfflineScope, collection: string, variant?: string }} options
 * @returns {string}
 */
export function getOfflineCollectionId ({ scope, collection, variant }) {
  const normalizedCollection = collection.trim()
  const normalizedVariant = variant?.trim() ?? ''

  if (normalizedCollection === '') {
    throw new Error('Offline collection name is required')
  }

  const collectionId = `${scope.runtimeNamespace}:collection:${getStoragePart(normalizedCollection)}`
  return normalizedVariant === ''
    ? collectionId
    : `${collectionId}:variant:${getStoragePart(normalizedVariant)}`
}

/**
 * @param {OfflineScope} scope
 * @returns {string | null}
 */
export function getOfflineDatabaseName (scope) {
  if (!scope.privateNamespace) return null
  return `${scope.privateNamespace}:sqlite`
}

/**
 * @param {unknown} [globalObject]
 * @returns {boolean}
 */
export function canUseOfflinePersistence (globalObject = globalThis) {
  const candidate = /** @type {OfflinePersistenceGlobal} */ (/** @type {unknown} */ (globalObject))
  return (
    typeof candidate.navigator?.storage?.getDirectory === 'function' &&
    typeof candidate.Worker === 'function'
  )
}

/**
 * @param {OfflineScope} scope
 * @returns {PersistedCollectionPersistence | null}
 */
export function getOfflinePersistence (scope) {
  if (!scope.privateNamespace) return null
  return persistenceRecords.get(scope.privateNamespace)?.persistence ?? null
}

/**
 * @param {{ apiUrl?: string, userId?: string | null } | OfflineScope} options
 * @returns {OfflineScope}
 */
function resolveOfflineScope (options) {
  if ('runtimeNamespace' in options) return options
  return getOfflineScope(options)
}

/**
 * Open browser OPFS/SQLite persistence for a private user/API namespace.
 * Unsupported runtimes gracefully fall back to in-memory collections.
 *
 * @param {{ apiUrl?: string, userId?: string | null } | OfflineScope} options
 * @returns {Promise<PersistedCollectionPersistence | null>}
 */
export async function prepareOfflinePersistence (options) {
  const scope = resolveOfflineScope(options)
  const { privateNamespace } = scope
  if (!privateNamespace) return null

  const existingRecord = persistenceRecords.get(privateNamespace)
  if (existingRecord) return existingRecord.persistence

  const existingPromise = persistencePromises.get(privateNamespace)
  if (existingPromise) return existingPromise

  if (!canUseOfflinePersistence()) return null

  const databaseName = getOfflineDatabaseName(scope)
  if (!databaseName) return null

  const promise = (async () => {
    try {
      const database = await openBrowserWASQLiteOPFSDatabase({ databaseName })
      const persistence = createBrowserWASQLitePersistence({ database })
      persistenceRecords.set(privateNamespace, { database, persistence })
      return persistence
    } catch (err) {
      console.warn('Offline DB persistence unavailable:', err)
      return null
    } finally {
      persistencePromises.delete(privateNamespace)
    }
  })()

  persistencePromises.set(privateNamespace, promise)
  return promise
}

/**
 * Prepare persistence for the logged-in user when the hidden offline spike flag
 * is present on the current page URL.
 *
 * @returns {Promise<PersistedCollectionPersistence | null>}
 */
export async function prepareOfflinePersistenceForCurrentUser () {
  if (typeof window === 'undefined') return null
  const searchParams = new URLSearchParams(window.location.search)
  if (searchParams.get('offline_db_spike') !== 'true') return null

  return prepareOfflinePersistence({
    apiUrl: state.apiUrl,
    userId: state.user?.id ?? null,
  })
}

/**
 * @param {{ apiUrl?: string, userId?: string | null } | OfflineScope} options
 * @returns {Promise<boolean>}
 */
export async function closeOfflinePersistence (options) {
  const scope = resolveOfflineScope(options)
  const { privateNamespace } = scope
  if (!privateNamespace) return false

  const pendingPersistence = persistencePromises.get(privateNamespace)
  if (pendingPersistence) await pendingPersistence

  const record = persistenceRecords.get(privateNamespace)
  persistenceRecords.delete(privateNamespace)
  persistencePromises.delete(privateNamespace)

  if (!record) return false
  await record.database.close?.()
  return true
}

/**
 * Close and delete the OPFS database file for a private user/API namespace.
 *
 * @param {{ apiUrl?: string, userId?: string | null } | OfflineScope} options
 * @returns {Promise<boolean>}
 */
export async function deleteOfflinePersistence (options) {
  const scope = resolveOfflineScope(options)
  const databaseName = getOfflineDatabaseName(scope)
  if (!databaseName || !canUseOfflinePersistence()) return false

  await closeOfflinePersistence(scope)

  const root = await navigator.storage.getDirectory()
  try {
    await root.removeEntry(databaseName, { recursive: true })
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      return false
    }
    throw err
  }
}
