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

export const loggerOptions = /** @type{const} @satisfies {FastifyServerOptions['logger']} */ ({
  mixin () {
    return {
      service: 'bc-worker',
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
