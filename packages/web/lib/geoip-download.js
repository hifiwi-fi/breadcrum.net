/**
 * @import { Dispatcher } from 'undici'
 */
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { constants as fsConstants, createReadStream, createWriteStream } from 'node:fs'
import { access, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import { request } from 'undici'

const execFileAsync = promisify(execFile)

/**
 * @typedef {object} GeoIpDownloadLogger
 * @property {(obj: object | string, msg?: string) => void} info
 * @property {(obj: object | string, msg?: string) => void} warn
 */

/**
 * @typedef {object} GeoIpRequestOptions
 * @property {Record<string, string>} [headers]
 * @property {string} [method]
 */

/**
 * @typedef {object} GeoIpDownloadOptions
 * @property {string} accountId
 * @property {string} licenseKey
 * @property {string} editionId
 * @property {string} dataDir
 * @property {boolean} [force]
 * @property {GeoIpDownloadLogger} logger
 */

/**
 * @param {string} dir
 * @returns {Promise<string | null>}
 */
async function findMmdbFile (dir) {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      const nested = await findMmdbFile(entryPath)
      if (nested) return nested
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.mmdb')) {
      return entryPath
    }
  }

  return null
}

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function sha256File (filePath) {
  const hash = createHash('sha256')
  const stream = createReadStream(filePath)

  for await (const chunk of stream) {
    hash.update(chunk)
  }

  return hash.digest('hex')
}

/**
 * @param {Dispatcher.ResponseData} response
 * @returns {Promise<void>}
 */
async function drainResponse (response) {
  if (!response.body) return
  for await (const chunk of response.body) {
    if (chunk) {
      // Drain body to allow socket reuse.
    }
  }
}

/**
 * @param {Dispatcher.ResponseData} response
 * @param {string} headerName
 * @returns {string | null}
 */
function getHeaderValue (response, headerName) {
  const value = response.headers[headerName]
  if (Array.isArray(value)) {
    return value.length ? String(value[0]) : null
  }
  return value ? String(value) : null
}

/**
 * @param {URL} url
 * @param {GeoIpRequestOptions} options
 * @param {number} [maxRedirects]
 * @returns {Promise<Dispatcher.ResponseData>}
 */
async function requestWithRedirects (url, options, maxRedirects = 5) {
  const response = await request(url, options)
  const location = response.headers['location']
  if (response.statusCode >= 300 && response.statusCode < 400 && location) {
    if (maxRedirects <= 0) {
      await drainResponse(response)
      throw new Error('GeoIP download redirect limit exceeded.')
    }
    const redirectUrl = new URL(String(location), url)
    await drainResponse(response)
    return requestWithRedirects(redirectUrl, options, maxRedirects - 1)
  }
  return response
}

/**
 * Download and update the MaxMind database, using conditional headers and checksums.
 * @param {GeoIpDownloadOptions} options
 * @returns {Promise<boolean>} Whether the database was updated.
 */
