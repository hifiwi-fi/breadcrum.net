/** @typedef {'all' | 'api' | 'worker'} Role */

/** @param {unknown} role @returns {asserts role is Role} */
export function assertRole (role) {
  if (role !== 'all' && role !== 'api' && role !== 'worker') {
    throw new Error('APP_ROLE is required and must be api, worker, or all (development only)')
  }
}

/**
 * @param {object} environment
 * @param {string | undefined} [environment.APP_ROLE]
 * @param {string | undefined} [environment.NODE_ENV]
 * @param {string | undefined} [environment.ENV]
 * @returns {Role}
 */
export function parseRoleFromEnvironment (environment) {
  const role = environment.APP_ROLE
  assertRole(role)
  if (role === 'all' && (environment.NODE_ENV === 'production' || environment.ENV === 'production')) {
    throw new Error('APP_ROLE=all is not allowed in production; set APP_ROLE=api or APP_ROLE=worker')
  }
  return role
}

/** @param {Role} role */
export function roleDefaults (role) {
  assertRole(role)
  return {
    OTEL_SERVICE_NAME: role === 'worker' ? 'breadcrum-worker' : role === 'api' ? 'breadcrum-web' : 'breadcrum-all',
    METRICS_PORT: role === 'worker' ? 9092 : 9091,
  }
}
