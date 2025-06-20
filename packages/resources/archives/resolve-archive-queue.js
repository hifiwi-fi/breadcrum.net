/**
 * @import { Queue, Worker, Processor } from 'bullmq'
 * @import PgBoss from 'pg-boss'
 */

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
 * @typedef {Queue<
 *          ResolveArchiveData,
 *          null,
 *          typeof resolveArchiveJobName
 * >} ResolveArchiveQ
 */

/**
 * @typedef {Worker<
 *          ResolveArchiveData,
 *          null,
 *          typeof resolveArchiveJobName
 * >} ResolveArchiveW
 */

/**
 * @typedef {Processor<
 *          ResolveArchiveData,
 *          null,
 *          typeof resolveArchiveJobName
 * >} ResolveArchiveP
 */

/**
 * pg-boss queue wrapper for resolve archive jobs
 *
 * @typedef {{
 *   name: string
 *   send: (request: { data: ResolveArchiveData, options?: PgBoss.SendOptions }) => Promise<string | null>
 * }} ResolveArchivePgBossQ
 */

/**
 * pg-boss worker for resolve archive jobs
 *
 * @typedef {string} ResolveArchivePgBossW
 */
