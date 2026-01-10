/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 */
import SQL from '@nearform/sql'
// import { fullSerializedUserProps } from '../../../../user/user-props.js'
import { schemaAdminUserUpdate } from '../schemas/schema-admin-user-update.js'

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export async function putAdminUser (fastify, _opts) {
  fastify.put(
    '/',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        body: schemaAdminUserUpdate,
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
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
        }

        // Handle disabled_email by managing email_blackhole table
        if (targetUserUpdates.disabled_email != null) {
          // Get the user's current email
          const emailQuery = SQL`
            SELECT email FROM users WHERE id = ${targetUserId};
          `
          const emailResult = await client.query(emailQuery)
          const userEmail = emailResult.rows[0]?.email

          if (userEmail) {
            if (targetUserUpdates.disabled_email) {
              // Add or enable email in blackhole
              const upsertBlackholeQuery = SQL`
                INSERT INTO email_blackhole (email, disabled)
                VALUES (${userEmail}, true)
                ON CONFLICT (email)
                DO UPDATE SET disabled = true, updated_at = now();
              `
              await client.query(upsertBlackholeQuery)
            } else {
              // Disable or remove from blackhole
              const disableBlackholeQuery = SQL`
                UPDATE email_blackhole
                SET disabled = false, updated_at = now()
                WHERE email = ${userEmail};
              `
              await client.query(disableBlackholeQuery)
            }
          }
        }

        await client.query('commit')

        reply.status(202)

        return {
          status: 'updated',
        }
      })
    }
  )
}
