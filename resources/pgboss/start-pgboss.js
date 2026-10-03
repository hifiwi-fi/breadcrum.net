/**
 * @import { FastifyBaseLogger } from 'fastify'
 * @import { ConstructorOptions } from 'pg-boss'
 */

import { PgBoss } from 'pg-boss'
import { defaultBossOptions } from './default-job-options.js'

/**
 * Start PgBoss instance with error handling and lifecycle hooks.
 *
 * PgBoss manages its own pg pool so queue startup/maintenance is isolated from
 * the application query pool's timeout and session settings.
 *
 * @param {Object} params
 * @param {FastifyBaseLogger} params.logger - Fastify logger instance
 * @param {Partial<ConstructorOptions>} params.pgBossOptions - pg-boss database/configuration overrides
 * @param {((boss: PgBoss) => void) | undefined} [params.onCreate] - Attach lifecycle ownership before startup
 * @returns {Promise<PgBoss>} Started PgBoss instance
 */
export async function startPGBoss ({
  logger,
  pgBossOptions,
  onCreate,
}) {
  const bossConfig = {
    ...defaultBossOptions,
    ...pgBossOptions,
  }

  const boss = new PgBoss(bossConfig)

  // Set up event listeners for pg-boss
  boss.on('error', (error) => {
    logger.error(error, 'pg-boss error')
  })

  boss.on('wip', (workers) => {
    logger.debug(workers, 'pg-boss workers in progress')
  })

  boss.on('stopped', () => {
    logger.info('pg-boss stopped')
  })

  try {
    onCreate?.(boss)
    logger.info('pg-boss starting')
    await boss.start()
    logger.info('pg-boss started')
    logger.info({ isInstalled: await boss.isInstalled() })
    return boss
  } catch (err) {
    await boss.stop({ graceful: false }).catch(closeError => {
      logger.error({ err: closeError }, 'Failed to clean up partial pg-boss startup')
    })
    throw err
  }
}
