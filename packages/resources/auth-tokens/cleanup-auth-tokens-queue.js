/**
 * @import PgBoss from 'pg-boss'
 * @import { Queue } from 'pg-boss'
 */

import { defaultQueueOptions } from '../pgboss/default-job-options.js'

export const cleanupAuthTokensQName = 'cleanup-stale-auth-tokens'

/**
 * Typed Queue Wrapper for Cleanup Auth Tokens
 *
 * This wrapper automatically applies default queue configuration.
 * The queue name is baked in.
 *
 * @typedef {{
 *   name: string
 * }} CleanupAuthTokensPgBossQ
 */

/**
 * pg-boss worker for cleanup auth tokens jobs
 *
 * @typedef {string} CleanupAuthTokensPgBossW
 */

/**
 * Factory function to create a typed queue wrapper for auth token cleanup.
 *
 * This function:
 * 1. Creates the queue in pg-boss (if not already created)
 * 2. Returns a typed wrapper
 *
 * @param {Object} params
 * @param {PgBoss} params.boss - PgBoss instance
 * @param {Omit<Queue, 'name'>} [params.queueOptions] - Optional queue options (defaults to defaultQueueOptions)
 * @returns {Promise<CleanupAuthTokensPgBossQ>} Promise resolving to typed queue wrapper
 */
export async function createCleanupAuthTokensQ ({
  boss,
  queueOptions = defaultQueueOptions
}) {
  // Create the queue with merged options (defaults + user overrides)
  // Idempotent - safe to call multiple times
  await boss.createQueue(cleanupAuthTokensQName, {
    ...defaultQueueOptions,
    ...queueOptions
  })

  return {
    name: cleanupAuthTokensQName
  }
}
