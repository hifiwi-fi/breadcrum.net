/**
 * @import { FastifyPluginAsync } from 'fastify'
 * @import { AppOptions } from '#config/options.js'
 */
import Fastify from 'fastify'
import fp from 'fastify-plugin'
import AutoLoad from '@fastify/autoload'
import { join, basename } from 'node:path'
import { loadConfig } from '#config/config.js'
import { assertRole } from '#config/role.js'
import { createShutdown } from './runtime/shutdown.js'
import { schemaForRole } from '#config/env-schema.js'
import { createServerOptions } from '#resources/fastify-common/server-options.js'
import env from '#plugins/shared/env.js'
import pgboss from '#plugins/shared/pgboss.js'
import health from '#plugins/shared/health.js'

const ignorePattern = /(?:test|spec|\.no-load)\.(?:js|cjs|mjs)$/i

/** @type {FastifyPluginAsync<AppOptions>} */
export default async function App (fastify, opts) {
  assertRole(opts.role)
  const config = opts.config ?? loadConfig(opts.role, opts)
  const options = { ...opts, config }
  fastify.addSchema(schemaForRole(opts.role))
  await fastify.register(env, options)

  if (opts.role !== 'worker') {
    await fastify.register(AutoLoad, {
      dir: join(import.meta.dirname, 'api/routes'),
      matchFilter: /^.*[a-zA-Z0-9_-]+\.schema\.(?:js|cjs|mjs)$/i,
      indexPattern: /(?!.*)/,
      dirNameRoutePrefix: false,
      autoHooks: false,
      options,
    })
  }

  await fastify.register(AutoLoad, {
    dir: join(import.meta.dirname, 'plugins/shared'),
    ignorePattern,
    // These plugins need explicit ordering around infrastructure and API hooks.
    ignoreFilter: path => ['env.js', 'pgboss.js', 'health.js'].includes(basename(path)),
    dirNameRoutePrefix: false,
    options,
  })

  if (opts.role !== 'worker') {
    await fastify.register(AutoLoad, {
      dir: join(import.meta.dirname, 'plugins/api'),
      ignorePattern,
      dirNameRoutePrefix: false,
      options,
    })
  }

  // API onRoute hooks (including circuit-breaker) must see health routes too.
  await fastify.register(health, options)

  // Registered after all pools/cache: reverse onClose order drains jobs before dependencies close.
  await fastify.register(pgboss, options)
  if (opts.role !== 'api') {
    await fastify.register(AutoLoad, {
      dir: join(import.meta.dirname, 'plugins/worker'),
      ignorePattern,
      dirNameRoutePrefix: false,
      options,
    })
  }

  if (opts.role !== 'worker') {
    await fastify.register(AutoLoad, {
      dir: join(import.meta.dirname, 'api/routes'),
      indexPattern: /^.*routes\.(?:ts|js|cjs|mjs)$/,
      ignorePattern: /^.*\.(?:js|cjs|mjs)$/,
      autoHooksPattern: /.*hooks\.(?:js|cjs|mjs)$/i,
      autoHooks: true,
      cascadeHooks: true,
      overwriteHooks: true,
      routeParams: true,
      options,
    })
  }
}

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
    await fastify.register(fp(App), { ...opts, config })
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
