/* eslint-disable camelcase */
import SQL from '@nearform/sql'
import S from 'fluent-json-schema'

const newUserJsonSchema = S.object()
  .prop('username',
    S.string()
      .minLength(1)
      .maxLength(50)
      .pattern('^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$')
  ).required()
  .prop('email',
    S.string()
      .format('email')
      .pattern("^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$") // eslint-disable-line no-useless-escape
  ).required()
  .prop('password',
    S.string()
      .minLength(8)
      .maxLength(50)
  ).required()

const createdUserJsonSchema = S.object()
  .prop('token', S.string())
  .prop('user', S.object()
    .prop('id', S.string().format('uuid'))
    .prop('email', S.string().format('email'))
    .prop('email_confirmed', S.boolean())
    .prop('username', S.string())
  )

export default async function registerRoutes (fastify, opts) {
  fastify.post(
    '/',
    {
      schema: {
        body: newUserJsonSchema,
        response: {
          201: createdUserJsonSchema
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
        const { username, email, password } = request.body

        // TODO: ensure not a duplicate user

        const query = SQL`
          insert into users (username, email, password, email_verify_token) values (
            ${username},
            ${email},
            crypt(${password}, gen_salt('bf')),
            encode(gen_random_bytes(32), 'hex')
          )
          returning id, email, username, email_confirmed, email_verify_token;`

        const results = await client.query(query)
        const { email_verify_token, ...user } = results.rows[0]

        const token = await reply.createJWTToken(user)
        reply.setJWTCookie(token)

        reply.code(201)
        // TODO: ensure this user matches login/user object

        fastify.metrics.userCreatedCounter.inc()

        fastify.pqueue.add(async () => {
          await fastify.email.sendMail({
            from: `"Breadcrum.net 🥖" <${fastify.config.APP_EMAIL}>`,
            to: email,
            subject: 'Verify your account email address', // Subject line
            text: verifyEmailBody({ email: user.email, username: user.username, host: fastify.config.HOST, token: email_verify_token })
          })
        })

        return {
          token,
          user
        }
      })
    }
  )
}

function verifyEmailBody ({ email, username, host, token }) {
  return `Hi ${username},

Thanks for signing up for a Breadcrum.net account. Please verify your email address by clicking the link below.

https://${host}/account/verify-email?token=${token}&update=${true}

If you did not sign up for this account, please contact support@breadcrum.net or perform a password reset on the account associated with this email address and perform an account delete action if this is unwanted.

Thank you!`
}
