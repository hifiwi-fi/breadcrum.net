/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PgClient } from '../types/pg-client.js'
 */
import SQL from '@nearform/sql'

/**
 * Runs a billing operation while holding a per-user transaction advisory lock.
 * @template Result
 * @param {{ pg: FastifyInstance['pg'], userId: string, operation: (client: PgClient) => Promise<Result> }} params
 * @returns {Promise<Result>}
 */
export async function withUserBillingLock ({ pg, userId, operation }) {
  return pg.transact(async client => {
    await client.query(SQL`select pg_advisory_xact_lock(1, hashtext(${userId}))`)
    return operation(client)
  })
}
