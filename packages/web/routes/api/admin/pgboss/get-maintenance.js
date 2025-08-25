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
 * @property {Date|null} maintained_on - Last maintenance run time
 * @property {Date|null} monitored_on - Last monitor run time
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

        /** @type {ReturnBody} */
        const returnBody = {
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

        return reply.code(200).send(returnBody)
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get maintenance status')
        throw error
      }
    }
  )
}
