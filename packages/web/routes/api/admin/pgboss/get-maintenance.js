/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 */
import SQL from '@nearform/sql'

/**
 * @typedef {Object} VersionRow
 * @property {number} version - pg-boss schema version
 * @property {Date|null} maintained_on - Last maintenance run time
 * @property {Date|null} monitored_on - Last monitor run time
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
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
          200: {
            type: 'object',
            properties: {
              version: { type: ['integer', 'null'], description: 'pg-boss schema version' },
              maintained_on: { type: ['string', 'null'], format: 'date-time', description: 'Last maintenance run time' },
              monitored_on: { type: ['string', 'null'], format: 'date-time', description: 'Last monitor run time' },
              maintenance_interval_seconds: { type: 'integer', description: 'Maintenance interval in seconds' },
              monitor_interval_seconds: { type: 'integer', description: 'Monitor interval in seconds' },
              archive_completed_after_seconds: { type: 'integer', description: 'Archive completed jobs after seconds' },
              archive_failed_after_seconds: { type: 'integer', description: 'Archive failed jobs after seconds' },
              delete_after_days: { type: 'integer', description: 'Delete archived jobs after days' },
              is_installed: { type: 'boolean', description: 'Whether pg-boss is properly installed' },
            }
          }
        }
      },
    },
    async function getMaintenanceHandler (_request, _reply) {
      try {
        // Get version and last run times
        const versionQuery = SQL`
          SELECT
            version,
            maintained_on,
            monitored_on
          FROM pgboss.version
          ORDER BY version DESC
          LIMIT 1
        `

        /** @type {QueryResult<VersionRow>} */
        const versionResult = await fastify.pg.query(versionQuery)
        const versionData = versionResult.rows[0]

        // Get pg-boss configuration from the instance
        const boss = fastify.pgboss.boss
        const config = fastify.pgboss.config

        // Check if pg-boss is installed
        const isInstalled = Boolean(await boss.isInstalled())

        return {
          version: versionData?.version || null,
          maintained_on: versionData?.maintained_on || null,
          monitored_on: versionData?.monitored_on || null,
          maintenance_interval_seconds: config.maintenanceIntervalSeconds || 300,
          monitor_interval_seconds: config.monitorStateIntervalSeconds || 30,
          archive_completed_after_seconds: config.archiveCompletedAfterSeconds || 3600,
          archive_failed_after_seconds: config.archiveFailedAfterSeconds || (24 * 3600),
          delete_after_days: config.deleteAfterDays || (config.deleteAfterHours ? config.deleteAfterHours / 24 : 2),
          is_installed: isInstalled
        }
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get maintenance status')
        throw error
      }
    }
  )
}
