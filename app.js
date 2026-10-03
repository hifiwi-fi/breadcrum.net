/**
 * @import { FastifyPluginAsync } from 'fastify'
 * @import { AppOptions } from '#config/options.js'
 */
import AutoLoad from '@fastify/autoload'
import { join, basename } from 'node:path'
import { loadRuntimeConfig } from '#config/config.js'
import { assertRole } from '#config/role.js'
import { schemaForRole } from '#config/env-schema.js'
import env from '#plugins/shared/env.js'
import pgboss from '#plugins/shared/pgboss.js'
import health from '#plugins/shared/health.js'
import { telemetryState } from '#runtime/telemetry-state.js'

export { options } from '#config/server-options.js'

const ignorePattern = /(?:test|spec|env-schema|\.no-load)\.(?:js|cjs|mjs)$/i

/** @type {FastifyPluginAsync<Partial<AppOptions>>} */
export default async function App (fastify, opts) {
  if (opts.role !== undefined) {
    throw new Error('CLI role flags are not supported; set APP_ROLE=api|worker|all instead')
  }
  const config = opts.config ?? loadRuntimeConfig(opts)
  const role = config.APP_ROLE
  assertRole(role)
  // CLI inspection omits exported options; consumer roles require configured startup.
  if (!opts.config && role !== 'api') {
    throw new Error('Inspection requires APP_ROLE=api to avoid activating queue consumers')
  }
  const options = { ...opts, role, config }
  // Register first so telemetry flushes after queues and infrastructure close.
  fastify.addHook('onClose', async () => { await telemetryState.shutdown?.() })
  fastify.addSchema(schemaForRole(role))
  await fastify.register(env, options)

  if (role !== 'worker') {
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

  if (role !== 'worker') {
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
  if (role !== 'api') {
    await fastify.register(AutoLoad, {
      dir: join(import.meta.dirname, 'plugins/worker'),
      ignorePattern,
      dirNameRoutePrefix: false,
      options,
    })
  }

  if (role !== 'worker') {
    await fastify.register(AutoLoad, {
      dir: join(import.meta.dirname, 'api/routes'),
      // Autoload selects routes.js indexes and autohooks before ignorePattern skips other modules.
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
