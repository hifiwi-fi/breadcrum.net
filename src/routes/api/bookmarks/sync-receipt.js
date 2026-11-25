import { createHash } from 'node:crypto'
import SQL from '@nearform/sql'

/**
 * @import { QueryResult } from 'pg'
 * @import { FastifyInstance } from 'fastify'
 * @import { PgClient } from '#resources/types/pg-client.js'
 * @import { BookmarkSyncReceipt } from './schemas/bookmark-sync.js'
 */

/** @param {string} operationId @param {string} bookmarkId @param {BookmarkSyncReceipt['outcome']} outcome @returns {BookmarkSyncReceipt} */
export function bookmarkReceipt (operationId, bookmarkId, outcome) {
  return { operation_id: operationId, bookmark_id: bookmarkId, outcome, fields: {}, tags: [] }
}

// JSON objects are unordered. Arrays retain order so tag dispositions can be returned positionally.
/** @param {unknown} value @returns {unknown} */
function orderedJSON (value) {
  if (Array.isArray(value)) return value.map(orderedJSON)
  if (value !== null && typeof value === 'object') {
    const object = /** @type {Record<string, unknown>} */ (value)
    return Object.fromEntries(Object.keys(object).sort().map(key => [key, orderedJSON(object[key])]))
  }
  return value
}

/**
 * @param {PgClient} client
 * @param {FastifyInstance['httpErrors']} errors
 * @param {string} ownerId
 * @param {string} operationId
 * @param {unknown} intent
 * @param {(id: string) => Promise<BookmarkSyncReceipt>} apply
 */
export async function withBookmarkReceipt (client, errors, ownerId, operationId, intent, apply) {
  const id = operationId.toLowerCase()
  const hash = createHash('sha256').update(JSON.stringify(orderedJSON(intent))).digest()

  // Acquire the account FK lock before the domain locks taken by the mutation.
  const owner = await client.query(SQL`select id from users where id = ${ownerId} and not disabled for key share`)
  if (owner.rowCount === 0) throw errors.forbidden('Account is unavailable for sync.')

  // Serialize the first attempt and its retries without creating a placeholder receipt.
  await client.query(SQL`
    select pg_advisory_xact_lock(hashtextextended(
      'breadcrum:sync-mutation:' || ${ownerId}::uuid::text || ':' || ${id}::uuid::text, 0
    ))
  `)
  /** @type {QueryResult<{ request_hash: Buffer, receipt: BookmarkSyncReceipt }>} */
  const prior = await client.query(SQL`
    select request_hash, receipt from sync_mutation_receipts
    where owner_id = ${ownerId} and operation_id = ${id}
  `)
  const existing = prior.rows[0]
  if (existing) {
    if (!existing.request_hash.equals(hash)) throw errors.conflict('This operation ID already belongs to a different intent.')
    return existing.receipt
  }

  const receipt = await apply(id)
  await client.query(SQL`
    insert into sync_mutation_receipts (owner_id, operation_id, request_hash, receipt)
    values (${ownerId}, ${id}, ${hash}, ${receipt})
  `)
  return receipt
}
