/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 * @import { ExtractResponseType } from '../../../../types/fastify-utils.js'
 */
import SQL from '@nearform/sql'
import { schemaQueueStatesRead } from './schemas/schema-queue-states-read.js'

/**
 * @typedef {Object} StateCountRow
 * @property {string|null} name - Queue name or null for overall counts
 * @property {string} state - Job state or 'all'
 * @property {number} count - Count of jobs in this state
 */

/**
 * @typedef {'created' | 'retry' | 'active' | 'completed' | 'cancelled' | 'failed'} JobState
 */

/**
 * @typedef {Object} StateObject
 * @property {number} created
 * @property {number} retry
 * @property {number} active
 * @property {number} completed
 * @property {number} cancelled
 * @property {number} failed
 * @property {number} all
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *   }
 * }>}
 */
export async function getQueueStates (fastify, _opts) {
  fastify.get(
    '/states',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        description: 'Get current queue states and job counts',
        response: {
          200: schemaQueueStatesRead
        }
      },
    },
    async function getQueueStatesHandler (_request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      try {
        // Query to get job counts by state
        const stateCountsQuery = SQL`
          WITH state_counts AS (
            -- Per-queue state counts
            SELECT
              name,
              state::text as state,
              COUNT(*)::int as count
            FROM pgboss_v11.job
            GROUP BY name, state

            UNION ALL

            -- Per-queue total counts
            SELECT
              name,
              'all' as state,
              COUNT(*)::int as count
            FROM pgboss_v11.job
            GROUP BY name

            UNION ALL

            -- Overall state counts
            SELECT
              NULL as name,
              state::text as state,
              COUNT(*)::int as count
            FROM pgboss_v11.job
            GROUP BY state

            UNION ALL

            -- Overall total count
            SELECT
              NULL as name,
              'all' as state,
              COUNT(*)::int as count
            FROM pgboss_v11.job
          )
          SELECT name, state, count
          FROM state_counts
          ORDER BY name NULLS FIRST, state
        `

        /** @type {QueryResult<StateCountRow>} */
        const result = await fastify.pg.query(stateCountsQuery)

        // Initialize the response structure
        /** @type {StateObject & { queues: Record<string, StateObject> }} */
        const states = {
          created: 0,
          retry: 0,
          active: 0,
          completed: 0,
          cancelled: 0,
          failed: 0,
          all: 0,
          queues: {}
        }

        // Process the results
        result.rows.forEach(row => {
          if (row.name === null) {
            // Overall counts
            if (row.state === 'all') {
              states.all = row.count
            } else if (isJobState(row.state)) {
              states[row.state] = row.count
            }
          } else {
            // Queue-specific counts
            if (!states.queues[row.name]) {
              states.queues[row.name] = {
                created: 0,
                retry: 0,
                active: 0,
                completed: 0,
                cancelled: 0,
                failed: 0,
                all: 0
              }
            }
            const queue = states.queues[row.name]
            if (queue) {
              if (row.state === 'all') {
                queue.all = row.count
              } else if (isJobState(row.state)) {
                queue[row.state] = row.count
              }
            }
          }
        })

        /**
         * Type guard to check if a string is a valid job state
         * @param {string} state
         * @returns {state is JobState}
         */
        function isJobState (state) {
          return ['created', 'retry', 'active', 'completed', 'cancelled', 'failed'].includes(state)
        }

        /** @type {ReturnBody} */
        const returnBody = states

        return reply.code(200).send(returnBody)
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get queue states')
        throw error
      }
    }
  )
}
