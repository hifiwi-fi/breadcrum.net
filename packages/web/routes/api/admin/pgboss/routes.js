/**
 * @import { FastifyPluginAsyncJsonSchemaToTs } from '@bret/type-provider-json-schema-to-ts'
 */
import { getQueueStates } from './get-queue-states.js'
import { getQueues } from './get-queues.js'
import { getJobs } from './get-jobs.js'
import { getSchedules } from './get-schedules.js'
import { getMaintenance } from './get-maintenance.js'
import { getSummary } from './get-summary.js'

/**
 *
 * @type {FastifyPluginAsyncJsonSchemaToTs}
 * @returns {Promise<void>}
 */
export default async function adminPgBossRoutes (fastify, opts) {
  await Promise.all([
    getQueueStates(fastify, opts),
    getQueues(fastify, opts),
    getJobs(fastify, opts),
    getSchedules(fastify, opts),
    getMaintenance(fastify, opts),
    getSummary(fastify, opts),
  ])
}
