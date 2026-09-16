/**
 * @import { AddressInfo } from 'node:net'
 * @import { QueryResult } from 'pg'
 * @import { RuntimeConfig } from '#config/env-schema.js'
 * @import { TypeBookmarkReadClient } from '#api/routes/api/bookmarks/schemas/schema-bookmark-read.js'
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { execFile, spawn } from 'node:child_process'
import { cp, mkdtemp, readdir, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import { PgBoss } from 'pg-boss'
import { createApp } from '../app.js'
import { loadConfig } from '#config/config.js'
import { integrationFixture } from './integration-fixture.js'

const execFileAsync = promisify(execFile)

test('unified role application integration', { timeout: 120000 }, async t => {
  const fixture = await integrationFixture(t)
  const common = /** @satisfies {Partial<RuntimeConfig>} */ ({
    DATABASE_URL: fixture.databaseUrl,
    REDIS_CACHE_URL: fixture.redisUrl,
    METRICS: 0,
  })
  const api = {
    ...common,
    COOKIE_SECRET: 'runtime-integration-cookie-secret',
    JWT_SECRET: 'runtime-integration-jwt-secret',
    EMAIL_SENDING: false,
    EMAIL_VALIDATION: false,
    RATE_LIMITING: false,
    TURNSTILE_VALIDATE: false,
  }
  const isolated = /** @type {const} */ ({ dotEnvPath: false, processEnv: {} })

  await t.test('worker is healthy without auth secrets or API/static routes', async t => {
    const config = loadConfig('worker', { ...isolated, envData: common })
    assert.equal(config.COOKIE_SECRET, undefined)
    assert.equal(config.JWT_SECRET, undefined)
    const app = await createApp({ role: 'worker', config, serverOptions: { logger: false } })
    t.after(() => app.close())
    assert.equal((await app.inject('/health')).statusCode, 200)
    assert.equal((await app.inject('/api/user')).statusCode, 404)
    assert.equal((await app.inject('/')).statusCode, 404)
    assert.equal(app.hasDecorator('jwt'), false)
    assert.equal(app.hasReplyDecorator('sendFile'), false)
    assert.equal(Object.keys(app.pgboss.workers).length, 5)
    await app.close()
    await fixture.assertDisconnected()
  })

  for (const level of /** @type {const} */ (['debug', 'warn'])) {
    await t.test(`direct app factory uses validated ${level} log level`, async t => {
      const config = loadConfig('worker', { ...isolated, envData: { ...common, FASTIFY_LOG_LEVEL: level } })
      const app = await createApp({ role: 'worker', config })
      t.after(() => app.close())
      assert.equal(app.log.level, level)

      await app.close()
      await fixture.assertDisconnected()
    })
  }

  await t.test('API is healthy with producers but no domain or scheduler consumers', async t => {
    const config = loadConfig('api', { ...isolated, envData: api })
    const app = await createApp({ role: 'api', config, serverOptions: { logger: false } })
    t.after(() => app.close())
    assert.equal((await app.inject('/health')).statusCode, 200)
    assert.equal((await app.inject('/api/user')).statusCode, 401)
    assert.deepEqual(app.pgboss.workers, {})
    assert.deepEqual(app.pgboss.boss.getWipData({ includeInternal: true }), [])
    await app.close()
    await fixture.assertDisconnected()
  })

  await t.test('runtime image layout serves Swagger and built assets without client source', { timeout: 30000 }, async t => {
    const directory = await mkdtemp(join(tmpdir(), 'breadcrum-runtime-image-'))
    t.after(() => rm(directory, { recursive: true, force: true }))
    const files = ['package.json', 'src', 'public', 'migrations']
    await Promise.all(files.map(name => cp(new URL(`../../${name}`, import.meta.url), join(directory, name), { recursive: true })))
    // This tests source/asset packaging; production-only dependency installation is separate.
    await symlink(fileURLToPath(new URL('../../node_modules', import.meta.url)), join(directory, 'node_modules'), 'dir')
    assert.deepEqual((await readdir(directory)).sort(), [...files, 'node_modules'].sort())
    const config = loadConfig('api', { ...isolated, envData: { ...api, SWAGGER: true, PORT: 0, FASTIFY_LOG_LEVEL: 'silent' } })
    const { stdout } = await execFileAsync(process.execPath, ['--input-type=module', '--eval', `
      import assert from 'node:assert/strict'
      import { access, readFile } from 'node:fs/promises'
      import { createApp } from './src/app.js'
      await assert.rejects(access('client'), { code: 'ENOENT' })
      const logo = await readFile('public/static/bread.png')
      assert.ok(logo.length > 0)
      const app = await createApp({ role: 'api', dotEnvPath: false })
      try {
        assert.equal(app.log.level, 'silent')
        assert.deepEqual(app.pgboss.workers, {})
        assert.equal((await app.inject('/health')).statusCode, 200)
        const page = await app.inject('/openapi/')
        assert.equal(page.statusCode, 200, page.body)
        assert.match(page.headers['content-type'], /text\\/html/)
        const spec = await app.inject('/openapi/json')
        assert.equal(spec.statusCode, 200, spec.body)
        assert.equal(spec.json().info.title, 'Breadcrum API')
        const initializer = await app.inject('/openapi/static/swagger-initializer.js')
        assert.equal(initializer.statusCode, 200, initializer.body)
        assert.ok(initializer.body.includes('data:image/png;base64,' + logo.toString('base64')))
        const asset = await app.inject('/static/bread.png')
        assert.equal(asset.statusCode, 200)
        assert.deepEqual(asset.rawPayload, logo)
      } finally {
        await app.close()
      }
      console.log('RUNTIME_IMAGE_VALIDATED')
    `], {
      cwd: directory,
      env: {
        ...Object.fromEntries(Object.entries(config).map(([key, value]) => [key, String(value)])),
        NODE_ENV: 'production',
      },
      timeout: 20000,
      killSignal: 'SIGKILL',
      signal: t.signal,
    })
    assert.match(stdout, /RUNTIME_IMAGE_VALIDATED/)
    await fixture.assertDisconnected()
  })

  await t.test('all: real authenticated API enqueue completes in a native worker in the same PID', { timeout: 30000 }, async t => {
    const page = createServer((_request, response) => {
      response.setHeader('Content-Type', 'text/html')
      response.end('<!doctype html><html><head><title>Unified runtime integration</title></head><body><p>A local test page.</p></body></html>')
    })
    page.listen(0, '127.0.0.1')
    await once(page, 'listening')
    t.after(() => new Promise(resolve => page.close(resolve)))
    const pageAddress = /** @type {AddressInfo} */ (page.address())
    const config = loadConfig('all', { ...isolated, envData: api })
    const app = await createApp({ role: 'all', config, serverOptions: { logger: false } })
    t.after(() => app.close())
    assert.equal(Object.keys(app.pgboss.workers).length, 5)
    /** @type {QueryResult<{id: string}>} */
    const users = await app.pg.query("insert into users (username, email, password) values ('runtime', 'runtime@example.invalid', 'not-a-login-password') returning id")
    const user = users.rows[0]
    assert.ok(user)
    /** @type {QueryResult<{jti: string}>} */
    const tokens = await app.pg.query("insert into auth_tokens (owner_id, source) values ($1, 'api') returning jti", [user.id])
    const token = tokens.rows[0]
    assert.ok(token)
    const authorization = `Bearer ${app.jwt.sign({ id: user.id, username: 'runtime', jti: token.jti })}`
    const completed = Promise.withResolvers()
    const counter = app.otel.bookmarkJobProcessedCounter
    const originalAdd = counter.add
    /** @type {typeof originalAdd} */
    const observeCompletion = (...args) => {
      originalAdd.call(counter, ...args)
      completed.resolve(process.pid)
    }
    t.mock.method(counter, 'add', observeCompletion)
    const queue = app.pgboss.queues.resolveBookmarkQ
    const originalSend = queue.send
    let producerPid = 0
    /** @type {string | null | undefined} */
    let jobId
    /** @type {typeof originalSend} */
    const observeEnqueue = async (...args) => {
      producerPid = process.pid
      jobId = await originalSend.call(queue, ...args)
      return jobId
    }
    t.mock.method(queue, 'send', observeEnqueue)
    const response = await app.inject({
      method: 'PUT',
      url: '/api/bookmarks?meta=true&episode=false&archive=false&exact_url=true',
      headers: { authorization },
      payload: { url: `http://127.0.0.1:${pageAddress.port}/article` },
    })
    assert.equal(response.statusCode, 201, response.body)
    /** @type {{data: TypeBookmarkReadClient}} */
    const body = response.json()
    assert.ok(jobId)
    const enqueuedJobId = jobId
    assert.equal(producerPid, process.pid)
    assert.equal(await completed.promise, producerPid)
    await t.waitFor(async () => {
      const job = await app.pgboss.boss.getJobById('resolveBookmark', enqueuedJobId)
      assert.equal(job?.state, 'completed')
    }, { timeout: 10000, interval: 50 })
    /** @type {QueryResult<{title: string, done: boolean}>} */
    const bookmarks = await app.pg.query('select title, done from bookmarks where id = $1', [body.data.id])
    assert.deepEqual(bookmarks.rows, [{ title: 'Unified runtime integration', done: true }])
    await app.close()
    await fixture.assertDisconnected()
  })

  await t.test('queue creation failure closes the already-started boss and shared pools', async t => {
    const original = PgBoss.prototype.createQueue
    /** @type {PgBoss['createQueue']} */
    const failArchiveQueue = /** @this {PgBoss} */ async function (name, options) {
      if (name === 'resolveArchive') throw new Error('injected queue creation failure')
      return original.call(this, name, options)
    }
    t.mock.method(PgBoss.prototype, 'createQueue', failArchiveQueue)
    const config = loadConfig('api', { ...isolated, envData: api })
    await assert.rejects(createApp({ role: 'api', config, serverOptions: { logger: false } }), /injected queue creation failure/)
    await fixture.assertDisconnected()
  })

  await t.test('failure after boss.start cleans up before the plugin can take ownership', async t => {
    t.mock.method(PgBoss.prototype, 'isInstalled', async () => { throw new Error('injected startup inspection failure') })
    const config = loadConfig('worker', { ...isolated, envData: common })
    await assert.rejects(createApp({ role: 'worker', config, serverOptions: { logger: false } }), /injected startup inspection failure/)
    await fixture.assertDisconnected()
  })

  await t.test('main exits nonzero at its hard deadline for a stuck native worker after ready', { timeout: 20000 }, async t => {
    const config = loadConfig('worker', {
      ...isolated,
      envData: {
        ...common,
        PORT: 0,
        LISTEN_HOST: '127.0.0.1',
        JOB_DRAIN_TIMEOUT_MS: 1000,
        SHUTDOWN_TIMEOUT_MS: 2500,
        FASTIFY_LOG_LEVEL: 'info',
      },
    })
    // Stall one native processor's dependency, retaining the production main,
    // onReady activation, tracking wrapper, and signal handling.
    const child = spawn(process.execPath, ['--input-type=module', '--eval', `
      import { PgBoss } from 'pg-boss'
      import { Pool } from 'pg'
      import { cleanupAuthTokensQName } from '#resources/auth-tokens/cleanup-auth-tokens-queue.js'
      const query = Pool.prototype.query
      Pool.prototype.query = function (statement, ...args) {
        const text = typeof statement === 'string' ? statement : statement.text
        if (/delete from auth_tokens/i.test(text)) {
          console.log('STUCK_PROCESSOR_STARTED')
          return new Promise(() => {})
        }
        return query.call(this, statement, ...args)
      }
      const work = PgBoss.prototype.work
      PgBoss.prototype.work = async function (name, ...args) {
        const id = await work.call(this, name, ...args)
        if (name === cleanupAuthTokensQName) {
          await this.send(name, {}, { expireInSeconds: 1, retryLimit: 0 })
        }
        return id
      }
      process.argv = [process.execPath, 'src/main.js', '--role=worker']
      await import(${JSON.stringify(new URL('../main.js', import.meta.url).href)})
    `], {
      cwd: new URL('../../', import.meta.url),
      env: {
        ...Object.fromEntries(Object.entries(config).map(([key, value]) => [key, String(value)])),
        SENTRY_DSN: '',
        SENTRY_API_DSN: '',
        SENTRY_WORKER_DSN: '',
        OTEL_SDK_DISABLED: 'true',
        OTEL_TRACES_EXPORTER: 'none',
        OTEL_METRICS_EXPORTER: 'none',
        OTEL_LOGS_EXPORTER: 'none',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const exited = once(child, 'exit')
    exited.catch(() => {})
    t.after(async () => {
      child.kill('SIGKILL')
      await exited
    })
    let output = ''
    child.stdout.on('data', chunk => { output += chunk.toString() })
    child.stderr.on('data', chunk => { output += chunk.toString() })
    await t.waitFor(() => {
      assert.equal(child.exitCode, null, output)
      assert.match(output, /STUCK_PROCESSOR_STARTED/)
      assert.match(output, /Server listening at/)
    }, { timeout: 10000, interval: 25 })
    assert.equal(child.kill('SIGTERM'), true)
    const [code, signal] = await exited
    assert.equal(signal, null, output)
    assert.equal(code, 1, output)
    assert.match(output, /Shutdown exceeded 2500ms; interrupted jobs may be retried/)
    await fixture.assertDisconnected()
  })

  await t.test('real boss shutdown drains an expired processor with DB/cache/follow-up producers still available', async t => {
    const release = Promise.withResolvers()
    const config = loadConfig('worker', { ...isolated, envData: { ...common, JOB_DRAIN_TIMEOUT_MS: 1000 } })
    const app = await createApp({ role: 'worker', config, serverOptions: { logger: false } })
    t.after(async () => {
      release.resolve(undefined)
      await app.close()
    })
    const { boss, workers, track } = app.pgboss
    const cache = app.redis['cache']
    assert.ok(cache)
    await boss.createQueue('runtimeDrain')
    await boss.createQueue('runtimeFollowup')
    const active = Promise.withResolvers()
    /** @type {PromiseWithResolvers<{ database: number | undefined, cache: string, followupId: string | null }>} */
    const outcome = Promise.withResolvers()
    workers['runtimeDrain'] = [await boss.work('runtimeDrain', track(async () => {
      active.resolve(undefined)
      await release.promise
      try {
        /** @type {QueryResult<{alive: number}>} */
        const database = await app.pg.query('select 1 as alive')
        outcome.resolve({
          database: database.rows[0]?.alive,
          cache: await cache.ping(),
          followupId: await boss.send('runtimeFollowup', { pid: process.pid }),
        })
      } catch (err) {
        outcome.reject(err)
        throw err
      }
    }))]
    const id = await boss.send('runtimeDrain', {}, { expireInSeconds: 1, retryLimit: 0 })
    assert.ok(id)
    await active.promise
    let closed = false
    const closing = app.close().then(() => { closed = true })
    await delay(1200)
    assert.equal(closed, false)
    release.resolve(undefined)
    const [result] = await Promise.all([outcome.promise, closing])
    assert.equal(result.database, 1)
    assert.equal(result.cache, 'PONG')
    assert.ok(result.followupId)
    assert.equal(closed, true)
    await fixture.assertDisconnected()
  })
})
