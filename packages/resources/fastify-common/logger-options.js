/**
 * @import { FastifyServerOptions } from 'fastify'
 */

const PinoLevelToSeverityLookup = /** @type {const} */ ({
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
})

/**
 * @typedef {Object} LoggerOptions
 * @property {() => { service: string }} mixin
 * @property {string} messageKey
 * @property {Object} formatters
 * @property {(label: string, number: number) => { level: string, levelN: number }} formatters.level
 */

/**
 * Create logger options for Fastify with a specific service name
 * @param {Object} options - Configuration options
 * @param {string} options.serviceName - The service name to use in log mixin (e.g., 'bc-web', 'bc-worker')
 * @returns {LoggerOptions}
 */
export function createLoggerOptions ({ serviceName }) {
  return /** @type {const} @satisfies {FastifyServerOptions['logger']} */ ({
    mixin () {
      return {
        service: serviceName,
      }
    },
    messageKey: 'message',
    formatters: {
      level (/** @type{string} */label, /** @type{number} */number) {
        return {
          level: PinoLevelToSeverityLookup[
            /** @type {keyof typeof PinoLevelToSeverityLookup} */
            (label)
          ] || PinoLevelToSeverityLookup.info,
          levelN: number,
        }
      },
    },
  })
}
