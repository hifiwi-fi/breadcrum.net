import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dotEnvPath, loadConfig, loadEnvironment, loadRuntimeConfig } from './config.js'
import { envSchema, schemaForRole } from './env-schema.js'

const isolated = /** @type {const} */ ({ dotEnvPath: false, processEnv: {} })

test('runtime role is required with no schema default and the dotenv path is rooted at the repository', () => {
  assert.equal(dotEnvPath, fileURLToPath(new URL('../../.env', import.meta.url)))
  assert.equal('default' in envSchema.properties.APP_ROLE, false)
  for (const role of /** @type {const} */ (['api', 'worker', 'all'])) {
    assert.ok(schemaForRole(role).required.includes('APP_ROLE'))
  }
  assert.throws(() => loadRuntimeConfig(isolated), /APP_ROLE/)
  assert.throws(() => loadRuntimeConfig({ ...isolated, processEnv: { APP_ROLE: 'web' } }), /APP_ROLE/)
  assert.throws(() => loadRuntimeConfig({ ...isolated, envData: { APP_ROLE: 'worker' } }), /APP_ROLE/)
})

test('runtime role selects the schema and defaults before resource startup', () => {
  for (const APP_ROLE of /** @type {const} */ (['api', 'worker', 'all'])) {
    const config = loadRuntimeConfig({
      ...isolated,
      processEnv: { APP_ROLE, COOKIE_SECRET: 'test-cookie', JWT_SECRET: 'test-jwt' },
    })
    assert.equal(config.APP_ROLE, APP_ROLE)
    assert.equal(config.OTEL_SERVICE_NAME, APP_ROLE === 'api' ? 'breadcrum-web' : `breadcrum-${APP_ROLE}`)
    assert.equal(config.METRICS_PORT, APP_ROLE === 'worker' ? 9092 : 9091)
  }
  assert.equal(loadRuntimeConfig({ ...isolated, processEnv: { APP_ROLE: 'worker' } }).COOKIE_SECRET, undefined)
  for (const APP_ROLE of ['api', 'all']) {
    assert.throws(() => loadRuntimeConfig({ ...isolated, processEnv: { APP_ROLE } }), /COOKIE_SECRET|JWT_SECRET/)
  }
  assert.throws(() => loadRuntimeConfig({ ...isolated, processEnv: { APP_ROLE: 'worker', PORT: '65536' } }), /PORT/)
})

test('explicit factory roles override stray environment and envData roles without mutation', () => {
  const before = { ...process.env }
  for (const role of /** @type {const} */ (['api', 'worker', 'all'])) {
    for (const APP_ROLE of [undefined, 'worker', 'api', 'all', 'invalid']) {
      const processEnv = Object.freeze({ APP_ROLE })
      const envData = Object.freeze({ APP_ROLE: 'api', COOKIE_SECRET: 'test-cookie', JWT_SECRET: 'test-jwt' })
      const config = loadConfig(role, { dotEnvPath: false, processEnv, envData })
      assert.equal(config.APP_ROLE, role)
      assert.equal(processEnv.APP_ROLE, APP_ROLE)
      assert.equal(envData.APP_ROLE, 'api')
    }
  }
  const processEnv = Object.freeze({ APP_ROLE: 'worker' })
  assert.equal(loadRuntimeConfig({ dotEnvPath: false, processEnv, envData: { APP_ROLE: 'api' } }).APP_ROLE, 'worker')
  assert.equal(processEnv.APP_ROLE, 'worker')
  assert.deepEqual({ ...process.env }, before)
})

test('runtime and explicit config reject all for either production marker before validating API secrets', () => {
  for (const environment of [
    { NODE_ENV: 'production' },
    { ENV: 'production' },
    { NODE_ENV: 'production', ENV: 'development' },
    { NODE_ENV: 'development', ENV: 'production' },
  ]) {
    const processEnv = { ...environment, APP_ROLE: 'all' }
    assert.throws(() => loadRuntimeConfig({ dotEnvPath: false, processEnv }), /APP_ROLE=all is not allowed in production/)
    assert.throws(() => loadConfig('all', { dotEnvPath: false, processEnv }), /APP_ROLE=all is not allowed in production/)
    for (const role of /** @type {const} */ (['api', 'worker'])) {
      const config = loadRuntimeConfig({
        dotEnvPath: false,
        processEnv: { ...environment, APP_ROLE: role, COOKIE_SECRET: 'test-cookie', JWT_SECRET: 'test-jwt' },
      })
      assert.equal(config.APP_ROLE, role)
    }
  }
  assert.throws(() => loadConfig('all', { ...isolated, envData: { ENV: 'production' } }), /APP_ROLE=all is not allowed in production/)
})

test('log level defaults to info and validates Pino levels before startup', () => {
  assert.equal(loadConfig('worker', isolated).FASTIFY_LOG_LEVEL, 'info')
  for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']) {
    assert.equal(loadConfig('worker', { dotEnvPath: false, processEnv: { FASTIFY_LOG_LEVEL: level } }).FASTIFY_LOG_LEVEL, level)
  }
  assert.throws(() => loadConfig('worker', { dotEnvPath: false, processEnv: { FASTIFY_LOG_LEVEL: 'verbose' } }), /FASTIFY_LOG_LEVEL/)
})

