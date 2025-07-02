/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 */
import SQL from '@nearform/sql'

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
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
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
          200: {
            type: 'object',
            properties: {
              schedules: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Schedule name' },
                    cron: { type: 'string', description: 'Cron expression' },
                    timezone: { type: 'string', description: 'Timezone for cron execution' },
                    data: { type: ['object', 'null'], additionalProperties: true, description: 'Job data template' },
                    options: { type: ['object', 'null'], additionalProperties: true, description: 'Job options' },
                    created_on: { type: 'string', format: 'date-time', description: 'Schedule creation time' },
                    updated_on: { type: 'string', format: 'date-time', description: 'Last update time' },
                  }
                }
              }
            }
          }
        }
      },
    },
    async function getSchedulesHandler (_request, _reply) {
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

        return {
          schedules: result.rows
        }
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get schedules')
        throw error
      }
    }
  )
}
