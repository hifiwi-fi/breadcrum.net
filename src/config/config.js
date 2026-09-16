/**
 * @import { Role } from './role.js'
 * @import { RuntimeConfig } from './env-schema.js'
 */
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { fileURLToPath } from 'node:url'
import envSchema from 'env-schema'
import { schemaForRole } from './env-schema.js'
import { assertRole, parseRoleFromEnvironment } from './role.js'

export const dotEnvPath = fileURLToPath(new URL('../../.env', import.meta.url))

/**
 * Read the root environment without mutating process.env (important for app factories/tests).
 * @param {object} [options]
 * @param {string | false | undefined} [options.dotEnvPath]
 * @param {NodeJS.ProcessEnv | undefined} [options.processEnv]
 * @returns {NodeJS.ProcessEnv}
 */
export function loadEnvironment (options = {}) {
  const envPath = options.dotEnvPath ?? dotEnvPath
  let local = {}
  if (envPath !== false) {
    try {
      local = parseEnv(readFileSync(envPath, 'utf8'))
    } catch (err) {
      if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) throw err
    }
  }
  return { ...local, ...(options.processEnv ?? process.env) }
}

/**
 * Resolve the runtime role and validate the same environment before resource startup.
 * @param {object} [options]
 * @param {Partial<RuntimeConfig> | undefined} [options.envData]
 * @param {string | false | undefined} [options.dotEnvPath]
 * @param {NodeJS.ProcessEnv | undefined} [options.processEnv]
 * @returns {RuntimeConfig}
 */
export function loadRuntimeConfig (options = {}) {
  const environment = loadEnvironment(options)
  const role = parseRoleFromEnvironment(environment)
  return loadConfig(role, { ...options, dotEnvPath: false, processEnv: environment })
}

/**
 * Validate role-specific config before opening any connections.
 * Explicit data is reserved for test/application-factory overrides.
 * @param {Role} role
 * @param {object} [options]
 * @param {Partial<RuntimeConfig> | undefined} [options.envData]
 * @param {string | false | undefined} [options.dotEnvPath]
 * @param {NodeJS.ProcessEnv | undefined} [options.processEnv]
 * @returns {RuntimeConfig}
 */
export function loadConfig (role, options = {}) {
  assertRole(role)
  const data = { ...loadEnvironment(options), ...options.envData, APP_ROLE: role }
  parseRoleFromEnvironment(data)
  /** @type {RuntimeConfig} */
  const config = envSchema({
    schema: schemaForRole(role),
    env: false,
    data,
  })
  if (config.SHUTDOWN_TIMEOUT_MS <= config.JOB_DRAIN_TIMEOUT_MS) {
    throw new Error('SHUTDOWN_TIMEOUT_MS must exceed JOB_DRAIN_TIMEOUT_MS to allow pool and telemetry cleanup')
  }
  // Combined mode intentionally uses one API SDK; jobs get isolated scopes, not a second client.
  const sentryDsn = (role === 'worker' ? config.SENTRY_WORKER_DSN : config.SENTRY_API_DSN) || config.SENTRY_DSN
  if (sentryDsn !== undefined) config.SENTRY_DSN = sentryDsn
  return config
}