export async function updateGeoipDatabase ({
  accountId,
  licenseKey,
  editionId,
  dataDir,
  force = false,
  logger,
}) {
  const archiveSuffix = 'tar.gz'
  const shaSuffix = `${archiveSuffix}.sha256`
  const dbFileName = `${editionId}.mmdb`
  const dbPath = join(dataDir, dbFileName)
  const metadataPath = join(dataDir, `${editionId}.metadata.json`)

  await mkdir(dataDir, { recursive: true })

  /** @type {{ etag?: string, lastModified?: string, lastCheckedAt?: string } | null} */
  let metadata = null
  try {
    const raw = await readFile(metadataPath, 'utf8')
    metadata = JSON.parse(raw)
  } catch (err) {
    const error = /** @type {NodeJS.ErrnoException} */ (err)
    if (error.code !== 'ENOENT') {
      throw err
    }
  }

  if (!force && metadata?.lastCheckedAt) {
    let dbExists = false
    try {
      await access(dbPath, fsConstants.R_OK)
      dbExists = true
    } catch (_err) {
      dbExists = false
    }

    if (dbExists) {
      const lastChecked = Date.parse(metadata.lastCheckedAt)
      if (!Number.isNaN(lastChecked)) {
        const nextCheck = lastChecked + 3 * 60 * 60 * 1000
        if (Date.now() < nextCheck) {
          logInfo(logger, 'GeoIP database check skipped (checked within 3h).')
          return false
        }
      }
    }
  }

  const archiveUrl = new URL(`https://download.maxmind.com/geoip/databases/${editionId}/download`)
  archiveUrl.searchParams.set('suffix', archiveSuffix)

  const authHeader = Buffer.from(`${accountId}:${licenseKey}`, 'utf8').toString('base64')

  /** @type {Record<string, string>} */
  const headers = {
    Authorization: `Basic ${authHeader}`,
  }
  if (!force) {
    if (metadata?.etag) {
      headers['If-None-Match'] = metadata.etag
    }
    if (metadata?.lastModified) {
      headers['If-Modified-Since'] = metadata.lastModified
    }
  }

  const headResponse = await requestWithRedirects(archiveUrl, { headers, method: 'HEAD' })

  if (headResponse.statusCode === 304) {
    const updatedMetadata = {
      ...metadata,
      lastCheckedAt: new Date().toISOString(),
    }

    await writeFile(metadataPath, `${JSON.stringify(updatedMetadata, null, 2)}\n`)
    logInfo(logger, 'GeoIP database is already up to date (HEAD 304).')
    await drainResponse(headResponse)
    return false
  }

  if (headResponse.statusCode < 200 || headResponse.statusCode >= 300) {
    await drainResponse(headResponse)
    throw new Error(`GeoIP HEAD check failed with status ${headResponse.statusCode}.`)
  }

  const headLastModified = getHeaderValue(headResponse, 'last-modified')
  const headEtag = getHeaderValue(headResponse, 'etag')
  await drainResponse(headResponse)

  if (!force) {
    let dbExists = false
    let dbMtimeMs = null
    try {
      const fileStat = await stat(dbPath)
      dbExists = true
      dbMtimeMs = fileStat.mtimeMs
    } catch (_err) {
      dbExists = false
    }

    if (dbExists) {
      const headTime = headLastModified ? Date.parse(headLastModified) : NaN
      const metadataMatchesHead = Boolean(
        (headEtag && metadata?.etag && headEtag === metadata.etag) ||
        (headLastModified && metadata?.lastModified && headLastModified === metadata.lastModified)
      )
      const dbNewEnough = Number.isFinite(headTime) && dbMtimeMs !== null && dbMtimeMs >= headTime

      if (metadataMatchesHead || dbNewEnough) {
        const updatedMetadata = {
          ...metadata,
          etag: headEtag ?? metadata?.etag,
          lastModified: headLastModified ?? metadata?.lastModified,
          lastCheckedAt: new Date().toISOString(),
        }

        await writeFile(metadataPath, `${JSON.stringify(updatedMetadata, null, 2)}\n`)
        logInfo(logger, 'GeoIP database is already up to date (HEAD match).')
        return false
      }
    }
  }

  const archiveResponse = await requestWithRedirects(archiveUrl, { headers, method: 'GET' })

  if (archiveResponse.statusCode === 304) {
    const updatedMetadata = {
      ...metadata,
      lastCheckedAt: new Date().toISOString(),
    }

    await writeFile(metadataPath, `${JSON.stringify(updatedMetadata, null, 2)}\n`)
    logInfo(logger, 'GeoIP database is already up to date.')
    await drainResponse(archiveResponse)
    return false
  }

  if (archiveResponse.statusCode < 200 || archiveResponse.statusCode >= 300) {
    await drainResponse(archiveResponse)
    throw new Error(`GeoIP download failed with status ${archiveResponse.statusCode}.`)
  }

  if (!archiveResponse.body) {
    throw new Error('GeoIP download failed with an empty response body.')
  }

  const archivePath = join(tmpdir(), `${editionId}-${Date.now()}.${archiveSuffix}`)
  await pipeline(archiveResponse.body, createWriteStream(archivePath))

  const shaUrl = new URL(archiveUrl)
  shaUrl.searchParams.set('suffix', shaSuffix)

  const shaResponse = await requestWithRedirects(shaUrl, { method: 'GET' })
  if (shaResponse.statusCode < 200 || shaResponse.statusCode >= 300) {
    await drainResponse(shaResponse)
    throw new Error(`GeoIP checksum download failed with status ${shaResponse.statusCode}.`)
  }

  const shaText = (await readResponseText(shaResponse)).trim()
  const expectedHash = shaText.split(/\s+/)[0]
  const actualHash = await sha256File(archivePath)

  if (expectedHash && expectedHash !== actualHash) {
    throw new Error('GeoIP checksum verification failed.')
  }

  const extractDir = join(tmpdir(), `${editionId}-${Date.now()}`)
  await mkdir(extractDir, { recursive: true })
  await execFileAsync('tar', ['-xzf', archivePath, '-C', extractDir])

  const extractedPath = await findMmdbFile(extractDir)
  if (!extractedPath) {
    throw new Error('GeoIP download did not contain a .mmdb file.')
  }

  await copyFile(extractedPath, dbPath)
  await access(dbPath, fsConstants.R_OK)

  const newMetadata = {
    editionId,
    etag: getHeaderValue(archiveResponse, 'etag'),
    lastModified: getHeaderValue(archiveResponse, 'last-modified'),
    sha256: actualHash,
    downloadedAt: new Date().toISOString(),
    lastCheckedAt: new Date().toISOString(),
  }

  await writeFile(metadataPath, `${JSON.stringify(newMetadata, null, 2)}\n`)
  await rm(archivePath, { force: true })
  await rm(extractDir, { recursive: true, force: true })

  logInfo(logger, `GeoIP database updated at ${dbPath}.`)
  return true
}

/**
 * @param {Dispatcher.ResponseData} response
 * @returns {Promise<string>}
 */
async function readResponseText (response) {
  if (!response.body) return ''
  /** @type {Buffer[]} */
  const chunks = []
  for await (const chunk of response.body) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * @param {GeoIpDownloadLogger} logger
 * @param {string} message
 * @param {object} [meta]
 * @returns {void}
 */
function logInfo (logger, message, meta) {
  if (meta) {
    logger.info(meta, message)
    return
  }
  logger.info(message)
}
