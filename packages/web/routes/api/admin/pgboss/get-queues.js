/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 * @import { ExtractResponseType } from '../../../../types/fastify-utils.js'
 */
import SQL from '@nearform/sql'
import { schemaQueuesRead } from './schemas/schema-queues-read.js'

/**
 * @typedef {Object} QueueRow
 * @property {string} name - Queue name
 * @property {string} policy - Queue policy
 * @property {number} retry_limit - Maximum retry attempts
 * @property {number} retry_delay - Delay between retries in seconds
 * @property {boolean} retry_backoff - Use exponential backoff for retries
 * @property {number} expire_seconds - Job expiration time in seconds
 * @property {number} retention_minutes - How long to keep completed jobs in minutes
 * @property {string|null} dead_letter - Dead letter queue name
 * @property {Date} created_on - Queue creation time
 * @property {Date} updated_on - Last update time
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *   }
 * }>}
 */
export async function getQueues (fastify, _opts) {
  fastify.get(
    '/queues',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        description: 'Get all queue configurations',
        response: {
          200: schemaQueuesRead
        }
      },
    },
    async function getQueuesHandler (_request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      try {
        const query = SQL`
          SELECT
            name,
            policy,
            retry_limit,
            retry_delay,
            retry_backoff,
            expire_seconds,
            retention_minutes,
            dead_letter,
            created_on,
            updated_on
          FROM pgboss.queue
          ORDER BY name ASC
        `

        /** @type {QueryResult<QueueRow>} */
        const result = await fastify.pg.query(query)

        /** @type {ReturnBody} */
        const returnBody = {
          queues: result.rows
        }

        return reply.code(200).send(returnBody)
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get queues')
        throw error
      }
    }
  )
}
