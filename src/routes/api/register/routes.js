/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import { verifyEmailBody } from '../user/email/resend-account-confirmation.js'
import {
  EMAIL_CONFIRM_TOKEN,
  EMAIL_CONFIRM_TOKEN_EXP,
} from '../user/email/email-confirm-tokens.js'
import { getPasswordHashQuery } from '../user/password/password-hash.js'
import {
  tokenWithUserProps,
  userEditableUserProps,
} from '../user/schemas/user-base.js'
import { resolveEmail } from 'resolve-email'
import { request as undiciRequest } from 'undici'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function registerRoutes (fastify, _opts) {
  fastify.post(
    '/',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['auth'],
        body: {
          type: 'object',
          required: [
            'username',
            'email',
            'password',
            'newsletter_subscription',
          ],
          properties: {
            ...userEditableUserProps.properties,
            turnstile_token: {
              type: 'string',
              maxLength: 2048,
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              ...tokenWithUserProps.properties,
            },
          },
          403: {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                description: 'Error message when registration is closed',
              },
            },
          },
        },
      },
    },
    async function (request, reply) {
      return fastify.pg.transact(async client => {
        const { registration } = await fastify.getFlags({
          pgClient: client,
          frontend: true,
          backend: false,
        })
        if (!registration) {
          reply.code(403)
          return {
            error: 'Registration is closed. Please try again later.',
          }
        }
        const {
          username,
          email,
          password,
          newsletter_subscription,
          turnstile_token,
        } = request.body

        const userAgent = request.headers['user-agent']
        const ip = Array.isArray(request.ips) ? request.ips.at(-1) : request.ip

        if (fastify.config.TURNSTILE_VALIDATE) {
          if (!turnstile_token) {
            return reply.unprocessableEntity('Turnstile verification failed.')
          }

          const params = new URLSearchParams({
            secret: fastify.config.TURNSTILE_SECRET_KEY,
            response: turnstile_token,
          })

          if (ip) {
            params.set('remoteip', ip)
          }

          try {
            const { statusCode, body } = await undiciRequest('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
              method: 'POST',
              headers: {
                'content-type': 'application/x-www-form-urlencoded',
              },
              body: params.toString(),
            })

            const result = /** @type {{ success?: boolean, 'error-codes'?: string[] }} */ (await body.json())

            if (statusCode < 200 || statusCode >= 300) {
              request.log.warn({ status: statusCode, result }, 'Turnstile verification request failed.')
              return reply.unprocessableEntity('Turnstile verification failed.')
            }

            if (!result?.success) {
              request.log.info({ errors: result?.['error-codes'] }, 'Turnstile verification failed.')
              return reply.unprocessableEntity('Turnstile verification failed.')
            }
          } catch (error) {
            request.log.error({ err: error }, 'Turnstile verification error.')
            return reply.unprocessableEntity('Turnstile verification failed.')
          }
        }

        const usernameQuery = SQL`
          select u.username
          from users u
          where u.username = ${username}
          fetch first 1 row only;
        `

        const usernameResults = await client.query(usernameQuery)

        if (usernameResults.rows.length > 0) {
          return reply.conflict('Username is already taken.')
        }

        const emailQuery = SQL`
          select u.email
          from users u
          where u.email = ${email}
          fetch first 1 row only;
        `

        const emailResults = await client.query(emailQuery)

        if (emailResults.rows.length > 0) {
          return reply.conflict('Email is already taken.')
        }

        // Only validate email if EMAIL_VALIDATION is enabled
        if (fastify.config.EMAIL_VALIDATION) {
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
        }

        const query = SQL`
          insert into users (
              username,
              email,
              password,
              email_verify_token,
              email_verify_token_exp,
              newsletter_subscription,
              registration_ip,
              registration_user_agent
            ) values (
              ${username},
              ${email},
              ${getPasswordHashQuery(password)},
              ${EMAIL_CONFIRM_TOKEN},
              ${EMAIL_CONFIRM_TOKEN_EXP},
              ${newsletter_subscription},
              ${ip || null}::inet,
              ${userAgent || null}
          )
          returning
            id,
            email,
            username,
            email_confirmed,
            email_verify_token,
            newsletter_subscription,
            admin,
            created_at,
            updated_at;
          `

        const results = await client.query(query)
        const { email_verify_token, ...user } = results.rows[0]

        await client.query('commit')

        const token = await reply.createJWTToken({ id: user.id, username: user.username }, 'web')
        reply.setJWTCookie(token)

        fastify.otel.userCreatedCounter.add(1)

        const emailSendJob = fastify.sendEmail({
          toEmail: email,
          subject: 'Verify your account email address',
          text: verifyEmailBody({
            username: user.username,
            host: fastify.config.HOST,
            transport: fastify.config.TRANSPORT,
            token: email_verify_token,
          }),
        })

        await client.query('commit')
        reply.code(201)
        reply.send({
          token,
          user,
        })

        await reply
        // Request finished

        await emailSendJob
      })
    }
  )
}
