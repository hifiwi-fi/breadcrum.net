import { watch } from 'node:fs'
import { copyFile, cp, mkdir, open, readdir, stat, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const webRoot = path.resolve(import.meta.dirname, '..')
const publicDir = path.join(webRoot, 'public')
const publicAssetsDir = path.join(publicDir, 'assets')
const publicContentDir = path.join(publicDir, 'content')
const contentDir = path.join(webRoot, 'content')
const assetsDir = path.join(webRoot, 'assets')
const staticAssetsDir = path.join(assetsDir, 'static')
const buildLockPath = path.join(publicDir, '.build-assets.lock')
const buildLockStaleMs = 30_000
const watchMode = process.argv.includes('--watch')
const contentAssetExtensions = new Set(['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'])

if (watchMode) {
  await watchAssets()
} else {
  await buildAssets()
}

async function buildAssets () {
  await withBuildLock(copyAssets)
}

async function copyAssets () {
  await mkdir(publicAssetsDir, { recursive: true })

  await Promise.all([
    cp(staticAssetsDir, path.join(publicDir, 'static'), {
      recursive: true,
      force: true,
    }),
    copyContentAssets(),
    copyFile(path.join(assetsDir, 'favicon.ico'), path.join(publicDir, 'favicon.ico')),
    copyFile(path.join(assetsDir, 'app.css'), path.join(publicAssetsDir, 'app.css')),
    copyFile(path.join(assetsDir, 'app.js'), path.join(publicAssetsDir, 'app.js')),
    copyFile(path.join(assetsDir, 'register.js'), path.join(publicAssetsDir, 'register.js')),
    copyFile(path.join(assetsDir, 'passkey-login.js'), path.join(publicAssetsDir, 'passkey-login.js')),
    copyFile(path.join(assetsDir, 'passkey-register.js'), path.join(publicAssetsDir, 'passkey-register.js')),
    copyFile(
      fileURLToPath(import.meta.resolve('htmx.org/dist/htmx.min.js')),
      path.join(publicAssetsDir, 'htmx.min.js')
    ),
    copyFile(
      fileURLToPath(import.meta.resolve('htmx.org/dist/htmx.min.js.map')),
      path.join(publicAssetsDir, 'htmx.min.js.map')
    ),
    copyFile(
      fileURLToPath(import.meta.resolve('giscus')),
      path.join(publicAssetsDir, 'giscus.mjs')
    ),
    copyFile(
      fileURLToPath(import.meta.resolve('@passwordless-id/webauthn/dist/browser/webauthn.min.js')),
      path.join(publicAssetsDir, 'webauthn.min.js')
    ),
    copyFile(
      fileURLToPath(import.meta.resolve('@passwordless-id/webauthn/dist/browser/webauthn.min.js.map')),
      path.join(publicAssetsDir, 'webauthn.min.js.map')
    ),
  ])
}

/**
 * @param {() => Promise<void>} callback
 * @returns {Promise<void>}
 */
async function withBuildLock (callback) {
  await mkdir(publicDir, { recursive: true })

  while (true) {
    /** @type {import('node:fs/promises').FileHandle | null} */
    let lock = null
    try {
      lock = await open(buildLockPath, 'wx')
      try {
        await callback()
      } finally {
        await lock.close()
        lock = null
        await unlink(buildLockPath).catch(() => {})
      }
      return
    } catch (error) {
      if (lock) await lock.close()
      if (!isNodeError(error) || error.code !== 'EEXIST') throw error

      if (await lockIsStale()) {
        await unlink(buildLockPath).catch(() => {})
        continue
      }

      await sleep(50)
    }
  }
}

/**
 * @returns {Promise<boolean>}
 */
async function lockIsStale () {
  try {
    const lockStat = await stat(buildLockPath)
    return Date.now() - lockStat.mtimeMs > buildLockStaleMs
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return false
    throw error
  }
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function watchAssets () {
  await buildAssets()
  console.log('watching frontend assets')

  /** @type {NodeJS.Timeout | null} */
  let rebuildTimer = null

  const rebuild = () => {
    if (rebuildTimer) clearTimeout(rebuildTimer)
    rebuildTimer = setTimeout(() => {
      buildAssets().catch(err => {
        console.error(err)
      })
    }, 50)
  }

  const watchers = [
    watch(assetsDir, { recursive: true }, rebuild),
    watch(contentDir, { recursive: true }, rebuild),
  ]

  await new Promise(resolve => {
    const stop = () => {
      for (const watcher of watchers) watcher.close()
      if (rebuildTimer) clearTimeout(rebuildTimer)
      resolve(undefined)
    }

    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  })
}

async function copyContentAssets () {
  await copyContentAssetsFrom(contentDir, publicContentDir)
}

/**
 * @param {string} sourceDir
 * @param {string} destDir
 * @returns {Promise<void>}
 */
async function copyContentAssetsFrom (sourceDir, destDir) {
  let entries
  try {
    entries = await readdir(sourceDir, { withFileTypes: true })
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return
    throw error
  }

  await Promise.all(entries.map(async entry => {
    const sourcePath = path.join(sourceDir, entry.name)
    const destPath = path.join(destDir, entry.name)

    if (entry.isDirectory()) {
      await copyContentAssetsFrom(sourcePath, destPath)
      return
    }

    if (!entry.isFile()) return
    if (!contentAssetExtensions.has(path.extname(entry.name).toLowerCase())) return

    await mkdir(path.dirname(destPath), { recursive: true })
    await copyFile(sourcePath, destPath)
  }))
}

/**
 * @param {unknown} error
 * @returns {error is NodeJS.ErrnoException}
 */
function isNodeError (error) {
  return error instanceof Error && 'code' in error
}
