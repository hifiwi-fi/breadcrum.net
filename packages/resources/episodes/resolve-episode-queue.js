/**
 * @import { MediumTypes } from './yt-dlp-api-client.js'
 * @import {PgBoss, SendOptions, JobInsert} from 'pg-boss'
 * @import { InsertOptions } from 'pg-boss/dist/types.js'
 * @import { Queue } from 'pg-boss'
 */

import { defaultQueueOptions } from '../pgboss/default-job-options.js'

/**
 * Data required to resolve an episode.
 *
 * @typedef {{
 *   userId: string
 *   bookmarkTitle: string | undefined
 *   episodeId: string
 *   url: string
 *   medium: MediumTypes
 * }} ResolveEpisodeData
 */

export const resolveEpisodeQName = 'resolveEpisode'
export const resolveEpisodeJobName = 'resolve-episode'

/**
 * Request shape for sending a resolve episode job
 *
 * @typedef {{
 *   data: ResolveEpisodeData
 *   options?: SendOptions
 * }} ResolveEpisodeRequest
 */

/**
 * Typed Queue Wrapper for Resolve Episode
 *
 * This wrapper automatically applies default queue configuration.
 * The queue name and default options are baked in, but callers can
 * override options if needed.
 *
 * @typedef {{
 *   name: string
 *   send: (request: ResolveEpisodeRequest) => Promise<string | null>
 *   insert: (data: ResolveEpisodeData[], options?: InsertOptions) => Promise<string[] | null>
 * }} ResolveEpisodePgBossQ
 */

/**
 * pg-boss worker for resolve episode jobs
 *
 * @typedef {string} ResolveEpisodePgBossW
 */

/**
 * Factory function to create a typed queue wrapper for episode resolution.
 *
 * This function:
 * 1. Creates the queue in pg-boss (if not already created)
 * 2. Returns a typed wrapper that automatically applies default configuration
 *
 * @param {Object} params
 * @param {PgBoss} params.boss - PgBoss instance
 * @param {Omit<Queue, 'name'>} [params.queueOptions] - Optional queue options (defaults to defaultQueueOptions)
 * @returns {Promise<ResolveEpisodePgBossQ>} Promise resolving to typed queue wrapper
 */
export async function createResolveEpisodeQ ({
  boss,
  queueOptions = defaultQueueOptions
}) {
  // Episode-specific queue options
  // YouTube URLs can have transient failures, so we retry more aggressively
  const episodeQueueOptions = {
    ...defaultQueueOptions,
    retryLimit: 4, // Total of 5 attempts (1 initial + 4 retries)
    retryDelay: 5, // Wait 5 seconds between retries (with exponential backoff)
    retryBackoff: true, // Enable exponential backoff
  }

  // Create the queue with merged options (defaults + episode-specific + user overrides)
  // Idempotent - safe to call multiple times
  await boss.createQueue(resolveEpisodeQName, {
    ...episodeQueueOptions,
    ...queueOptions
  })

  return {
    name: resolveEpisodeQName,

    send: (request) =>
      boss.send({
        name: resolveEpisodeQName,
        data: request.data,
        options: { ...request.options }
      }),

    insert: (dataArray, options) => {
      /** @type {JobInsert<ResolveEpisodeData>[]} */
      const jobs = dataArray.map(data => ({
        name: resolveEpisodeQName,
        data
      }))
      return options ? boss.insert(resolveEpisodeQName, jobs, options) : boss.insert(resolveEpisodeQName, jobs)
    }
  }
}
