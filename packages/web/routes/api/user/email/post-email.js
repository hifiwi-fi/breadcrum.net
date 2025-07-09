/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

import SQL from '@nearform/sql'
import { EMAIL_CONFIRM_TOKEN_EXP, EMAIL_CONFIRM_TOKEN } from './email-confirm-tokens.js'
import { userEditableUserProps } from '../schemas/user-base.js'
// @ts-ignore
import { resolveEmail } from 'resolve-email'

/**
 * Update the email address by setting a pending_email_update field.
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 */
export async function postEmailRoute (fastify, _opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['user'],
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            email: userEditableUserProps.properties.email,
          },
          required: ['email'],
        },
        response: {
          202: {
            type: 'object',
            additionalProperties: false,
            properties: {
              status: {
                type: 'string', enum: ['ok']
              },
              oldEmail: { type: 'string', format: 'email' },
              newEmail: { type: 'string', format: 'email' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async function postEmailHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userId = request.user.id
        const { email } = request.body

        const existingUserEmailQuery = SQL`
          select id, email
          from users
          where email = ${email}
          fetch first row only;
        `

        const results = await client.query(existingUserEmailQuery)
        const hasExistingUserEmail = results.rows.length > 0

        if (hasExistingUserEmail) {
          return reply.conflict('An account already exists with the requested email address')
        }

        const { emailResolves, mxRecords, error: emailError } = await resolveEmail(email)

        request.log[emailError ? 'error' : 'info']({
          email,
          emailResolves,
          mxRecords,
          emailError,
        })

        if (!emailResolves) {
          return reply.unprocessableEntity('There are problems with this email address, please try a different one.')
        }

        const updates = [
          SQL`pending_email_update = ${email}`,
          SQL`pending_email_update_token = ${EMAIL_CONFIRM_TOKEN}`,
          SQL`pending_email_update_token_exp = ${EMAIL_CONFIRM_TOKEN_EXP}`,
        ]

        const updateQuery = SQL`
          update users
          set ${SQL.glue(updates, ' , ')}
          where id = ${userId}
          returning username, email, pending_email_update, pending_email_update_token, pending_email_update_token_exp;
        `

        const queryResults = await client.query(updateQuery)
        await client.query('commit')
        const updatedUser = queryResults.rows.pop()

        const verifyEmailSendJob = fastify.sendEmail({
          toEmail: updatedUser.pending_email_update,
          subject: 'Verify your updated email address',
          text: verifyEmailUpdateBody({
            username: updatedUser.username,
            host: fastify.config.HOST,
            transport: fastify.config.TRANSPORT,
            token: updatedUser.pending_email_update_token,
            oldEmail: updatedUser.email,
            newEmail: updatedUser.pending_email_update,
          }),
        })

        const notifyEmailSendJob = fastify.sendEmail({
          toEmail: updatedUser.email,
          subject: verifyEmailSubject,
          text: notifyOldEmailBody({
            username: updatedUser.username,
            oldEmail: updatedUser.email,
            newEmail: updatedUser.pending_email_update,
          }),
        })

        await client.query('commit')
        reply.code(202)
        reply.send({
          status: 'ok',
          oldEmail: updatedUser.email,
          newEmail: updatedUser.pending_email_update,
          message: 'The newEmail will replace the active oldEmail after the user clicks the confirmation link sent to their newEmail addreess.',
        })

        await reply
        // Request finished

        await Promise.all([
          verifyEmailSendJob,
          notifyEmailSendJob,
        ])
      })
    }
  )
}

export const verifyEmailSubject = 'Email update request notificaiton'

/**
 * @param {object} params
 * @param  {'http' | 'https'} params.transport
 * @param  {string} params.oldEmail
 * @param  {string} params.newEmail
 * @param  {string} params.username
 * @param  {string} params.host
 * @param  {string} params.token
 * @return {string}
 */
export function verifyEmailUpdateBody ({ transport, oldEmail, newEmail, username, host, token }) {
  return `Hi ${username},

If you requested to change your Breadcrum.net account email address from ${oldEmail} to ${newEmail}, click the following link to confirm the change.

${transport}://${host}/email_confirm?token=${token}&update=${true}

If you did not request this change, please immediately change your password and contact support@breadcrum.net

Thank you!`
}

/**
 * @param {object} params
 * @param  {string} params.oldEmail
 * @param  {string} params.newEmail
 * @param  {string} params.username
 * @return {string}
 */
function notifyOldEmailBody ({ username, oldEmail, newEmail }) {
  return `Hi ${username},

If you requested to change your Breadcrum.net account email address from ${oldEmail} to ${newEmail}, please check your inbox for ${newEmail} for a confirmation link to finish the email update process.

If you did not request this change, please immediately change your password and contact support@breadcrum.net

Thank you!`
}
