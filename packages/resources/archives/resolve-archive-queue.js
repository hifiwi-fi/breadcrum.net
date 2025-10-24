/**
 * @import PgBoss from 'pg-boss'
 * @import { Queue } from 'pg-boss'
 */

import { defaultQueueOptions } from '../pgboss/default-job-options.js'

/**
 * Data relating to resolve document jobs
 *
 * @typedef {{
 *   url: string
 *   userId: string
 *   archiveId: string
 * }} ResolveArchiveData
 */

export const resolveArchiveQName = 'resolveArchive'
export const resolveArchiveJobName = 'resolve-archive'

/**
 * Request shape for sending a resolve archive job
 *
 * @typedef {{
 *   data: ResolveArchiveData
 *   options?: PgBoss.SendOptions
 * }} ResolveArchiveRequest
 */

/**
 * Typed Queue Wrapper for Resolve Archive
 *
 * This wrapper automatically applies default queue configuration.
 * The queue name and default options are baked in, but callers can
 * override options if needed.
 *
 * @typedef {{
 *   name: string
 *   send: (request: ResolveArchiveRequest) => Promise<string | null>
 *   insert: (data: ResolveArchiveData[], options?: PgBoss.InsertOptions) => Promise<void>
 * }} ResolveArchivePgBossQ
 */

/**
 * pg-boss worker for resolve archive jobs
 *
 * @typedef {string} ResolveArchivePgBossW
 */

/**
 * Factory function to create a typed queue wrapper for archive resolution.
 *
 * This function:
 * 1. Creates the queue in pg-boss (if not already created)
 * 2. Returns a typed wrapper that automatically applies default configuration
 *
 * @param {Object} params
 * @param {PgBoss} params.boss - PgBoss instance
 * @param {Omit<Queue, 'name'>} [params.queueOptions] - Optional queue options (defaults to defaultQueueOptions)
 * @returns {Promise<ResolveArchivePgBossQ>} Promise resolving to typed queue wrapper
 */
export async function createResolveArchiveQ ({
  boss,
  queueOptions = defaultQueueOptions
}) {
  // Create the queue with merged options (defaults + user overrides)
  // Idempotent - safe to call multiple times
  await boss.createQueue(resolveArchiveQName, {
    ...defaultQueueOptions,
    ...queueOptions
  })

  return {
    name: resolveArchiveQName,

    send: (request) =>
      boss.send({
        name: resolveArchiveQName,
        data: request.data,
        options: { ...request.options }
      }),

    insert: (dataArray, options) => {
      /** @type {PgBoss.JobInsert<ResolveArchiveData>[]} */
      const jobs = dataArray.map(data => ({
        name: resolveArchiveQName,
        data
      }))
      return options ? boss.insert(resolveArchiveQName, jobs, options) : boss.insert(resolveArchiveQName, jobs)
    }
  }
}
