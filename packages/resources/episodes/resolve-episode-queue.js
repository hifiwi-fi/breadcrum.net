/**
 * @import { MediumTypes } from './yt-dlp-api-client.js'
 * @import PgBoss from 'pg-boss'
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
 * pg-boss queue wrapper for resolve episode jobs
 *
 * @typedef {{
 *   name: string
 *   send: (request: { data: ResolveEpisodeData, options?: PgBoss.SendOptions }) => Promise<string | null>
 * }} ResolveEpisodePgBossQ
 */

/**
 * pg-boss worker for resolve episode jobs
 *
 * @typedef {string} ResolveEpisodePgBossW
 */
