/**
 * @import { Queue, Worker, Processor } from 'bullmq'
 * @import { MediumTypes } from './yt-dlp-api-client.js'
 */

/**
 * Data required to resolve an episode.
 *
 * @typedef {{
 *   userId: string
 *   bookmarkTitle: string | undefined
 *   episodeId: string
 *   url: string
 *   medium: MediumTypes
 * }} ResolveEpisodeData
 */

export const resolveEpisodeQName = 'resolveEpisode'
export const resolveEpisodeJobName = 'resolve-episode'

/**
 * @typedef {Queue<
 *          ResolveEpisodeData,
 *          null,
 *          typeof resolveEpisodeJobName
 * >} ResolveEpisodeQ
 */

/**
 * @typedef {Worker<
 *          ResolveEpisodeData,
 *          null,
 *          typeof resolveEpisodeJobName
 * >} ResolveEpisodeW
 */

/**
 * @typedef {Processor<
 *          ResolveEpisodeData,
 *          null,
 *          typeof resolveEpisodeJobName
 * >} ResolveEpisodeP
 */
