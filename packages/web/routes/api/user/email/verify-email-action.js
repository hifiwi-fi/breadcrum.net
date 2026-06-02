/* eslint-disable camelcase */
import { verifyEmailConfirmHandler } from './verify-email-confirm-handler.js'
import { verifyEmailUpdateHandler } from './verify-email-update-handler.js'

/**
 * @import { FastifyInstance } from 'fastify'
 */

/**
 * @typedef {object} EmailConfirmInput
 * @property {string} userId
 * @property {string} token
 * @property {boolean} update
 */

/**
 * @typedef {object} EmailConfirmSuccess
 * @property {true} ok
 * @property {string} email
 * @property {boolean} confirmed
 * @property {true} [updated]
 */

/**
 * @typedef {{ ok: false, statusCode: 403 | 422, message: string }} EmailConfirmFailure
 */

/**
 * @typedef {EmailConfirmSuccess | EmailConfirmFailure} EmailConfirmResult
 */

/**
 * Confirms the current account email or a pending email update.
 *
 * @param {FastifyInstance} fastify
 * @param {EmailConfirmInput} input
 * @returns {Promise<EmailConfirmResult>}
 */
export async function confirmEmail (fastify, input) {
  return fastify.pg.transact(async client => {
    const now = new Date()
    return input.update
      ? verifyEmailUpdateHandler({
          userId: input.userId,
          client,
          token: input.token,
          now,
        })
      : verifyEmailConfirmHandler({
          userId: input.userId,
          client,
          token: input.token,
          now,
        })
  })
}
