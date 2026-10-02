/** @import { PgBoss } from 'pg-boss' */
import { setTimeout as delay } from 'node:timers/promises'

export function createProcessorTracker () {
  /** @type {Set<Promise<unknown>>} */
  const inFlight = new Set()
  return {
    /**
     * Track the real processor, not pg-boss's abort/expiration race.
     * @template {unknown[]} Args
     * @template Result
     * @param {(...args: Args) => Promise<Result>} handler
     * @returns {(...args: Args) => Promise<Result>}
     */
    track (handler) {
      return (...args) => {
        const processing = Promise.resolve().then(() => handler(...args))
        inFlight.add(processing)
        // Observe both outcomes without creating an unhandled rejection via finally().
        // The original rejection still reaches pg-boss and the Sentry wrapper.
        const settled = () => { inFlight.delete(processing) }
        processing.then(settled, settled)
        return processing
      }
    },
    async drain () {
      while (inFlight.size) await Promise.allSettled(inFlight)
    },
  }
}

/**
 * Stop polling before HTTP drain, but retain the dedicated boss pool for follow-up sends.
 * Fastify runs this owner's onClose before closing the application pools/cache.
 * @param {Pick<PgBoss, 'offWork' | 'getWipData' | 'stop'>} boss
 * @param {Record<string, string[]>} workers
 * @param {number} timeout
 * @param {ReturnType<typeof createProcessorTracker>} processors
 */
export function createQueueLifecycle (boss, workers, timeout, processors) {
  /** @type {Promise<void> | undefined} */
  let stoppingIntake
  /** @type {Promise<void> | undefined} */
  let closing
  async function stopIntake () {
    stoppingIntake ??= Promise.all(Object.keys(workers).map(name => boss.offWork(name, { wait: false }))).then(() => {})
    await stoppingIntake
  }
  return {
    stopIntake,
    async close () {
      closing ??= (async () => {
        await stopIntake()
        // offWork(wait: false) can leave a fetch in progress. Wait for its handler
        // and pg-boss's completion/failure bookkeeping before closing the boss pool.
        while (boss.getWipData().some(worker => Object.hasOwn(workers, worker.name))) {
          await delay(25)
        }
        // Expiration/abort can remove a worker while its processor is still alive.
        // Only the process shutdown deadline may abandon these actual promises.
        await processors.drain()
        await boss.stop({ graceful: true, timeout })
      })()
      await closing
    },
  }
}
