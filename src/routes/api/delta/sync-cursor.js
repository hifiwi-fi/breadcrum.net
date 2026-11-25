import { createHmac, timingSafeEqual } from 'node:crypto'
import SQL from '@nearform/sql'

/**
 * @import { QueryResult } from 'pg'
 * @import { PgClient } from '#resources/types/pg-client.js'
 * @typedef {{ id: string, secret: Buffer }} CursorKey
 * @typedef {{ ownerId: string, generation: number }} CursorOwner
 * @typedef {{ kind: 'bootstrap', after: string, start: string } | { kind: 'changes', after: string, bound: string | null }} Cursor
 */

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/
const revision = /^(0|[1-9][0-9]{0,18})$/
const maxRevision = 9223372036854775807n

export class SyncCursorError extends Error {
  /** @param {400 | 410} statusCode */
  constructor (statusCode) {
    super(statusCode === 410 ? 'Start a fresh sync from bootstrap.' : 'Invalid sync cursor or page token.')
    this.statusCode = statusCode
    this.code = /** @type {const} */ (['invalid_sync_cursor', 'sync_reset_required'])[statusCode === 410 ? 1 : 0]
  }
}

/** @param {CursorKey} key @param {CursorOwner} owner @param {Cursor} cursor */
export function signCursor (key, owner, cursor) {
  const payload = Buffer.from(JSON.stringify([
    owner.ownerId, owner.generation, cursor.kind, cursor.after,
    cursor.kind === 'bootstrap' ? cursor.start : cursor.bound,
  ])).toString('base64url')
  const unsigned = `v1.${key.id}.${payload}`
  return `${unsigned}.${signature(key, unsigned)}`
}

/**
 * @param {PgClient} client
 * @param {CursorKey} activeKey
 * @param {CursorOwner} owner
 * @param {string} token
 * @returns {Promise<Cursor>}
 */
export async function readCursor (client, activeKey, owner, token) {
  const [version, id, payload, mac, ...extra] = token.split('.')
  if (version !== 'v1' || !id || !uuid.test(id) || !payload || !/^[\w-]+$/.test(payload) ||
    !mac || !/^[\w-]{43}$/.test(mac) || extra.length) throw new SyncCursorError(400)
  const key = id === activeKey.id ? activeKey : await getRetiredKey(client, id)
  if (!key || !timingSafeEqual(Buffer.from(mac), Buffer.from(signature(key, `v1.${id}.${payload}`)))) {
    throw new SyncCursorError(400)
  }

  /** @type {unknown} */
  let decoded
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    throw new SyncCursorError(400)
  }
  if (!Array.isArray(decoded) || decoded.length !== 5) throw new SyncCursorError(400)
  const [ownerId, generation, kind, after, bound] = /** @type {unknown[]} */ (decoded)
  if (ownerId !== owner.ownerId) throw new SyncCursorError(400)
  if (generation !== owner.generation) throw new SyncCursorError(410)

  if (kind === 'bootstrap' && typeof after === 'string' && uuid.test(after) && isRevision(bound)) {
    return { kind, after, start: bound }
  }
  if (kind === 'changes' && isRevision(after) &&
    (bound === null || (isRevision(bound) && BigInt(after) <= BigInt(bound)))) {
    return { kind, after, bound }
  }
  throw new SyncCursorError(400)
}

/** @param {unknown} value @returns {value is string} */
function isRevision (value) {
  return typeof value === 'string' && revision.test(value) && BigInt(value) <= maxRevision
}

/** @param {CursorKey} key @param {string} unsigned */
function signature (key, unsigned) {
  return createHmac('sha256', key.secret).update(unsigned).digest('base64url')
}

/** @param {PgClient} client @param {string} id */
async function getRetiredKey (client, id) {
  /** @type {QueryResult<CursorKey>} */
  const result = await client.query(SQL`select id, secret from sync_cursor_keys where id = ${id}`)
  return result.rows[0]
}
