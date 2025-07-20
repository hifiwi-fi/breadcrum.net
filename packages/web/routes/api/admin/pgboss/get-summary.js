/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 */
import SQL from '@nearform/sql'

/**
 * @typedef {Object} TotalsRow
 * @property {number} total - Total number of jobs
 * @property {number} active - Active jobs
 * @property {number} pending - Pending jobs
 * @property {number} completed - Completed jobs
 * @property {number} failed - Failed jobs
 */

/**
 * @typedef {Object} QueueSummaryRow
 * @property {string} name - Queue name
 * @property {number} total - Total jobs in queue
 * @property {number} active - Active jobs in queue
 * @property {number} pending - Pending jobs in queue
 * @property {number} completed - Completed jobs in queue
 * @property {number} failed - Failed jobs in queue
 */

/**
 * @typedef {Object} RecentFailureRow
 * @property {string} id - Job UUID
 * @property {string} name - Queue name
 * @property {Date} created_on - Job creation time
 * @property {Date} completed_on - Job failure time
 * @property {number} retry_count - Number of retry attempts
 * @property {Record<string, any>|null} output - Error output
 */

/**
 * @typedef {Object} MaintenanceRow
 * @property {Date|null} maintained_on - Last maintenance run time
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
 *   }
 * }>}
 */
export async function getSummary (fastify, _opts) {
  fastify.get(
    '/summary',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        description: 'Get a summary overview of the pg-boss queue system',
        response: {
          200: {
            type: 'object',
            properties: {
              healthy: { type: 'boolean', description: 'Overall health status' },
              totals: {
                type: 'object',
                description: 'Total job counts across all queues',
                properties: {
                  jobs: { type: 'integer', description: 'Total number of jobs' },
                  active: { type: 'integer', description: 'Currently processing jobs' },
                  pending: { type: 'integer', description: 'Jobs waiting to be processed (created + retry)' },
                  completed: { type: 'integer', description: 'Successfully completed jobs' },
                  failed: { type: 'integer', description: 'Failed jobs' },
                }
              },
              queues: {
                type: 'array',
                description: 'Summary for each queue',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Queue name' },
                    active: { type: 'integer', description: 'Active jobs in this queue' },
                    pending: { type: 'integer', description: 'Pending jobs in this queue' },
                    completed: { type: 'integer', description: 'Completed jobs in this queue' },
                    failed: { type: 'integer', description: 'Failed jobs in this queue' },
                    total: { type: 'integer', description: 'Total jobs in this queue' },
                  }
                }
              },
              recent_failures: {
                type: 'array',
                description: 'Recent failed jobs',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid', description: 'Job ID' },
                    name: { type: 'string', description: 'Queue name' },
                    created_on: { type: 'string', format: 'date-time', description: 'When job was created' },
                    completed_on: { type: 'string', format: 'date-time', description: 'When job failed' },
                    retry_count: { type: 'integer', description: 'Number of retry attempts' },
                    output: { type: ['object', 'null'], additionalProperties: true, description: 'Error output' },
                  }
                }
              },
              maintenance: {
                type: 'object',
                description: 'Maintenance status',
                properties: {
                  last_run: { type: ['string', 'null'], format: 'date-time', description: 'Last maintenance run' },
                  overdue: { type: 'boolean', description: 'Whether maintenance is overdue' },
                }
              }
            }
          }
        }
      },
    },
    async function getSummaryHandler (_request, _reply) {
      try {
        // Get overall job counts
        const countsQuery = SQL`
          WITH job_counts AS (
            SELECT
              state,
              COUNT(*)::int as count
            FROM pgboss.job
            GROUP BY state
          )
          SELECT
            COALESCE(SUM(count), 0)::int as total,
            COALESCE(SUM(CASE WHEN state = 'active' THEN count ELSE 0 END), 0)::int as active,
            COALESCE(SUM(CASE WHEN state IN ('created', 'retry') THEN count ELSE 0 END), 0)::int as pending,
            COALESCE(SUM(CASE WHEN state = 'completed' THEN count ELSE 0 END), 0)::int as completed,
            COALESCE(SUM(CASE WHEN state = 'failed' THEN count ELSE 0 END), 0)::int as failed
          FROM job_counts
        `
        /** @type {QueryResult<TotalsRow>} */
        const countsResult = await fastify.pg.query(countsQuery)
        const totals = countsResult.rows[0] || { total: 0, active: 0, pending: 0, completed: 0, failed: 0 }

        // Get per-queue summary
        const queueSummaryQuery = SQL`
          SELECT
            name,
            COUNT(*)::int as total,
            SUM(CASE WHEN state = 'active' THEN 1 ELSE 0 END)::int as active,
            SUM(CASE WHEN state IN ('created', 'retry') THEN 1 ELSE 0 END)::int as pending,
            SUM(CASE WHEN state = 'completed' THEN 1 ELSE 0 END)::int as completed,
            SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END)::int as failed
          FROM pgboss.job
          GROUP BY name
          ORDER BY
            (SUM(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) +
             SUM(CASE WHEN state IN ('created', 'retry') THEN 1 ELSE 0 END)) DESC,
            name ASC
        `
        /** @type {QueryResult<QueueSummaryRow>} */
        const queueSummaryResult = await fastify.pg.query(queueSummaryQuery)

        // Get recent failures (last 10)
        const recentFailuresQuery = SQL`
          SELECT
            id,
            name,
            created_on,
            completed_on,
            retry_count,
            output
          FROM pgboss.job
          WHERE state = 'failed'
          ORDER BY completed_on DESC
          LIMIT 10
        `
        /** @type {QueryResult<RecentFailureRow>} */
        const recentFailuresResult = await fastify.pg.query(recentFailuresQuery)

        // Get maintenance status
        const maintenanceQuery = SQL`
          SELECT maintained_on
          FROM pgboss.version
          ORDER BY version DESC
          LIMIT 1
        `
        /** @type {QueryResult<MaintenanceRow>} */
        const maintenanceResult = await fastify.pg.query(maintenanceQuery)
        const lastMaintenance = maintenanceResult.rows[0]?.maintained_on || null

        // Check if maintenance is overdue (hasn't run in over 10 minutes)
        const maintenanceOverdue = lastMaintenance
          ? (new Date().getTime() - new Date(lastMaintenance).getTime()) > 600000
          : true

        // Determine overall health
        // Unhealthy if: too many failed jobs, maintenance overdue, or too many pending jobs
        const healthy = totals.failed < 100 &&
                       !maintenanceOverdue &&
                       totals.pending < 1000

        return {
          healthy,
          totals: {
            jobs: totals.total,
            active: totals.active,
            pending: totals.pending,
            completed: totals.completed,
            failed: totals.failed
          },
          queues: queueSummaryResult.rows,
          recent_failures: recentFailuresResult.rows,
          maintenance: {
            last_run: lastMaintenance,
            overdue: maintenanceOverdue
          }
        }
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get queue summary')
        throw error
      }
    }
  )
}
