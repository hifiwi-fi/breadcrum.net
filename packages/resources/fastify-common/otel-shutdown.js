/** @import { FastifyInstance } from 'fastify' */

/**
 * @typedef {object} OtelSdk
 * @property {() => Promise<void>} shutdown
 */

/** @type {OtelSdk | undefined} */
let otelSdk

/**
 * Make the SDK created by the process preload available to the Fastify lifecycle.
 * Tests that do not preload OpenTelemetry leave this value undefined.
 * @param {OtelSdk | undefined} sdk
 */
export function setOtelSdk (sdk) {
  otelSdk = sdk
}

/**
 * Shut down the preloaded OpenTelemetry SDK with the application logger.
 * @param {FastifyInstance} fastify
 */
export function registerOtelShutdown (fastify) {
  fastify.addHook('onClose', async function shutdownOtel () {
    if (!otelSdk) return

    const sdk = otelSdk
    otelSdk = undefined

    try {
      await sdk.shutdown()
      fastify.log.info('OpenTelemetry SDK shut down successfully')
    } catch (err) {
      fastify.log.error({ err }, 'Error shutting down OpenTelemetry SDK')
    }
  })
}
