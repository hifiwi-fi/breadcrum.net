import SQL from '@nearform/sql'
import YTDlpWrapExports from 'yt-dlp-wrap'
import cp from 'child_process'
import path from 'path'
import util from 'util'
import desm from 'desm'
import { getFileKey } from './file-key.js'
import { cache } from './temp-cache.js'
import * as fs from 'fs/promises'

const exec = util.promisify(cp.exec)

const __dirname = desm(import.meta.url)

let binPath

const YTDlpWrap = YTDlpWrapExports.default

try {
  const { stdout } = await exec('which yt-dlp')
  binPath = stdout.trim()
} catch (err) {
  const fallbackPath = path.join(__dirname, '../yt-dlp')
  try {
    await fs.stat(fallbackPath)
    binPath = fallbackPath
  } catch (err) {
    console.warn('Error looking for yt-dlp, downloading it')
    await YTDlpWrap.downloadFromGithub()
    binPath = fallbackPath
  }
}

export async function getYTDLPUrl ({
  url
}) {
  const ytDlpWrap = new YTDlpWrap(binPath)
  const args = [
    url,
    '-f',
    'best[ext=mp4]/ba[ext=m4a]'
  ]

  const metadata = await ytDlpWrap.getVideoInfo(args)
  return metadata
}

export function runYTDLP ({
  userId,
  bookmarkId,
  episodeId,
  pg,
  log
}) {
  return async () => {
    const ytDlpWrap = new YTDlpWrap(binPath)
    const bookmarkQuery = SQL`
              select url from bookmarks
              WHERE id = ${bookmarkId}
              AND owner_id =${userId};
            `
    const bookmarkResults = await pg.query(bookmarkQuery)
    const bookmark = bookmarkResults.rows[0]
    const { url } = bookmark
    if (!bookmark?.url) throw new Error(`Error looking up bookmark for ${bookmarkId} while populating episode ${episodeId}`)
    const args = [
      url,
      '-f',
      'best[ext=mp4]/ba[ext=m4a]'
    ]

    try {
      const metadata = await ytDlpWrap.getVideoInfo(args)
      const videoData = []

      videoData.push(SQL`ready = true`)
      videoData.push(SQL`url = ${url}`)
      if (metadata.filesize_approx != null) videoData.push(SQL`size_in_bytes = ${metadata.filesize_approx}`)
      if (metadata.duration != null) videoData.push(SQL`duration_in_seconds = ${metadata.duration}`)
      if (metadata.channel != null) videoData.push(SQL`author_name = ${metadata.channel}`)
      if (metadata.filename != null) videoData.push(SQL`filename = ${metadata.filename}`)
      if (metadata.ext != null) videoData.push(SQL`ext = ${metadata.ext}`)
      if (metadata._type != null) videoData.push(SQL`src_type = ${metadata._type}`)

      const query = SQL`
        update episodes
        set ${SQL.glue(videoData, ' , ')}
        where id = ${episodeId}
        and owner_id =${userId}
        returning type, medium;`

      const epResults = await pg.query(query)
      const episode = epResults.rows.pop()

      const cacheKey = getFileKey({
        userId,
        episodeId,
        sourceUrl: url,
        type: episode.type,
        medium: episode.medium
      })

      cache.set(cacheKey, metadata.urls)

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
    }
  }
}
