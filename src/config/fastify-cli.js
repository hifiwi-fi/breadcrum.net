// Fastify CLI requires this ESM module synchronously and reads its named exports.
import { loadRuntimeConfig } from './config.js'

const config = loadRuntimeConfig()

export const options = true
export const address = config.LISTEN_HOST
// CLI treats numeric zero as missing; a string preserves ephemeral test ports.
export const port = String(config.PORT)
export const closeGraceDelay = config.SHUTDOWN_TIMEOUT_MS
