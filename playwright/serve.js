import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { cp, mkdtemp, realpath, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { loadEnvironment } from '#config/config.js'
import { startIntegrationServices } from '#test/integration-fixture.js'

const [, , host, port] = process.argv
assert.ok(host === '127.0.0.1' && port, 'Expected a loopback server host and port')
const environment = loadEnvironment()
const database = new URL(environment['PLAYWRIGHT_DATABASE_URL'] ?? environment['DATABASE_URL'] ?? 'postgres://postgres@localhost/postgres')
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname), 'Playwright needs a local PostgreSQL server; set PLAYWRIGHT_DATABASE_URL')

const controller = new AbortController()
process.once('SIGTERM', () => controller.abort())
process.once('SIGINT', () => controller.abort())
const shutdown = once(controller.signal, 'abort')
/** @type {Array<() => Promise<void>>} */
const cleanup = []
/** @type {unknown[]} */
const errors = []
const root = fileURLToPath(new URL('../', import.meta.url))
const dir = await mkdtemp(join(await realpath(tmpdir()), 'breadcrum-playwright-'))
const isolatedEnv = {
  PATH: process.env['PATH'],
  HOME: dir,
  TMPDIR: dir,
  HOST: `${host}:${port}`,
  TRANSPORT: 'http',
  NODE_ENV: 'test',
}

try {
  // Keep source paths and package aliases local to an isolated build without the checkout's .env.
  await Promise.all([
    ...['src', 'package.json'].map(name => cp(join(root, name), join(dir, name), { recursive: true })),
    symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir'),
  ])
  const cli = fileURLToPath(new URL('./bin.js', import.meta.resolve('@domstack/static')))
  await promisify(execFile)(process.execPath, [cli, 'build', '--src', 'src/client', '--dest', 'public'], {
    cwd: dir,
    env: isolatedEnv,
    signal: controller.signal,
  })

  const services = await startIntegrationServices({ after: callback => cleanup.push(callback), signal: controller.signal }, database)
  controller.signal.throwIfAborted()
  // Use the real application entry point, with API and worker roles enabled.
  const app = spawn(process.execPath, [
    '--import', './src/otel.js', 'node_modules/fastify-cli/cli.js', 'start',
    '--config', './src/config/fastify-cli.js', 'src/app.js',
  ], {
    cwd: dir,
    env: {
      ...isolatedEnv,
      APP_ROLE: 'all',
      ENV: 'development',
      LISTEN_HOST: host,
      PORT: port,
      DATABASE_URL: services.databaseUrl,
      REDIS_CACHE_URL: services.redisUrl,
      COOKIE_SECRET: randomUUID(),
      JWT_SECRET: randomUUID(),
      EMAIL_SENDING: 'false',
      EMAIL_VALIDATION: 'false',
      RATE_LIMITING: 'false',
      TURNSTILE_VALIDATE: 'false',
      METRICS: '0',
      JOB_DRAIN_TIMEOUT_MS: '5000',
      SHUTDOWN_TIMEOUT_MS: '15000',
    },
    // Playwright signals the wrapper's process group; forward SIGTERM to Fastify exactly once.
    detached: true,
    stdio: 'inherit',
  })
  const exited = once(app, 'close')
  try {
    await Promise.race([
      shutdown,
      exited.then(([code, signal]) => { throw new Error(`Breadcrum exited unexpectedly (${code ?? signal})`) }),
    ])
  } finally {
    app.kill('SIGTERM')
    const [code, signal] = await exited
    if (code !== 0 || signal) errors.push(new Error(`Breadcrum did not shut down cleanly (${code ?? signal})`))
  }
  await services.assertDisconnected()
} catch (error) {
  errors.push(error)
} finally {
  const results = await Promise.allSettled([
    ...cleanup.map(callback => callback()),
    rm(dir, { recursive: true, force: true }),
  ])
  for (const result of results) {
    if (result.status === 'rejected') errors.push(result.reason)
  }
}
if (errors.length) throw new AggregateError(errors, 'Playwright server failed')
