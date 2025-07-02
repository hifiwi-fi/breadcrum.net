/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 * @import { QueryResult } from 'pg'
 */
import SQL from '@nearform/sql'

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
 *     deserialize: [{ pattern: { type: 'string'; format: 'date-time'; }; output: Date; }]
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
          200: {
            type: 'object',
            properties: {
              jobs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid', description: 'Job ID' },
                    name: { type: 'string', description: 'Queue name' },
                    state: { type: 'string', description: 'Current job state' },
                    priority: { type: 'integer', description: 'Job priority' },
                    retry_count: { type: 'integer', description: 'Number of retry attempts' },
                    retry_limit: { type: 'integer', description: 'Maximum retry attempts' },
                    created_on: { type: 'string', format: 'date-time', description: 'Job creation time' },
                    started_on: { type: ['string', 'null'], format: 'date-time', description: 'Job start time' },
                    completed_on: { type: ['string', 'null'], format: 'date-time', description: 'Job completion time' },
                    keep_until: { type: 'string', format: 'date-time', description: 'Job retention time' },
                    data: { type: 'object', additionalProperties: true, description: 'Job payload' },
                    output: { type: ['object', 'null'], additionalProperties: true, description: 'Job output' },
                    singleton_key: { type: ['string', 'null'], description: 'Singleton key if applicable' },
                  }
                }
              },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'integer', description: 'Total number of jobs matching filters' },
                  offset: { type: 'integer', description: 'Current offset' },
                  limit: { type: 'integer', description: 'Current limit' },
                  hasMore: { type: 'boolean', description: 'Whether there are more results' }
                }
              }
            }
          }
        }
      },
    },
    async function getJobsHandler (request, _reply) {
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
          FROM pgboss.job
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
          FROM pgboss.job
          ${whereClause}
          ${orderClause}
          LIMIT ${limit}
          OFFSET ${offset}
        `

        /** @type {QueryResult<JobRow>} */
        const jobsResult = await fastify.pg.query(jobsQuery)

        return {
          jobs: jobsResult.rows,
          pagination: {
            total,
            offset,
            limit,
            hasMore: offset + limit < total
          }
        }
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get jobs')
        throw error
      }
    }
  )
}
