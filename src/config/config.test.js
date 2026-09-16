import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadConfig, loadEnvironment } from './config.js'

const isolated = /** @type {const} */ ({ dotEnvPath: false, processEnv: {} })

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
