/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 */
import SQL from '@nearform/sql'

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
 * @type {FastifyPluginAsyncJsonSchemaToTs}
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
          200: {
            type: 'object',
            properties: {
              created: { type: 'number', description: 'Jobs waiting to be processed' },
              retry: { type: 'number', description: 'Jobs scheduled for retry' },
              active: { type: 'number', description: 'Jobs currently being processed' },
              completed: { type: 'number', description: 'Jobs successfully completed' },
              cancelled: { type: 'number', description: 'Jobs that were cancelled' },
              failed: { type: 'number', description: 'Jobs that failed processing' },
              all: { type: 'number', description: 'Total number of jobs' },
              queues: {
                type: 'object',
                description: 'Per-queue state breakdowns',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    created: { type: 'number' },
                    retry: { type: 'number' },
                    active: { type: 'number' },
                    completed: { type: 'number' },
                    cancelled: { type: 'number' },
                    failed: { type: 'number' },
                    all: { type: 'number' },
                  }
                }
              }
            }
          }
        }
      },
    },
    async function getQueueStatesHandler (_request, _reply) {
      try {
        // Query to get job counts by state
        const stateCountsQuery = SQL`
          WITH state_counts AS (
            -- Per-queue state counts
            SELECT
              name,
              state::text as state,
              COUNT(*)::int as count
            FROM pgboss.job
            GROUP BY name, state

            UNION ALL

            -- Per-queue total counts
            SELECT
              name,
              'all' as state,
              COUNT(*)::int as count
            FROM pgboss.job
            GROUP BY name

            UNION ALL

            -- Overall state counts
            SELECT
              NULL as name,
              state::text as state,
              COUNT(*)::int as count
            FROM pgboss.job
            GROUP BY state

            UNION ALL

            -- Overall total count
            SELECT
              NULL as name,
              'all' as state,
              COUNT(*)::int as count
            FROM pgboss.job
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

        return states
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get queue states')
        throw error
      }
    }
  )
}
