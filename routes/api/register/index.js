/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { verifyEmailBody } from '../user/email/resend-account-confirmation.js'
import {
  EMAIL_CONFIRM_TOKEN,
  EMAIL_CONFIRM_TOKEN_EXP
} from '../user/email/email-confirm-tokens.js'
import { getPasswordHashQuery } from '../user/password/password-hash.js'
import {
  tokenWithUserProps,
  validatedUserProps
} from '../user/user-props.js'

export default async function registerRoutes (fastify, opts) {
  fastify.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: [
            'username',
            'email',
            'password',
            'newsletter_subscription'
          ],
          properties: {
            ...validatedUserProps
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              ...tokenWithUserProps
            }
          }
        }
      }
    },
    async function (request, reply) {
      return fastify.pg.transact(async client => {
        const { registration } = await fastify.getFlags({
          pgClient: client,
          frontend: true,
          backend: false
        })
        if (!registration) {
          reply.code(403)
          return {
            error: 'Registration is closed. Please try again later.'
          }
        }
        const { username, email, password, newsletter_subscription } = request.body

        // TODO: ensure not a duplicate user
        // TODO: pre-validate email more (MX record lookup)

        const query = SQL`
          insert into users (
              username,
              email,
              password,
              email_verify_token,
              email_verify_token_exp,
              newsletter_subscription
            ) values (
              ${username},
              ${email},
              ${getPasswordHashQuery(password)},
              ${EMAIL_CONFIRM_TOKEN},
              ${EMAIL_CONFIRM_TOKEN_EXP},
              ${newsletter_subscription}
          )
          returning
            id,
            email,
            username,
            email_confirmed,
            email_verify_token,
            newsletter_subscription;
          `

        const results = await client.query(query)
        const { email_verify_token, ...user } = results.rows[0]

        await client.query('commit')

        const token = await reply.createJWTToken(user)
        reply.setJWTCookie(token)

        reply.code(201)
        // TODO: ensure this user matches login/user object

        fastify.metrics.userCreatedCounter.inc()

        fastify.pqueue.add(async () => {
          const blackholeResults = await fastify.pg.query(SQL`
            select email, bounce_count, disabled
            from email_blackhole
            where email = ${email}
            fetch first row only;
          `)

          if (blackholeResults.rows.length === 0 || blackholeResults.rows[0].disabled === false) {
            const results = await Promise.allSettled([fastify.email.sendMail({
              from: `"Breadcrum.net 🥖" <${fastify.config.APP_EMAIL}>`,
              to: email,
              subject: 'Verify your account email address', // Subject line
              text: verifyEmailBody({
                email: user.email,
                username: user.username,
                host: fastify.config.HOST,
                transport: fastify.config.TRANSPORT,
                token: email_verify_token
              })
            })
            ])

            fastify.log.info(results)
          } else {
            fastify.log.warn({ email }, 'Skipping email for blocked email address')
          }
        })

        return {
          token,
          user
        }
      })
    }
  )
}
