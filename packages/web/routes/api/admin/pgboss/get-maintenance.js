/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 * @import { ExtractResponseType } from '../../../../types/fastify-utils.js'
 */
import SQL from '@nearform/sql'
import { schemaMaintenanceRead } from './schemas/schema-maintenance-read.js'

/**
 * @typedef {Object} VersionRow
 * @property {number} version - pg-boss schema version
 * @property {Date|null} cron_on - Last cron/schedule run time
 */

/**
 * @typedef {Object} TimesRow
 * @property {Date|null} last_supervise - Most recent queue supervision time
 * @property {Date|null} last_maintenance - Most recent queue maintenance time
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *   }
 * }>}
 */
export async function getMaintenance (fastify, _opts) {
  fastify.get(
    '/maintenance',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        description: 'Get maintenance and monitoring status',
        response: {
          200: schemaMaintenanceRead
        }
      },
    },
    async function getMaintenanceHandler (_request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      try {
        // Get version from version table
        const versionQuery = SQL`
          SELECT
            version,
            cron_on
          FROM pgboss_v11.version
          ORDER BY version DESC
          LIMIT 1
        `

        /** @type {QueryResult<VersionRow>} */
        const versionResult = await fastify.pg.query(versionQuery)
        const versionData = versionResult.rows[0]

        // Get most recent supervision and maintenance times from queue table
        const timesQuery = SQL`
          SELECT
            MAX(monitor_on) as last_supervise,
            MAX(maintain_on) as last_maintenance
          FROM pgboss_v11.queue
        `

        /** @type {QueryResult<TimesRow>} */
        const timesResult = await fastify.pg.query(timesQuery)
        const lastSupervise = timesResult.rows[0]?.last_supervise || null
        const lastMaintenance = timesResult.rows[0]?.last_maintenance || null

        // Get pg-boss configuration
        const boss = fastify.pgboss.boss
        const config = fastify.pgboss.config

        // Check if pg-boss is installed
        const isInstalled = Boolean(await boss.isInstalled())

        // Calculate if overdue
        const now = Date.now()
        const superviseIntervalMs = (config.superviseIntervalSeconds || 60) * 1000
        const maintenanceIntervalMs = (config.maintenanceIntervalSeconds || 86400) * 1000

        const supervisionOverdue = lastSupervise
          ? (now - new Date(lastSupervise).getTime()) > (superviseIntervalMs * 2)
          : true

        const maintenanceOverdue = lastMaintenance
          ? (now - new Date(lastMaintenance).getTime()) > (maintenanceIntervalMs * 2)
          : true

        /** @type {ReturnBody} */
        const returnBody = {
          version: versionData?.version || null,
          last_supervise: lastSupervise,
          last_maintenance: lastMaintenance,
          supervise_interval_seconds: config.superviseIntervalSeconds || 60,
          maintenance_interval_seconds: config.maintenanceIntervalSeconds || 86400,
          delete_after_seconds: 604800, // 7 days default, could be per-queue
          is_installed: isInstalled,
          supervision_overdue: supervisionOverdue,
          maintenance_overdue: maintenanceOverdue
        }

        return reply.code(200).send(returnBody)
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get maintenance status')
        throw error
      }
    }
  )
}
