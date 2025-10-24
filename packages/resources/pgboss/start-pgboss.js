/**
 * @import { FastifyBaseLogger } from 'fastify'
 * @import { ConstructorOptions } from 'pg-boss'
 */

import PgBoss from 'pg-boss'
import { defaultBossOptions } from './default-job-options.js'

/**
 * Start PgBoss instance with error handling and lifecycle hooks
 *
 * @param {Object} params
 * @param {(text: string, values: any[]) => Promise<any>} params.executeSql - Database query function
 * @param {FastifyBaseLogger} params.logger - Fastify logger instance
 * @param {Partial<ConstructorOptions>} [params.pgBossOptions] - Optional pg-boss configuration overrides
 * @returns {Promise<PgBoss>} Started PgBoss instance
 */
export async function startPGBoss ({
  executeSql,
  logger,
  pgBossOptions
}) {
  const bossConfig = {
    ...defaultBossOptions,
    ...pgBossOptions,
    db: {
      executeSql
    }
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

  logger.info('pg-boss starting')
  await boss.start()
  logger.info('pg-boss started')

  logger.info({ isInstalled: await boss.isInstalled() })

  return boss
}
