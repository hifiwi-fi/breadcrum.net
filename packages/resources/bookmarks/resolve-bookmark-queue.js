/**
 * @import { Queue, Worker, Processor } from 'bullmq'
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
