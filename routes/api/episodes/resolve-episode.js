import SQL from '@nearform/sql'
import { getFileKey } from '../../../plugins/yt-dlp/index.js'

/**
 * Resolve metadata for an existing episode entry.
 * @param  {object} options.fastify   fastify instance
 * @param  {object} options.pg        a postgres client
 * @param  {object} options.log       a pino client, like from the request
 * @param  {string} options.userID    ID of user
 * @param  {string} options.bookmarkTitle  Title of the bookmark
 * @param  {string} options.episodeID ID of episode
 * @param  {string} options.url       The URL of the episode to resolve
 * @param  {string} options.medium    The medium to attempt to resolve
 * @return {}                   void
 */
export async function resolveEpisode ({
  fastify,
  pg, // optional tx client
  log, // optional request logging instance
  userID,
  bookmarkTitle,
  episodeID,
  url,
  medium
}) {
  pg = pg ?? fastify.pg
  log = log ?? fastify.log

  try {
    const metadata = await fastify.getYTDLPMetadata({ url, medium })

    const videoData = []

    videoData.push(SQL`ready = true`)
    videoData.push(SQL`url = ${url}`)
    if (metadata.filesize_approx != null) videoData.push(SQL`size_in_bytes = ${Math.round(metadata.filesize_approx)}`)
    if (metadata.duration != null) videoData.push(SQL`duration_in_seconds = ${Math.round(metadata.duration)}`)
    if (metadata.channel != null) videoData.push(SQL`author_name = ${metadata.channel}`)
    if (metadata.title != null && metadata.ext != null) {
      const filename = `${metadata.title}.${metadata.ext}`
      videoData.push(SQL`filename = ${filename}`)
    }
    console.log({
      metaTitle: metadata.title,
      bookmarkTitle
    })
    if (metadata.title != null && metadata.title !== bookmarkTitle) {
      // TODO: when bookmarks have auto-extract, maybe remove this
      videoData.push(SQL`title = ${metadata.title.trim().substring(0, 255)}`)
    }
    if (metadata.ext != null) videoData.push(SQL`ext = ${metadata.ext}`)
    if (metadata._type != null) videoData.push(SQL`src_type = ${resolveType(metadata)}`)

    const query = SQL`
        update episodes
        set ${SQL.glue(videoData, ' , ')}
        where id = ${episodeID}
        and owner_id =${userID}
        returning type, medium;
      `

    const epResults = await pg.query(query)
    const episode = epResults.rows.pop()

    // TODO: move this caching behavior into getYTDLPMetadata
    const cacheKey = getFileKey({
      userId: userID,
      episodeId: episodeID,
      sourceUrl: url,
      type: episode.type,
      medium: episode.medium
    })

    // Warm mem cache
    fastify.memURLCache.set(cacheKey, metadata.url)

    log.info(`Episode ${episodeID} for ${url} is ready.`)
  } catch (err) {
    log.error(`Error extracting video for episode ${episodeID}`)
    log.error(err)
    const errorQuery = SQL`
        update episodes
        set error = ${err.stack}
        where id = ${episodeID}
        and owner_id =${userID};`
    await pg.query(errorQuery)
  }
}

export function resolveType (metadata) {
  return (
    ['mp3', 'm4a'].includes(metadata.ext)
      ? 'audio'
      : ['mp4', 'mov', 'm3u8'].includes(metadata.ext)
          ? 'video'
          : metadata._type
  )
}
