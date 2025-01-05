/**
 * @import { Queue, Worker, Processor } from 'bullmq'
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
