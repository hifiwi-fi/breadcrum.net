/**
 * @import { TestContext } from 'node:test'
 * @import { FastifyServerOptions } from 'fastify'
 * @import { RuntimeConfig } from '#config/env-schema.js'
 * @import { AppOptions } from '#config/options.js'
 */
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import App from '../../app.js'
import { loadConfig } from '#config/config.js'
import { assertRole } from '#config/role.js'
import { createServerOptions } from '#resources/fastify-common/server-options.js'
import { createShutdown } from '#runtime/shutdown.js'

/**
 * Build a ready application without listeners, telemetry, or signal handlers.
 * @param {AppOptions} opts
 */
export async function createApp (opts) {
  assertRole(opts.role)
  const config = opts.config ?? loadConfig(opts.role, opts)
  const fastify = Fastify({
    ...createServerOptions({ serviceName: config.OTEL_SERVICE_NAME, role: opts.role, logLevel: config.FASTIFY_LOG_LEVEL, disableRequestLogging: opts.role === 'worker' }),
    ...opts.serverOptions,
  })
  try {
    const { role: _role, ...appOptions } = opts
    await fastify.register(fp(App), { ...appOptions, config })
    await fastify.ready()
    return fastify
  } catch (err) {
    const cleanup = createShutdown({
      closeApp: async () => { await fastify.close() },
      shutdownTelemetry: async () => {},
      timeoutMs: config.SHUTDOWN_TIMEOUT_MS,
      onTimeout: error => fastify.log.error(error, 'Partial startup cleanup timed out'),
    })
    await cleanup().catch(closeError => fastify.log.error({ err: closeError }, 'Partial startup cleanup failed'))
    throw err
  }
}

/** @param {Partial<RuntimeConfig>} env @returns {AppOptions} */
export function config (env) {
  return {
    role: 'api',
    envData: {
      EMAIL_SENDING: false,
      EMAIL_VALIDATION: false,
      RATE_LIMITING: false,
      TURNSTILE_VALIDATE: false,
      ...env,
    },
  }
}

/**
 * API tests must never consume jobs from the shared test database.
 * @param {TestContext} t
 * @param {Partial<RuntimeConfig>} [env]
 * @param {FastifyServerOptions} [serverOptions]
 */
export async function build (t, env = {}, serverOptions) {
  const app = await createApp({ ...config(env), serverOptions })
  t.after(() => app.close())
  return app
}
