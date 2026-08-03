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
 * Pino invokes this censor for every configured URL-bearing log path.
 * Nullish values retain their JSON semantics, unexpected non-string values are
 * fully redacted, direct URL fields are sanitized as a whole, and URLs inside
 * error prose are sanitized without replacing the surrounding diagnostic text.
 * @param {unknown} value - The value found at a configured Pino redaction path.
 * @returns {unknown} The value safe to serialize into logs.
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
 * Sanitize one URL token matched inside a larger diagnostic string.
 * Common trailing prose punctuation is separated before URL parsing and then
 * reattached so removing a signed query does not alter the surrounding message.
 * Balanced square brackets remain part of the URL because IPv6 literal hosts
 * require them, while unmatched closing brackets are treated as punctuation.
 * @param {string} value - The URL token, potentially followed by punctuation.
 * @returns {string} The sanitized URL followed by its original punctuation.
 */
function sanitizeUrlToken (value) {
  let urlEnd = value.length
  while (urlEnd > 0) {
    const trailingCharacter = value[urlEnd - 1] ?? ''
    if (!/[),.;:!?\]}>'"]/.test(trailingCharacter)) break
    if (trailingCharacter === ']' && !hasUnmatchedClosingBracket(value.slice(0, urlEnd))) break
    urlEnd--
  }

  return sanitizeUrl(value.slice(0, urlEnd)) + value.slice(urlEnd)
}

/**
 * Determine whether a token ends with prose punctuation rather than the closing
 * bracket required by an IPv6 literal host.
 * @param {string} value - The candidate URL token through its current endpoint.
 * @returns {boolean} Whether closing square brackets outnumber opening brackets.
 */
function hasUnmatchedClosingBracket (value) {
  const openingBracketCount = value.match(/\[/g)?.length ?? 0
  const closingBracketCount = value.match(/\]/g)?.length ?? 0
  return closingBracketCount > openingBracketCount
}

/**
 * Remove credentials, fragments, and potentially signed query parameters from
 * an absolute or request-relative URL before it is serialized into logs.
 * The YouTube watch video ID is the only retained query value because it is a
 * stable public identifier needed to correlate extraction failures.
 * Invalid URL values are fully redacted rather than risk exposing their content.
 * @param {string} value - The complete absolute or request-relative URL.
 * @returns {string} A normalized URL containing only safe diagnostic fields.
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
 * Identify YouTube watch pages whose public video ID may remain in logs.
 * @param {URL} url - The parsed source URL.
 * @returns {boolean} Whether the URL is a YouTube watch page.
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
