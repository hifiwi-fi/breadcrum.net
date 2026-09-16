/** @import { Role } from './role.js' */
import { createServerOptions } from '#resources/fastify-common/server-options.js'
import { dotEnvPath } from './config.js'
import { roleDefaults } from './role.js'

/**
 * Defaults for the role-specific Fastify CLI inspection entrypoints.
 * @param {Role} role
 */
export function createCliOptions (role) {
  const defaults = roleDefaults(role)
  return {
    ...createServerOptions({
      serviceName: defaults.OTEL_SERVICE_NAME,
      disableRequestLogging: role === 'worker',
    }),
    dotEnvPath,
    role,
  }
}
