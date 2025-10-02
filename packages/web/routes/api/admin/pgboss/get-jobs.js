/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 * @import { ExtractResponseType } from '../../../../types/fastify-utils.js'
 */
import SQL from '@nearform/sql'
import { schemaJobsRead } from './schemas/schema-jobs-read.js'

/**
 * @typedef {Object} JobRow
 * @property {string} id - Job UUID
 * @property {string} name - Queue name
 * @property {string} state - Job state
 * @property {number} priority - Job priority
 * @property {number} retry_count - Retry attempts
 * @property {number} retry_limit - Max retry attempts
 * @property {Date} created_on - Creation time
 * @property {Date|null} started_on - Start time
 * @property {Date|null} completed_on - Completion time
 * @property {Date} keep_until - Retention time
 * @property {Record<string, any>} data - Job payload
 * @property {Record<string, any>|null} output - Job output
 * @property {string|null} singleton_key - Singleton key
 */

/**
 * @typedef {Object} CountRow
 * @property {string} total - Total count as string
 */

/**
 * @type {FastifyPluginAsyncJsonSchemaToTs<{
 *   SerializerSchemaOptions: {
 *     deserialize: [
 *       { pattern: { type: 'string'; format: 'date-time'; }; output: Date | null; }]
 *   }
 * }>}
 */
export async function getJobs (fastify, _opts) {
  fastify.get(
    '/jobs',
    {
      preHandler: fastify.auth([
        fastify.verifyJWT,
        fastify.verifyAdmin,
      ], {
        relation: 'and',
      }),
      schema: {
        hide: true,
        description: 'Get jobs with filtering and pagination',
        querystring: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              enum: ['created', 'retry', 'active', 'completed', 'cancelled', 'failed'],
              description: 'Filter by job state'
            },
            queue: {
              type: 'string',
              description: 'Filter by queue name'
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
              description: 'Number of jobs to return'
            },
            offset: {
              type: 'integer',
              minimum: 0,
              default: 0,
              description: 'Number of jobs to skip'
            },
            order: {
              type: 'string',
              enum: ['created_asc', 'created_desc', 'updated_asc', 'updated_desc'],
              default: 'created_desc',
              description: 'Sort order'
            }
          }
        },
        response: {
          200: schemaJobsRead
        }
      },
    },
    async function getJobsHandler (request, reply) {
      /** @typedef {ExtractResponseType<typeof reply.code<200>>} ReturnBody */
      try {
        const {
          state,
          queue,
          limit,
          offset,
          order
        } = request.query

        // Build the WHERE clause
        const whereConditions = []
        if (state) {
          whereConditions.push(SQL`state = ${state}`)
        }
        if (queue) {
          whereConditions.push(SQL`name = ${queue}`)
        }

        const whereClause = whereConditions.length > 0
          ? SQL`WHERE ${SQL.glue(whereConditions, ' AND ')}`
          : SQL``

        // Build ORDER BY clause
        let orderClause
        switch (order) {
          case 'created_asc':
            orderClause = SQL`ORDER BY created_on ASC`
            break
          case 'created_desc':
            orderClause = SQL`ORDER BY created_on DESC`
            break
          case 'updated_asc':
            orderClause = SQL`ORDER BY COALESCE(completed_on, started_on, created_on) ASC`
            break
          case 'updated_desc':
            orderClause = SQL`ORDER BY COALESCE(completed_on, started_on, created_on) DESC`
            break
          default:
            orderClause = SQL`ORDER BY created_on DESC`
        }

        // Get total count
        const countQuery = SQL`
          SELECT COUNT(*) as total
          FROM pgboss_v11.job
          ${whereClause}
        `
        /** @type {QueryResult<CountRow>} */
        const countResult = await fastify.pg.query(countQuery)
        const total = parseInt(countResult.rows[0]?.total || '0', 10)

        // Get jobs
        const jobsQuery = SQL`
          SELECT
            id,
            name,
            state,
            priority,
            retry_count,
            retry_limit,
            created_on,
            started_on,
            completed_on,
            keep_until,
            data,
            output,
            singleton_key
          FROM pgboss_v11.job
          ${whereClause}
          ${orderClause}
          LIMIT ${limit}
          OFFSET ${offset}
        `

        /** @type {QueryResult<JobRow>} */
        const jobsResult = await fastify.pg.query(jobsQuery)

        /** @type {ReturnBody} */
        const returnBody = {
          jobs: jobsResult.rows,
          pagination: {
            total,
            offset,
            limit,
            hasMore: offset + limit < total
          }
        }

        return reply.code(200).send(returnBody)
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get jobs')
        throw error
      }
    }
  )
}
