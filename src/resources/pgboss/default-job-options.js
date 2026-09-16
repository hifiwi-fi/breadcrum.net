/**
 * @import { ConstructorOptions, Queue } from 'pg-boss'
 */

/** @type {ConstructorOptions} */
export const defaultBossOptions = {
  schema: 'pgboss_v11',
  warningSlowQuerySeconds: 30,
  warningQueueSize: 10000,
}

/**
 * Default queue options to apply when creating queues
 * These should be passed to createQueue() for each queue
 * Only includes options that differ from pg-boss defaults
 */
export const defaultQueueOptions = /** @type {Omit<Queue, 'name'>} */ ({
  // v11: Retention for queued jobs before expiration (default is 14 days, we want 1 day)
  retentionSeconds: 24 * 3600, // 1 day

  // Retry backoff enabled (default is false)
  retryBackoff: true,
})
