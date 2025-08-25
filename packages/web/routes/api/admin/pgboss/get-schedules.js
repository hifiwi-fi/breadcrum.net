/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 * @import { ExtractResponseType } from '../../../../types/fastify-utils.js'
 */
import SQL from '@nearform/sql'
import { schemaSchedulesRead } from './schemas/schema-schedules-read.js'

/**
 * @typedef {Object} ScheduleRow
 * @property {string} name - Schedule name
 * @property {string} cron - Cron expression
 * @property {string} timezone - Timezone for cron execution
 * @property {Record<string, any>|null} data - Job data template
 * @property {Record<string, any>|null} options - Job options
 * @property {Date} created_on - Schedule creation time
 * @property {Date} updated_on - Last update time
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *   }
 * }>}
 */
export async function getSchedules (fastify, _opts) {
  fastify.get(
    '/schedules',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        description: 'Get all scheduled/cron jobs',
        response: {
          200: schemaSchedulesRead
        }
      },
    },
    async function getSchedulesHandler (_request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      try {
        const query = SQL`
          SELECT
            name,
            cron,
            timezone,
            data,
            options,
            created_on,
            updated_on
          FROM pgboss.schedule
          ORDER BY name ASC
        `

        /** @type {QueryResult<ScheduleRow>} */
        const result = await fastify.pg.query(query)

        /** @type {ReturnBody} */
        const returnBody = {
          schedules: result.rows
        }

        return reply.code(200).send(returnBody)
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get schedules')
        throw error
      }
    }
  )
}
