/**
 * @import { TestContext } from 'node:test'
 * @import { AddressInfo } from 'node:net'
 * @import { QueryResult } from 'pg'
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'
import { Client } from 'pg'
import { loadConfig } from '#config/config.js'

const execFileAsync = promisify(execFile)

/**
 * Provision a disposable migrated database and Redis process for an integration suite.
 * @param {{ after: (callback: () => Promise<void>) => void, signal: AbortSignal }} lifecycle
 * @param {URL} defaultDatabaseUrl PostgreSQL endpoint with permission to create a database
 */
export async function startIntegrationServices ({ after, signal }, defaultDatabaseUrl) {
  const databaseName = `breadcrum_runtime_${randomUUID().replaceAll('-', '')}`
  const databaseUrl = new URL(defaultDatabaseUrl)
  databaseUrl.pathname = `/${databaseName}`
  const adminDatabaseUrl = new URL(defaultDatabaseUrl)
  adminDatabaseUrl.pathname = '/postgres'
  const databaseUrlString = databaseUrl.toString()
  const admin = new Client({ connectionString: adminDatabaseUrl.toString(), ssl: false, connectionTimeoutMillis: 2000 })
  await admin.connect()
  // The caller must shut down the application before running service cleanup.
  after(async () => {
    try {
      await admin.query(`drop database if exists ${databaseName} with (force)`)
    } finally {
      await admin.end()
    }
  })
  await admin.query(`create database ${databaseName}`)
  const migrations = new URL('../../migrations/', import.meta.url)
  const files = (await readdir(migrations)).filter(name => /^\d+\.do\./.test(name)).sort()
  assert.ok(files.length > 0)
  // Exercise the root CLI against a fresh database, never the local config's database.
  const migrate = () => execFileAsync(process.execPath, [
    fileURLToPath(new URL('../../node_modules/postgrator-cli/index.js', import.meta.url)),
    '--no-config',
  ], {
    cwd: new URL('../../', import.meta.url),
    env: {
      PGHOST: defaultDatabaseUrl.hostname,
      ...(defaultDatabaseUrl.port ? { PGPORT: defaultDatabaseUrl.port } : {}),
      PGUSER: decodeURIComponent(defaultDatabaseUrl.username),
      ...(defaultDatabaseUrl.password ? { PGPASSWORD: decodeURIComponent(defaultDatabaseUrl.password) } : {}),
      PGDATABASE: databaseName,
      PGSSLMODE: 'disable',
    },
    timeout: 30000,
    killSignal: 'SIGKILL',
    signal,
  })
  await migrate()
  const client = new Client({ connectionString: databaseUrlString, ssl: false })
  try {
    await client.connect()
    /** @type {QueryResult<{version: string}>} */
    const applied = await client.query('select version from schemaversion order by version')
    // Postgrator seeds version zero and stores versions as bigint (strings in pg).
    assert.deepEqual(applied.rows.map(row => Number(row.version)), [0, ...files.map(file => Number(file.split('.')[0]))])
    // A second invocation must recognize the existing version table and be a no-op.
    await migrate()
    const unchanged = await client.query('select version from schemaversion order by version')
    assert.deepEqual(unchanged.rows, applied.rows)
  } finally {
    await client.end()
  }

  const directory = await mkdtemp(join(tmpdir(), 'breadcrum-redis-'))
  const reservation = createServer()
  reservation.listen(0, '127.0.0.1')
  await once(reservation, 'listening')
  const address = /** @type {AddressInfo} */ (reservation.address())
  await new Promise(resolve => reservation.close(resolve))
  const redis = spawn('redis-server', [
    '--bind', '127.0.0.1', '--port', String(address.port),
    '--save', '', '--appendonly', 'no', '--dir', directory,
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
  const exited = once(redis, 'exit')
  // Observe spawn errors immediately, even if startup fails before cleanup begins.
  exited.catch(() => {})
  after(async () => {
    try {
      redis.kill('SIGTERM')
      await exited
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
  let output = ''
  await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`Test Redis failed to start: ${output}`)), 5000)
    redis.once('error', error => {
      clearTimeout(deadline)
      reject(new Error('Unable to start isolated test Redis; install redis-server on PATH (including the CI runner)', { cause: error }))
    })
    redis.once('exit', code => {
      clearTimeout(deadline)
      reject(new Error(`Test Redis exited (${code}): ${output}`))
    })
    redis.stderr.on('data', chunk => { output += chunk.toString() })
    redis.stdout.on('data', chunk => {
      output += chunk.toString()
      if (output.includes('Ready to accept connections')) {
        clearTimeout(deadline)
        resolve(undefined)
      }
    })
  })

  return {
    databaseUrl: databaseUrlString,
    redisUrl: `redis://127.0.0.1:${address.port}/0`,
    async assertDisconnected () {
      /** @type {QueryResult<{connections: number}>} */
      const result = await admin.query('select count(*)::integer as connections from pg_stat_activity where datname = $1', [databaseName])
      assert.equal(result.rows[0]?.connections, 0, 'All application and boss pool connections must be closed')
    },
  }
}

/** @param {TestContext} t */
export async function integrationFixture (t) {
  const services = await startIntegrationServices({ after: callback => t.after(callback), signal: t.signal }, new URL(loadConfig('worker').DATABASE_URL))
  return {
    ...services,
    assertDisconnected: () => t.waitFor(services.assertDisconnected, { timeout: 2000, interval: 25 }),
  }
}
