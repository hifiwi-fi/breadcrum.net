/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 * @import { ExtractResponseType } from '../../../../types/fastify-utils.js'
 */
import SQL from '@nearform/sql'
import { schemaSummaryRead } from './schemas/schema-summary-read.js'

/**
 * @typedef {Object} TotalsRow
 * @property {number} total - Total number of jobs
 * @property {number} active - Active jobs
 * @property {number} pending - Pending jobs
 * @property {number} failed - Failed jobs
 */

/**
 * @typedef {Object} QueueSummaryRow
 * @property {string} name - Queue name
 * @property {number} total - Total jobs in queue
 * @property {number} active - Active jobs in queue
 * @property {number} pending - Pending jobs in queue
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
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
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
          200: schemaSummaryRead
        }
      },
    },
    async function getSummaryHandler (_request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      try {
        // Get overall job counts from cached queue metrics (v11 feature)
        const countsQuery = SQL`
          WITH queue_totals AS (
            SELECT
              COALESCE(SUM(total_count), 0)::int as total,
              COALESCE(SUM(active_count), 0)::int as active,
              COALESCE(SUM(queued_count + deferred_count), 0)::int as pending
            FROM pgboss_v11.queue
          ),
          failed_count AS (
            SELECT COUNT(*)::int as failed
            FROM pgboss_v11.job
            WHERE state = 'failed'
          )
          SELECT
            queue_totals.total,
            queue_totals.active,
            queue_totals.pending,
            failed_count.failed
          FROM queue_totals, failed_count
        `
        /** @type {QueryResult<TotalsRow>} */
        const countsResult = await fastify.pg.query(countsQuery)
        const totals = countsResult.rows[0] || { total: 0, active: 0, pending: 0, failed: 0 }

        // Get per-queue summary from cached metrics
        const queueSummaryQuery = SQL`
          WITH queue_metrics AS (
            SELECT
              name,
              total_count as total,
              active_count as active,
              (queued_count + deferred_count) as pending
            FROM pgboss_v11.queue
          ),
          queue_failures AS (
            SELECT
              name,
              COUNT(*)::int as failed
            FROM pgboss_v11.job
            WHERE state = 'failed'
            GROUP BY name
          )
          SELECT
            q.name,
            q.total,
            q.active,
            q.pending,
            COALESCE(f.failed, 0)::int as failed
          FROM queue_metrics q
          LEFT JOIN queue_failures f ON q.name = f.name
          ORDER BY
            (COALESCE(f.failed, 0) + q.pending) DESC,
            q.name ASC
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
          FROM pgboss_v11.job
          WHERE state = 'failed'
          ORDER BY completed_on DESC NULLS LAST
          LIMIT 10
        `
        /** @type {QueryResult<RecentFailureRow>} */
        const recentFailuresResult = await fastify.pg.query(recentFailuresQuery)

        // Get maintenance status from queue table (v11 tracks per-queue)
        const maintenanceQuery = SQL`
          SELECT MAX(maintain_on) as maintained_on
          FROM pgboss_v11.queue
          WHERE maintain_on IS NOT NULL
        `
        /** @type {QueryResult<MaintenanceRow>} */
        const maintenanceResult = await fastify.pg.query(maintenanceQuery)
        const lastMaintenance = maintenanceResult.rows[0]?.maintained_on || null

        // Check if maintenance is overdue (hasn't run in over 24 hours)
        // v11 default maintenance interval is 1 day
        const maintenanceOverdue = lastMaintenance
          ? (new Date().getTime() - new Date(lastMaintenance).getTime()) > 86400000
          : true

        // Determine overall health
        // Unhealthy if: too many failed jobs, maintenance overdue, or too many pending jobs
        const healthy = totals.failed < 100 &&
                       !maintenanceOverdue &&
                       totals.pending < 1000

        /** @type {ReturnBody} */
        const returnBody = {
          healthy,
          totals: {
            jobs: totals.total,
            active: totals.active,
            pending: totals.pending,
            failed: totals.failed
          },
          queues: queueSummaryResult.rows,
          recent_failures: recentFailuresResult.rows,
          maintenance: {
            last_run: lastMaintenance,
            overdue: maintenanceOverdue
          }
        }

        return reply.code(200).send(returnBody)
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get queue summary')
        throw error
      }
    }
  )
}
