/**
 * @import { FastifyInstance } from 'fastify'
 * @import { TypeUserUpdate } from './schemas/schema-user-update.js'
 */

import SQL from '@nearform/sql'
import { getPasswordHashQuery } from './password/password-hash.js'

/**
 * @typedef {object} UserUpdateSuccess
 * @property {true} ok
 * @property {200} statusCode
 * @property {'ok'} status
 */

/**
 * @typedef {object} UserUpdateFailure
 * @property {false} ok
 * @property {409} statusCode
 * @property {string} message
 */

/**
 * @typedef {UserUpdateSuccess | UserUpdateFailure} UserUpdateResult
 */

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {TypeUserUpdate} params.user
 * @returns {Promise<UserUpdateResult>}
 */
export async function updateUser (fastify, { userId, user }) {
  return fastify.pg.transact(async client => {
    const updates = []

    if ('username' in user) {
      const usernameQuery = SQL`
        select u.username
        from users u
        where u.username = ${user.username}
        fetch first 1 row only;
      `

      const usernameResults = await client.query(usernameQuery)

      if (usernameResults.rows.length > 0) {
        return {
          ok: false,
          statusCode: 409,
          message: 'Username is already taken.',
        }
      }

      updates.push(SQL`username = ${user.username}`)
    }

    if ('password' in user) updates.push(SQL`password = ${getPasswordHashQuery(user.password)}`)
    if ('newsletter_subscription' in user) updates.push(SQL`newsletter_subscription = ${user.newsletter_subscription}`)
    if ('service_notice_dismissed_hash' in user) {
      updates.push(SQL`service_notice_dismissed_hash = ${user.service_notice_dismissed_hash}`)
    }

    if (updates.length > 0) {
      const query = SQL`
        update users
        set ${SQL.glue(updates, ' , ')}
        where id = ${userId}
      `
      await client.query(query)
    }

    return {
      ok: true,
      statusCode: 200,
      status: 'ok',
    }
  })
}
