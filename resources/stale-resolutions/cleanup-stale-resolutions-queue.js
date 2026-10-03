/**
 * @import { PgBoss } from 'pg-boss'
 * @import { Queue } from 'pg-boss'
 */

import { defaultQueueOptions } from '../pgboss/default-job-options.js'

export const cleanupStaleResolutionsQName = 'cleanup-stale-resolutions'

/**
 * Typed Queue Wrapper for Cleanup Stale Resolutions
 *
 * @typedef {{
 *   name: string
 * }} CleanupStaleResolutionsPgBossQ
 */

/**
 * pg-boss worker for cleanup stale resolutions jobs
 *
 * @typedef {string} CleanupStaleResolutionsPgBossW
 */

/**
 * Factory function to create a typed queue wrapper for stale resolution cleanup.
 *
 * @param {Object} params
 * @param {PgBoss} params.boss - PgBoss instance
 * @param {Omit<Queue, 'name'>} [params.queueOptions] - Optional queue options
 * @returns {Promise<CleanupStaleResolutionsPgBossQ>}
 */
export async function createCleanupStaleResolutionsQ ({
  boss,
  queueOptions = defaultQueueOptions
}) {
  await boss.createQueue(cleanupStaleResolutionsQName, {
    ...defaultQueueOptions,
    ...queueOptions
  })

  return {
    name: cleanupStaleResolutionsQName
  }
}
