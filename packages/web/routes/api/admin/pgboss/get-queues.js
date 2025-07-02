/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 */
import SQL from '@nearform/sql'

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
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
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
          200: {
            type: 'object',
            properties: {
              queues: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Queue name' },
                    policy: { type: 'string', description: 'Queue policy' },
                    retry_limit: { type: 'integer', description: 'Maximum retry attempts' },
                    retry_delay: { type: 'integer', description: 'Delay between retries in seconds' },
                    retry_backoff: { type: 'boolean', description: 'Use exponential backoff for retries' },
                    expire_seconds: { type: 'integer', description: 'Job expiration time in seconds' },
                    retention_minutes: { type: 'integer', description: 'How long to keep completed jobs in minutes' },
                    dead_letter: { type: ['string', 'null'], description: 'Dead letter queue name' },
                    created_on: { type: 'string', format: 'date-time', description: 'Queue creation time' },
                    updated_on: { type: 'string', format: 'date-time', description: 'Last update time' },
                  }
                }
              }
            }
          }
        }
      },
    },
    async function getQueuesHandler (_request, _reply) {
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

        return {
          queues: result.rows
        }
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get queues')
        throw error
      }
    }
  )
}
