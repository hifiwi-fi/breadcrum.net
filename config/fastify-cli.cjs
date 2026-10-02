// Fastify CLI requires this config synchronously and reads its top-level properties.
// CommonJS supplies that shape directly; an ESM default export would not be unwrapped.
const { loadRuntimeConfig } = require('./config.js')
const config = loadRuntimeConfig()

module.exports = {
  options: true,
  address: config.LISTEN_HOST,
  // CLI treats numeric zero as missing; a string preserves ephemeral test ports.
  port: String(config.PORT),
  closeGraceDelay: config.SHUTDOWN_TIMEOUT_MS,
}
