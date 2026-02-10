/**
 * @import { YTDLPMetadata } from '@breadcrum/resources/episodes/yt-dlp-api-client.js'
 * @import { PgClient } from '@breadcrum/resources/types/pg-client.js'
 */

import SQL from '@nearform/sql'
import { resolveType } from '@breadcrum/resources/episodes/resolve-type.js'
import { resolveMimeType } from '@breadcrum/resources/episodes/resolve-mime-type.js'

/**
 * @param {object} params
 * @param {YTDLPMetadata} params.media
 * @param {string} params.url
 * @param {string | undefined} params.bookmarkTitle
 * @param {string} params.episodeId
 * @param {string} params.userId
 * @param {PgClient} params.pg
 * @param {object | null | undefined} [params.oembed]
 */
export async function finalizeEpisode ({
  pg,
  media,
  bookmarkTitle,
  episodeId,
  userId,
  url,
  oembed,
}) {
  const videoData = []

  videoData.push(SQL`done = true`)
  videoData.push(SQL`url = ${url}`)
  if ('filesize_approx' in media) videoData.push(SQL`size_in_bytes = ${Math.round(media.filesize_approx)}`)
  if ('duration' in media) videoData.push(SQL`duration_in_seconds = ${Math.round(media.duration)}`)
  if ('channel' in media) videoData.push(SQL`author_name = ${media.channel}`)
  if ('title' in media && 'ext' in media) {
    const filename = `${media.title}.${media.ext}`
    videoData.push(SQL`filename = ${filename}`)
  }

  if ('title' in media && media.title !== bookmarkTitle) {
    videoData.push(SQL`title = ${media.title.trim().substring(0, 255)}`)
  }

  if ('ext' in media) videoData.push(SQL`ext = ${media.ext}`)
  if ('ext' in media) videoData.push(SQL`src_type = ${resolveType(media)}`)
  const mimeType = resolveMimeType(media)
  if (mimeType) videoData.push(SQL`mime_type = ${mimeType}`)
  if ('description' in media) {
    videoData.push(SQL`text_content = ${media.description}`)
  }
  if (media.uploader_url || media.channel_url) {
    videoData.push(SQL`author_url = ${media.uploader_url || media.channel_url}`)
  }
  if ('thumbnail' in media) {
    videoData.push(SQL`thumbnail = ${media.thumbnail}`)
  }
  if (oembed !== undefined) {
    videoData.push(SQL`oembed = ${oembed}`)
  }
  if ('release_timestamp' in media && media.release_timestamp) {
    // release_timestamp is Unix seconds from yt-dlp API, convert to milliseconds for Date constructor
    videoData.push(SQL`published_time = ${new Date(media.release_timestamp * 1000).toISOString()}`)
  }

  const query = SQL`
        update episodes
        set ${SQL.glue(videoData, ' , ')}
        where id = ${episodeId}
        and owner_id =${userId}
        returning type, medium;
      `

  await pg.query(query)
  // const episode = epResults.rows.pop()
}

/**
 * @param {object} params
 * @param {Error} params.error
 * @param {string} params.episodeId
 * @param {string} params.userId
 * @param {PgClient} params.pg
 */
export async function finalizeEpisodeError ({
  pg,
  error,
  episodeId,
  userId
}) {
  const errorQuery = SQL`
    update episodes
    set error = ${error.stack}, done = true
    where id = ${episodeId}
    and owner_id =${userId};`

  await pg.query(errorQuery)
}
