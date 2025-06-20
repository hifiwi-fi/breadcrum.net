/**
 * @import { Queue, Worker, Processor } from 'bullmq'
 * @import PgBoss from 'pg-boss'
 */

/**
 * User-provided metadata for a bookmark.
 *
 * @typedef {{
 *   title: string | undefined
 *   tags: string[]
 *   summary: string | undefined
 * }} UserProvidedMeta
 */

/**
 * Data required to initialize a bookmark.
 *
 * @typedef {{
 *   userId: string
 *   bookmarkId: string
 *   url: string
 *   resolveBookmark: boolean
 *   resolveArchive: boolean
 *   resolveEpisode: boolean
 *   userProvidedMeta: UserProvidedMeta
 * }} ResolveBookmarkData
 */

export const resolveBookmarkQName = 'resolveBookmark'
export const resolveBookmarkJobName = 'resolve-bookmark'

/**
 * @typedef {Queue<
 *          ResolveBookmarkData,
 *          null,
 *          typeof resolveBookmarkJobName
 * >} ResolveBookmarkQ
 */

/**
 * @typedef {Worker<
 *          ResolveBookmarkData,
 *          null,
 *          typeof resolveBookmarkJobName
 * >} ResolveBookmarkW
 */

/**
 * @typedef {Processor<
 *          ResolveBookmarkData,
 *          null,
 *          typeof resolveBookmarkJobName
 * >} ResolveBookmarkP
 */

/**
 * pg-boss queue wrapper for resolve bookmark jobs
 *
 * @typedef {{
 *   name: string
 *   send: (request: { data: ResolveBookmarkData, options?: PgBoss.SendOptions }) => Promise<string | null>
 * }} ResolveBookmarkPgBossQ
 */

/**
 * pg-boss worker for resolve bookmark jobs
 *
 * @typedef {string} ResolveBookmarkPgBossW
 */
