/** @typedef {'all' | 'api' | 'worker'} Role */

/** @param {unknown} role @returns {asserts role is Role} */
export function assertRole (role) {
  if (role !== 'all' && role !== 'api' && role !== 'worker') {
    throw new Error('A role is required: --role=all, --role=api, or --role=worker')
  }
}

/** @param {string[]} args @returns {Role} */
export function parseRole (args) {
  if (args.length !== 1 || !args[0]?.startsWith('--role=')) {
    throw new Error('Usage: node src/main.js --role=all|api|worker')
  }
  const role = args[0].slice('--role='.length)
  assertRole(role)
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
