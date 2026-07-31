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

const urlLogPaths = [
  'sourceUrl',
  'url',
  'req.url',
  'err.message',
  'err.stack',
  'err.description',
  'err.cause.message',
  'err.cause.stack',
  'ytDlpDescription',
]

/**
 * Remove URL data that can contain credentials or signatures while retaining
 * enough stable information to identify the source.
 * @param {unknown} value
 * @returns {unknown}
 */
function redactUrlData (value) {
  if (value == null) return value
  if (typeof value !== 'string') return '[Redacted]'

  if (value.startsWith('/') || /^[a-z][a-z\d+.-]*:\/\//i.test(value)) {
    return sanitizeUrl(value)
  }

  return value.replace(/https?:\/\/[^\s]+/gi, sanitizeUrlToken)
}

/**
 * Preserve punctuation surrounding a URL embedded in prose.
 * @param {string} value
 * @returns {string}
 */
function sanitizeUrlToken (value) {
  let urlEnd = value.length
  while (urlEnd > 0 && /[),.;:!?\]}>'"]/.test(value[urlEnd - 1] ?? '')) {
    urlEnd--
  }

  return sanitizeUrl(value.slice(0, urlEnd)) + value.slice(urlEnd)
}

/**
 * @param {string} value
 * @returns {string}
 */
function sanitizeUrl (value) {
  try {
    const isRelative = value.startsWith('/')
    const url = new URL(value, 'https://redacted.invalid')
    const videoId = isYouTubeWatchUrl(url) ? url.searchParams.get('v') : null

    url.username = ''
    url.password = ''
    url.search = ''
    url.hash = ''
    if (videoId) url.searchParams.set('v', videoId)

    return isRelative ? `${url.pathname}${url.search}` : url.toString()
  } catch {
    return '[Redacted]'
  }
}

/**
 * @param {URL} url
 * @returns {boolean}
 */
function isYouTubeWatchUrl (url) {
  return /(^|\.)youtube\.com$/i.test(url.hostname) && url.pathname === '/watch'
}

/**
 * @typedef {Object} LoggerOptions
 * @property {() => { service: string }} mixin
 * @property {string} messageKey
 * @property {Object} formatters
 * @property {(label: string, number: number) => { level: string, levelN: number }} formatters.level
 * @property {{paths: string[], censor: (value: unknown) => unknown}} redact
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
    redact: {
      paths: urlLogPaths,
      censor: redactUrlData,
    },
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
