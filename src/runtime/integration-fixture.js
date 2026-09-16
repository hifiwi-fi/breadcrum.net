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

const execFileAsync = promisify(execFile)

/**
 * Deliberately ignores DATABASE_URL, PGHOST, REDIS_CACHE_URL, and dotenv.
 * Requires a local postgres role allowed to create databases and the redis-server executable.
 * @param {TestContext} t
 */
export async function integrationFixture (t) {
  const databaseName = `breadcrum_runtime_${randomUUID().replaceAll('-', '')}`
  // Explicit local-test credentials match the PostgreSQL service in .github/workflows/tests.yml.
  const databaseUrl = `postgres://postgres:postgres@127.0.0.1:5432/${databaseName}`
  const admin = new Client({ connectionString: 'postgres://postgres:postgres@127.0.0.1:5432/postgres', ssl: false, connectionTimeoutMillis: 2000 })
  await admin.connect()
  // This hook is scoped to the parent suite, after all child application cleanup.
  t.after(async () => {
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
      PGHOST: '127.0.0.1',
      PGPORT: '5432',
      PGUSER: 'postgres',
      PGPASSWORD: 'postgres',
      PGDATABASE: databaseName,
      PGSSLMODE: 'disable',
    },
    timeout: 30000,
    killSignal: 'SIGKILL',
    signal: t.signal,
  })
  await migrate()
  const client = new Client({ connectionString: databaseUrl, ssl: false })
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
  t.after(async () => {
    redis.kill('SIGTERM')
    await exited
    await rm(directory, { recursive: true, force: true })
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
    databaseUrl,
    redisUrl: `redis://127.0.0.1:${address.port}/0`,
    async assertDisconnected () {
      await t.waitFor(async () => {
        /** @type {QueryResult<{connections: number}>} */
        const result = await admin.query('select count(*)::integer as connections from pg_stat_activity where datname = $1', [databaseName])
        assert.equal(result.rows[0]?.connections, 0, 'All application and boss pool connections must be closed')
      }, { timeout: 2000, interval: 25 })
    },
  }
}
