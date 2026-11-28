import { createHash } from 'node:crypto'
import SQL from '@nearform/sql'

/**
 * @import { QueryResult } from 'pg'
 * @import { FastifyInstance } from 'fastify'
 * @import { PgClient } from '#resources/types/pg-client.js'
 * @import { JSONSchema } from 'json-schema-to-ts'
 */

export const syncReceiptHeaders = /** @type {const} @satisfies {JSONSchema} */ ({
  type: 'object',
  properties: {
    'idempotency-key': {
      type: 'string',
      format: 'uuid',
      description: '**Alpha (unstable).** Opt in to a retained sync receipt. Retry with the same operation UUID and request.',
    },
  },
})

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
 * @template {object} T
 * @param {PgClient} client
 * @param {FastifyInstance['httpErrors']} errors
 * @param {string} ownerId
 * @param {string} operationId
 * @param {unknown} intent
 * @param {(id: string) => Promise<T>} apply
 */
export async function withSyncReceipt (client, errors, ownerId, operationId, intent, apply) {
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
  /** @type {QueryResult<{ request_hash: Buffer, receipt: T }>} */
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
