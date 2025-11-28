/**
 * @import {PgBoss, SendOptions, JobInsert} from 'pg-boss'
 * @import { InsertOptions } from 'pg-boss/dist/types.js'
 * @import { Queue } from 'pg-boss'
 */

import { defaultQueueOptions } from '../pgboss/default-job-options.js'

/**
 * User-provided metadata for a bookmark.
 *
 * @typedef {{
 *   title: string | undefined
 *   tags: string[]
 *   summary: string | undefined
 * }} UserProvidedMeta
 */

/**
 * Data required to initialize a bookmark.
 *
 * @typedef {{
 *   userId: string
 *   bookmarkId: string
 *   url: string
 *   resolveBookmark: boolean
 *   resolveArchive: boolean
 *   resolveEpisode: boolean
 *   userProvidedMeta: UserProvidedMeta
 * }} ResolveBookmarkData
 */

export const resolveBookmarkQName = 'resolveBookmark'
export const resolveBookmarkJobName = 'resolve-bookmark'

/**
 * Request shape for sending a resolve bookmark job
 *
 * @typedef {{
 *   data: ResolveBookmarkData
 *   options?: SendOptions
 * }} ResolveBookmarkRequest
 */

/**
 * Typed Queue Wrapper for Resolve Bookmark
 *
 * This wrapper automatically applies default queue configuration.
 * The queue name and default options are baked in, but callers can
 * override options if needed.
 *
 * @typedef {{
 *   name: string
 *   send: (request: ResolveBookmarkRequest) => Promise<string | null>
 *   insert: (data: ResolveBookmarkData[], options?: InsertOptions) => Promise<string[] | null>
 * }} ResolveBookmarkPgBossQ
 */

/**
 * pg-boss worker for resolve bookmark jobs
 *
 * @typedef {string} ResolveBookmarkPgBossW
 */

/**
 * Factory function to create a typed queue wrapper for bookmark resolution.
 *
 * This function:
 * 1. Creates the queue in pg-boss (if not already created)
 * 2. Returns a typed wrapper that automatically applies default configuration
 *
 * @param {Object} params
 * @param {PgBoss} params.boss - PgBoss instance
 * @param {Omit<Queue, 'name'>} [params.queueOptions] - Optional queue options (defaults to defaultQueueOptions)
 * @returns {Promise<ResolveBookmarkPgBossQ>} Promise resolving to typed queue wrapper
 */
export async function createResolveBookmarkQ ({
  boss,
  queueOptions = defaultQueueOptions
}) {
  // Create the queue with merged options (defaults + user overrides)
  // Idempotent - safe to call multiple times
  await boss.createQueue(resolveBookmarkQName, {
    ...defaultQueueOptions,
    ...queueOptions
  })

  return {
    name: resolveBookmarkQName,

    send: (request) =>
      boss.send({
        name: resolveBookmarkQName,
        data: request.data,
        options: { ...request.options }
      }),

    insert: (dataArray, options) => {
      /** @type {JobInsert<ResolveBookmarkData>[]} */
      const jobs = dataArray.map(data => ({
        name: resolveBookmarkQName,
        data
      }))
      return options ? boss.insert(resolveBookmarkQName, jobs, options) : boss.insert(resolveBookmarkQName, jobs)
    }
  }
}
