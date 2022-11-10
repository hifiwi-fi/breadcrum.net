import SQL from '@nearform/sql'
import { request as undiciRequest } from 'undici'

export default async function snsRoutes (fastify, opts) {
  fastify.post(
    '/',
    {
      preHandler: fastify.auth([fastify.basicAuth])
    },
    async function postSNSHandler (request, reply) {
      const textBody = request.body
      const data = JSON.parse(textBody)

      const insertQuery = SQL`
        insert into sns (body)
        values (${textBody})
      `

      await fastify.pg.query(insertQuery)

      fastify.logger.info({ snsData: data })

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
      } else {
        fastify.log.info(`No action: ${data.Type}`)
      }

      // TODO: blackhole email addresses that bounce
    }
  )
}
