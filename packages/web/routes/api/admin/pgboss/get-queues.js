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
 * @property {number|null} retry_delay_max - Maximum retry delay in seconds
 * @property {number} expire_seconds - Job expiration time in seconds
 * @property {number} retention_seconds - How long to keep queued jobs in seconds
 * @property {number} deletion_seconds - How long to keep completed jobs in seconds
 * @property {string|null} dead_letter - Dead letter queue name
 * @property {boolean} partition - Whether queue uses dedicated partition table
 * @property {number} deferred_count - Number of deferred jobs
 * @property {number} queued_count - Number of queued jobs
 * @property {number} active_count - Number of active jobs
 * @property {number} total_count - Total number of jobs
 * @property {Date|null} monitor_on - Last time queue was monitored
 * @property {Date|null} maintain_on - Last time queue was maintained
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
            retry_delay_max,
            expire_seconds,
            retention_seconds,
            deletion_seconds,
            dead_letter,
            partition,
            deferred_count,
            queued_count,
            active_count,
            total_count,
            monitor_on,
            maintain_on,
            created_on,
            updated_on
          FROM pgboss_v11.queue
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
