import SQL from '@nearform/sql'
// import { fullSerializedUserProps } from '../../../../user/user-props.js'
import { adminEditableUserProps } from '../admin-user-props.js'

export async function putAdminUser (fastify, opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin
      ], {
        relation: 'and'
      }),
      schema: {
        hide: true,
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            ...adminEditableUserProps
          }
        },
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          },
          required: ['id']
        }
      }
    },
    // PUT user with administrative fields
    async function putAdminUserHandler (request, reply) {
      return fastify.pg.transact(async client => {
        // const userId = request.user.id
        const targetUserId = request.params.id
        const targetUserUpdates = request.body

        // Check if user exists:

        // Check if bookmark exists:
        const targetUserQuery = SQL`
          select username from users
          WHERE id = ${targetUserId};
        `

        const targetUserResults = await client.query(targetUserQuery)
        const existingTargetUser = targetUserResults.rows[0]

        if (!existingTargetUser) {
          return reply.notFound(`target user ${targetUserId} not found`)
        }

        const updates = []

        if (targetUserUpdates.username != null) updates.push(SQL`username = ${targetUserUpdates.username}`)
        if (targetUserUpdates.email != null) updates.push(SQL`email = ${targetUserUpdates.email}`)
        if (targetUserUpdates.newsletter_subscription != null) updates.push(SQL`newsletter_subscription = ${targetUserUpdates.newsletter_subscription}`)
        if (targetUserUpdates.email_confirmed != null) updates.push(SQL`email_confirmed = ${targetUserUpdates.email_confirmed}`)
        if (targetUserUpdates.pending_email_update != null) updates.push(SQL`pending_email_update = ${targetUserUpdates.pending_email_update}`)
        if (targetUserUpdates.disabled_email != null) updates.push(SQL`disabled_email = ${targetUserUpdates.disabled_email}`)
        if (targetUserUpdates.disabled != null) updates.push(SQL`disabled = ${targetUserUpdates.disabled}`)
        if (targetUserUpdates.disabled_reason != null) updates.push(SQL`disabled_reason = ${targetUserUpdates.disabled_reason}`)
        if (targetUserUpdates.internal_note != null) updates.push(SQL`internal_note = ${targetUserUpdates.internal_note}`)

        if (updates.length > 0) {
          const query = SQL`
          UPDATE users
          SET ${SQL.glue(updates, ' , ')}
          WHERE id = ${targetUserId};
          `

          await client.query(query)
          await client.query('commit')
        }

        reply.status(202)

        return {
          status: 'updated'
        }
      })
    }
  )
}