test('worker needs no API secrets; API and all validate them early', () => {
  const worker = loadConfig('worker', isolated)
  assert.equal(worker.COOKIE_SECRET, undefined)
  assert.equal(worker.JWT_SECRET, undefined)
  assert.equal(worker.OTEL_SERVICE_NAME, 'breadcrum-worker')
  assert.equal(worker.METRICS_PORT, 9092)
  assert.throws(() => loadConfig('api', isolated), /COOKIE_SECRET|JWT_SECRET/)
  assert.throws(() => loadConfig('all', isolated), /COOKIE_SECRET|JWT_SECRET/)
  const config = loadConfig('all', { ...isolated, envData: { COOKIE_SECRET: 'test-cookie', JWT_SECRET: 'test-jwt' } })
  assert.equal(config.OTEL_SERVICE_NAME, 'breadcrum-all')
  assert.equal(config.EPISODE_WORKER_CONCURRENCY, 2)
})

test('root dotenv is loaded without modifying process env; explicit environment wins', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'breadcrum-runtime-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const dotEnvPath = join(directory, '.env')
  await writeFile(dotEnvPath, 'HOST=public.example\nPORT=8080\nOTEL_SERVICE_NAME=from-file\nOTEL_TRACES_EXPORTER=none\n')
  assert.equal(loadEnvironment({ dotEnvPath, processEnv: {} })['OTEL_TRACES_EXPORTER'], 'none')
  const before = process.env['OTEL_SERVICE_NAME']
  const config = loadConfig('worker', { dotEnvPath, processEnv: { PORT: '8081', OTEL_SERVICE_NAME: 'from-process' } })
  assert.equal(config.HOST, 'public.example')
  assert.equal(config.LISTEN_HOST, '0.0.0.0')
  assert.equal(config.PORT, 8081)
  assert.equal(config.OTEL_SERVICE_NAME, 'from-process')
  assert.equal(process.env['OTEL_SERVICE_NAME'], before)
})

test('runtime uses dotenv role and config together, with process environment taking precedence', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'breadcrum-role-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const dotEnvPath = join(directory, '.env')
  await writeFile(dotEnvPath, 'APP_ROLE=worker\nPORT=8080\nENV=development\n')
  const before = { ...process.env }
  const fromFile = loadRuntimeConfig({ dotEnvPath, processEnv: {} })
  assert.equal(fromFile.APP_ROLE, 'worker')
  assert.equal(fromFile.PORT, 8080)
  assert.equal(fromFile.METRICS_PORT, 9092)
  const fromProcess = loadRuntimeConfig({
    dotEnvPath,
    processEnv: { APP_ROLE: 'api', PORT: '8081', COOKIE_SECRET: 'test-cookie', JWT_SECRET: 'test-jwt' },
  })
  assert.equal(fromProcess.APP_ROLE, 'api')
  assert.equal(fromProcess.PORT, 8081)
  assert.equal(fromProcess.METRICS_PORT, 9091)
  assert.throws(() => loadRuntimeConfig({ dotEnvPath, processEnv: { APP_ROLE: '' } }), /APP_ROLE/)
  assert.throws(() => loadRuntimeConfig({ dotEnvPath, processEnv: { APP_ROLE: 'all', NODE_ENV: 'production' } }), /not allowed in production/)
  await writeFile(dotEnvPath, 'APP_ROLE=all\nENV=production\n')
  assert.throws(() => loadRuntimeConfig({ dotEnvPath, processEnv: { NODE_ENV: 'development' } }), /not allowed in production/)
  assert.deepEqual({ ...process.env }, before)
})

test('role-specific Sentry DSNs select one effective SDK with legacy fallback', () => {
  const envData = {
    COOKIE_SECRET: 'test-cookie',
    JWT_SECRET: 'test-jwt',
    SENTRY_DSN: 'https://legacy@example.invalid/1',
    SENTRY_API_DSN: 'https://api@example.invalid/2',
    SENTRY_WORKER_DSN: 'https://worker@example.invalid/3',
  }
  assert.equal(loadConfig('api', { ...isolated, envData }).SENTRY_DSN, envData.SENTRY_API_DSN)
  assert.equal(loadConfig('all', { ...isolated, envData }).SENTRY_DSN, envData.SENTRY_API_DSN)
  assert.equal(loadConfig('worker', { ...isolated, envData }).SENTRY_DSN, envData.SENTRY_WORKER_DSN)
  const { SENTRY_API_DSN, SENTRY_WORKER_DSN, ...legacy } = envData
  for (const role of /** @type {const} */ (['api', 'all', 'worker'])) {
    assert.equal(loadConfig(role, { ...isolated, envData: legacy }).SENTRY_DSN, legacy.SENTRY_DSN)
  }
  assert.equal(loadConfig('worker', { ...isolated, envData: { SENTRY_API_DSN } }).SENTRY_DSN, undefined)
  assert.equal(loadConfig('all', { ...isolated, envData: { ...legacy, SENTRY_WORKER_DSN } }).SENTRY_DSN, legacy.SENTRY_DSN)
  assert.equal(loadConfig('worker', { ...isolated, envData: { ...envData, SENTRY_WORKER_DSN: '' } }).SENTRY_DSN, envData.SENTRY_DSN)
})

test('invalid concurrency, listener, and drain budgets fail before resource startup', () => {
  assert.throws(() => loadConfig('worker', { ...isolated, envData: { EPISODE_WORKER_CONCURRENCY: 0 } }), /EPISODE_WORKER_CONCURRENCY/)
  assert.throws(() => loadConfig('worker', { ...isolated, envData: { PORT: 65536 } }), /PORT/)
  assert.throws(() => loadConfig('worker', { ...isolated, envData: { SHUTDOWN_TIMEOUT_MS: 30000 } }), /must exceed/)
})
