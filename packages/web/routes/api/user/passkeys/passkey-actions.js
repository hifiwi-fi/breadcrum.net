/**
 * @import { FastifyInstance } from 'fastify'
 * @import { QueryResult } from 'pg'
 * @import { TypePasskeyReadSerialize } from './schemas/schema-passkey-read.js'
 */

import SQL from '@nearform/sql'

/**
 * @typedef {object} PasskeyActionError
 * @property {false} ok
 * @property {404} statusCode
 * @property {string} message
 */

/**
 * @typedef {object} PasskeyUpdateSuccess
 * @property {true} ok
 * @property {TypePasskeyReadSerialize} passkey
 */

/**
 * @typedef {object} PasskeyDeleteSuccess
 * @property {true} ok
 */

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @returns {Promise<TypePasskeyReadSerialize[]>}
 */
export async function listPasskeysForUser (fastify, { userId }) {
  const query = SQL`
    select
      id,
      credential_id,
      name,
      created_at,
      updated_at,
      last_used,
      transports::text[],
      aaguid
    from passkeys
    where user_id = ${userId}
    order by created_at desc
  `

  /** @type {QueryResult<TypePasskeyReadSerialize>} */
  const result = await fastify.pg.query(query)

  return result.rows
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.id
 * @param {string} params.name
 * @returns {Promise<PasskeyUpdateSuccess | PasskeyActionError>}
 */
export async function updatePasskeyName (fastify, { userId, id, name }) {
  const query = SQL`
    update passkeys
    set
      name = ${name},
      updated_at = now()
    where id = ${id}
      and user_id = ${userId}
    returning
      id,
      credential_id,
      name,
      created_at,
      updated_at,
      last_used,
      transports::text[],
      aaguid
  `

  /** @type {QueryResult<TypePasskeyReadSerialize>} */
  const result = await fastify.pg.query(query)
  const passkey = result.rows[0]

  if (result.rowCount === 0 || !passkey) {
    return {
      ok: false,
      statusCode: 404,
      message: 'Passkey not found',
    }
  }

  return {
    ok: true,
    passkey,
  }
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.id
 * @returns {Promise<PasskeyDeleteSuccess | PasskeyActionError>}
 */
export async function deletePasskeyById (fastify, { userId, id }) {
  const query = SQL`
    delete from passkeys
    where id = ${id}
      and user_id = ${userId}
  `

  const result = await fastify.pg.query(query)

  if (result.rowCount === 0) {
    return {
      ok: false,
      statusCode: 404,
      message: 'Passkey not found',
    }
  }

  return { ok: true }
}
