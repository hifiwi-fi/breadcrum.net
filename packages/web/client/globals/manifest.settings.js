/**
 * @import { BuildOutputEntry } from '@domstack/static'
 */

import { pwaBuildManifestExclude, shouldIncludePwaOutput } from './pwa-cache-policy.js'

const transport = process.env['TRANSPORT'] ?? 'https'
const host = process.env['HOST'] ?? 'localhost:3000'
const baseUrl = `${transport}://${host}`

export default {
  exclude: pwaBuildManifestExclude,
  includeOutput: shouldIncludeBuildOutput,
}

/**
 * Adapt Domstack's manifest settings hook to Breadcrum's shared PWA cache policy.
 *
 * @param {BuildOutputEntry} entry
 */
function shouldIncludeBuildOutput (entry) {
  return shouldIncludePwaOutput(entry, baseUrl)
}
