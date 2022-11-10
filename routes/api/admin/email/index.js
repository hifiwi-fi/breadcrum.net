export default async function emailRoutes (fastify, opts) {
  fastify.get(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin
      ], {
        relation: 'and'
      })
    },
    async function putEmailTestHandler (request, reply) {
      const message = {
        from: 'Breadcrum.net <noreply@breadcrum.net>',
        to: 'bcomnes@gmail.com',
        subject: 'Direct email test',
        text: 'Plaintext version of the message. Hello world!',
        html: '<p>HTML version of the message. Hello world!</p>'
      }

      try {
        const emailResults = await fastify.nodemailer.sendMail(message)

        fastify.log.info({ emailResults })

        return { emailResults }
      } catch (err) {
        return { err }
      }
    }
  )
}
