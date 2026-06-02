import SQL from '@nearform/sql'

/**
 * @import { FastifyInstance } from 'fastify'
 */

/**
 * @typedef {object} UnsubscribeResult
 * @property {true} ok
 * @property {string} email
 */

/**
 * Unsubscribes an email address without revealing whether the account exists.
 *
 * @param {FastifyInstance} fastify
 * @param {string} email
 * @returns {Promise<UnsubscribeResult>}
 */
export async function unsubscribeEmail (fastify, email) {
  await fastify.pg.transact(async client => {
    const query = SQL`
      update users
      set newsletter_subscription = false
      where email = ${email}
    `

    await client.query(query)
  })

  return {
    ok: true,
    email,
  }
}
