/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { EMAIL_CONFIRM_TOKEN_EXP, EMAIL_CONFIRM_TOKEN } from './email-confirm-tokens.js'

export async function postEmail (fastify, opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([fastify.verifyJWT]),
      schema: {
        body: {
          type: 'object',
          properties: {
            email: {
              type: 'string',
              format: 'email'
            }
          },
          required: ['email']
        }
      },
      respose: {
        202: {
          type: 'object',
          properties: {
            status: {
              type: 'string'
            },
            oldEmail: { type: 'string', format: 'email' },
            newEmail: { type: 'string', format: 'email' },
            message: { type: 'string ' }
          }
        }
      }
    },
    async function postEmailHandler (request, reply) {
      return fastify.pg.transact(async client => {
        const userID = request.user.id
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
          return reply.forbidden('An account already exists with the requested email address')
        }

        const updates = [
          SQL`pending_email_update = ${email}`,
          SQL`pending_email_update_token = ${EMAIL_CONFIRM_TOKEN}`,
          SQL`pending_email_update_token_exp = ${EMAIL_CONFIRM_TOKEN_EXP}`
        ]

        const updateQuery = SQL`
          update users
          set ${SQL.glue(updates, ' , ')}
          where id = ${userID}
          returning username, email, pending_email_update, pending_email_update_token, pending_email_update_token_exp;
        `

        const queryResults = await client.query(updateQuery)
        const updatedUser = queryResults.rows.pop()

        fastify.pqueue.add(async () => {
          const emailJobs = []

          const verifyBlackholeResults = await fastify.pg.query(SQL`
            select email, bounce_count, disabled
            from email_blackhole
            where email = ${updatedUser.pending_email_update}
            fetch first row only;
          `)

          if (verifyBlackholeResults.rows.length === 0 || verifyBlackholeResults.rows[0].disabled === false) {
            emailJobs.push(
              fastify.email.sendMail({
                from: `"Breadcrum.net 🥖" <${fastify.config.APP_EMAIL}>`,
                to: updatedUser.pending_email_update,
                subject: 'Verify your updated email address', // Subject line
                text: verifyEmailUpdateBody({
                  username: updatedUser.username,
                  host: fastify.config.HOST,
                  token: updatedUser.pending_email_update_token,
                  oldEmail: updatedUser.email,
                  newEmail: updatedUser.pending_email_update
                })
              })
            )
          } else {
            fastify.log.warn({ email: updatedUser.pending_email_update }, 'Skipping email for blocked email address')
          }

          const notifyBlackholeResults = await fastify.pg.query(SQL`
            select email, bounce_count, disabled
            from email_blackhole
            where email = ${updatedUser.email}
            fetch first row only;
          `)

          if (notifyBlackholeResults.rows.length === 0 || notifyBlackholeResults.rows[0].disabled === false) {
            emailJobs.push(
              fastify.email.sendMail({
                from: `"Breadcrum.net 🥖" <${fastify.config.APP_EMAIL}>`,
                to: updatedUser.email,
                subject: 'Verify your updated email address', // Subject line
                text: notifyOldEmailBody({
                  username: updatedUser.username,
                  host: fastify.config.HOST,
                  token: updatedUser.pending_email_update_token,
                  oldEmail: updatedUser.email,
                  newEmail: updatedUser.pending_email_update
                })
              })
            )
          } else {
            fastify.log.warn({ email: updatedUser.email }, 'Skipping email for blocked email address')
          }

          return await Promise.all(emailJobs)
        })

        reply.code(202)

        return {
          status: 'ok',
          oldEmail: updatedUser.email,
          newEmail: updatedUser.pending_email_update,
          message: 'The newEmail will replace the active oldEmail after the user clicks the confirmation link sent to their newEmail addreess.'
        }
      })
    }
  )
}

function verifyEmailUpdateBody ({ oldEmail, newEmail, username, host, token }) {
  return `Hi ${username},

If you requested to change your Breadcrum.net account email address from ${oldEmail} to ${newEmail}, click the following link to confir the change.

https://${host}/account/verify-email?token=${token}&update=${true}

If you did not request this change, please immediately change your password and contact support@breadcrum.net

Thank you!`
}

function notifyOldEmailBody ({ username, host, oldEmail, newEmail }) {
  return `Hi ${username},

If you requested to change your Breadcrum.net account email address from ${oldEmail} to ${newEmail}, please check your inbox for ${newEmail} for a confirmation link to finish the email update process.

If you did not request this change, please immediately change your password and contact support@breadcrum.net

Thank you!`
}
