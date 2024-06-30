import SQL from '@nearform/sql'
import { request as undiciRequest } from 'undici'

/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */

/**
 * admin/flags route returns frontend and backend flags and requires admin to see
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function snsRoutes (fastify, opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([fastify.basicAuth]),
      schema: {
        hide: true,
      },
    },
    async function postSNSHandler (request, reply) {
      const data = request.body

      if (data.Message) {
        try {
          data.Message = JSON.parse(data.Message)
        } catch (err) {
          fastify.log.error({ err }, 'Error parsing SNS Notification Message')
        }
      }

      const insertQuery = SQL`
        insert into sns (body)
        values (${JSON.stringify(data)})
      `

      await fastify.pg.query(insertQuery)

      fastify.log.info({ snsData: data })

      if (data.Type === 'SubscriptionConfirmation') {
        fastify.log.info(`Confirming subscription: ${data.SubscribeURL}`)
        const {
          statusCode,
          headers,
          trailers,
          body,
        } = await undiciRequest(data.SubscribeURL, { autoSelectFamily: true })
        fastify.log.info({
          statusCode,
          headers,
          textBody: await body.text(),
          trailers,
        })
      } else if (data.Type === 'Notification') {
        switch (data.Message?.notificationType) {
          case 'Bounce': {
            fastify.log.info({
              ...data.Message?.bounce,
            }, 'Bounced email')

            if (data.Message?.bounce?.bounceType === 'Permanent') {
              fastify.log.warn({ bouncedRecipients: data.Message?.bounce?.bouncedRecipients }, 'Black-hole perminent bounce')
              return fastify.pg.transact(async client => {
                const emailsToBlock = data.Message?.bounce?.bouncedRecipients.map(r => r.emailAddress)

                const blockEmailQuery = SQL`
                insert into email_blackhole (email, bounce_count, disabled)
                values ${SQL.glue(emailsToBlock.map(email => SQL`(${email},${1},${true})`), ' , ')}
                on conflict (email)
                do update
                  set bounce_count = email_blackhole.bounce_count + excluded.bounce_count, disabled = true;
              `

                await client.query(blockEmailQuery)
              })
            }
            break
          }
          case 'Complaint': {
            fastify.log.warn({ ...data.Message?.complaint }, 'Complaint')
            fastify.log.warn({ bouncedRecipients: data.Message?.complaint?.complainedRecipients }, 'Black-hole complaint')
            return fastify.pg.transact(async client => {
              const emailsToBlock = data.Message?.complaint?.complainedRecipients.map(r => r.emailAddress)

              const blockEmailQuery = SQL`
                insert into email_blackhole (email, bounce_count, disabled)
                values ${SQL.glue(emailsToBlock.map(email => SQL`(${email},${1},${true})`), ' , ')}
                on conflict (email)
                do update
                  set bounce_count = email_blackhole.bounce_count + excluded.bounce_count, disabled = true;
              `

              await client.query(blockEmailQuery)
            })
          }
          case 'Delivery': {
            fastify.log.info({ ...data.Message?.delivery }, 'Delivery')
            break
          }
          default: {
            fastify.log.info({ notificationType: data.Message?.notificationType }, 'Unknown delivery type')
          }
        }
      } else {
        fastify.log.info(`No action: ${data.Type}`)
      }

      // TODO: blackhole email addresses that bounce
    }
  )
}
