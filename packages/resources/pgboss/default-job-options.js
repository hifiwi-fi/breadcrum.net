/**
 * @import { ConstructorOptions } from 'pg-boss'
 */

/** @type {ConstructorOptions} */
export const defaultBossOptions = {
  archiveCompletedAfterSeconds: 3600,
  archiveFailedAfterSeconds: 24 * 3600,
  deleteAfterHours: 48
}
