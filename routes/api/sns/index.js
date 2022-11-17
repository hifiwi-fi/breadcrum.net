import SQL from '@nearform/sql'
import { request as undiciRequest } from 'undici'

export default async function snsRoutes (fastify, opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([fastify.basicAuth])
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
          body
        } = await undiciRequest(data.SubscribeURL)
        fastify.log.info({
          statusCode,
          headers,
          textBody: await body.text(),
          trailers
        })
      } else if (data.Type === 'Notification') {
        switch (data.Message?.notificationType) {
          case 'Bounce': {
            fastify.log.info('Bounce')
            break
          }
          case 'Complaint': {
            fastify.log.info('Complaint')
            break
          }
          case 'Delivery': {
            fastify.log.info('Delivery')
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
