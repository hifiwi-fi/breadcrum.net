import SQL from '@nearform/sql'
import { getFileKey } from './file-key.js'
import { cache } from './temp-cache.js'
import { request as undiciRequest } from 'undici'

const videoFormat = 'best[ext=mp4]/best[ext=mov]/mp4/mov'
const audioFormat = 'ba[ext=m4a]/ba[ext=mp4]/ba[ext=mp3]/mp3/m4a'

function getFormatArg (medium) {
  if (!['video', 'audio'].includes(medium)) throw new Error('format must be video or audio')

  const formatOpts = medium === 'video'
    ? [videoFormat, audioFormat].join('/')
    : medium === 'audio'
      ? [audioFormat, videoFormat].join('/')
      : null

  if (!formatOpts) throw new Error('No format options generated. Please report this bug')

  return formatOpts
}

export async function getYTDLPUrl ({
  apiURL,
  url,
  medium,
  histogram
}) {
  const endTimer = histogram.startTimer()
  try {
    const formatOpts = getFormatArg(medium)
    const requestURL = new URL(apiURL)
    requestURL.searchParams.set('url', url)
    requestURL.searchParams.set('format', formatOpts)
    requestURL.pathname = 'info'

    const response = await undiciRequest(requestURL, {
      headers: {
        Accept: 'application/json',
        Authorization: 'Basic ' + btoa(requestURL.username + ':' + requestURL.password)
      }
    })

    if (response.statusCode !== 200) {
      const text = await response.body.text()
      throw new Error('yt-dlp error: ' + text)
    }

    const metadata = await response.body.json()

    return metadata
  } finally {
    endTimer()
  }
}

export function runYTDLP ({
  userId,
  apiURL,
  bookmarkId,
  episodeId,
  medium,
  pg,
  histogram,
  log
}) {
  return async () => {
    const endTimer = histogram.startTimer()
    const bookmarkQuery = SQL`
              select url from bookmarks
              WHERE id = ${bookmarkId}
              AND owner_id =${userId};
            `
    const bookmarkResults = await pg.query(bookmarkQuery)
    const bookmark = bookmarkResults.rows[0]
    const { url } = bookmark
    if (!bookmark?.url) throw new Error(`Error looking up bookmark for ${bookmarkId} while populating episode ${episodeId}`)

    const formatOpts = getFormatArg(medium)
    try {
      const requestURL = new URL(apiURL)
      requestURL.searchParams.set('url', url)
      requestURL.searchParams.set('format', formatOpts)
      requestURL.pathname = 'info'

      const response = await undiciRequest(requestURL, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Basic ' + btoa(requestURL.username + ':' + requestURL.password)
        }
      })

      if (response.statusCode !== 200) {
        const text = await response.body.text()
        throw new Error('yt-dlp error: ' + text)
      }

      const metadata = await response.body.json()
      // console.dir(metadata, { colors: true, depth: 999 })
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
      if (metadata.title != null) {
        videoData.push(SQL`title = ${metadata.title}`)
      }
      if (metadata.ext != null) videoData.push(SQL`ext = ${metadata.ext}`)
      if (metadata._type != null) videoData.push(SQL`src_type = ${['mp3', 'm4a'].includes(metadata.ext) ? 'audio' : ['mp4', 'mov', 'm3u8'].includes(metadata.ext) ? 'video' : metadata._type}`)

      const query = SQL`
        update episodes
        set ${SQL.glue(videoData, ' , ')}
        where id = ${episodeId}
        and owner_id =${userId}
        returning type, medium;
      `

      const epResults = await pg.query(query)
      const episode = epResults.rows.pop()

      const cacheKey = getFileKey({
        userId,
        episodeId,
        sourceUrl: url,
        type: episode.type,
        medium: episode.medium
      })

      cache.set(cacheKey, metadata.url)

      log.info(`Episode ${episodeId} for ${url} is ready.`)
    } catch (err) {
      log.error(`Error extracting video for episode ${episodeId}`)
      log.error(err)
      const errorQuery = SQL`
        update episodes
        set error = ${err.stack}
        where id = ${episodeId}
        and owner_id =${userId};`
      await pg.query(errorQuery)
    } finally {
      endTimer()
    }
  }
}
