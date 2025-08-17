/**
 * Global variables type definitions
 */

/**
 * @typedef {Object} ProvidersConfig
 * @property {string} hostingProvider - Hosting service provider
 * @property {string} storageProvider - Storage service provider
 * @property {string} emailProvider - Email service provider
 */

/**
 * @typedef {Object} GlobalVars
 * @property {string} siteName - The name of the site
 * @property {string} siteDescription - Site description for meta tags
 * @property {string} [image] - Optional site image URL
 * @property {string} siteTwitter - Twitter handle
 * @property {string} siteTwitterUrl - Twitter profile URL
 * @property {string} supportEmail - Support email address
 * @property {string} jurisdiction - Legal jurisdiction
 * @property {string} mastodonUrl - Mastodon profile URL
 * @property {string} bskyUrl - Bluesky profile URL
 * @property {string} discordUrl - Discord server URL
 * @property {string} version - Application version
 * @property {string} authorName - Author name
 * @property {string} authorUrl - Author URL
 * @property {string} authorImgUrl - Author image URL
 * @property {string} authorImgAlt - Author image alt text
 * @property {string} transport - Protocol (http/https)
 * @property {string} host - Host and port
 * @property {string} baseUrl - Full base URL
 * @property {ProvidersConfig} providers - Service providers configuration
 */

import 'dotenv/config'
import { readFile } from 'fs/promises'
import { join } from 'path'

const __dirname = import.meta.dirname
const version = JSON.parse(
  await readFile(
    new URL(
      join(__dirname, '../../../../package.json'),
      import.meta.url),
    'utf8')
).version

/** @type {string} */
const transport = process.env['TRANSPORT'] ?? 'https'
/** @type {string} */
const host = process.env['HOST'] ?? 'localhost:3000'
/** @type {string} */
const baseUrl = `${transport}://${host}`

/** @type {Record<string, string>} */
export const browser = {
  'process.env.TRANSPORT': transport,
  'process.env.HOST': host,
}

/** @type {() => Promise<GlobalVars>} */
export default async () => {
  return {
    siteName: 'Breadcrum',
    siteDescription: 'Personal private bookmarking with video, audio, and text archiving and podcasting tools.',
    // image: '/static/preview.png',
    siteTwitter: '@breadcrum_',
    siteTwitterUrl: 'http://x.com/breadcrum_',
    supportEmail: 'support@breadcrum.net',
    jurisdiction: 'California, USA',
    mastodonUrl: 'https://fosstodon.org/@breadcrum',
    bskyUrl: 'https://bsky.app/profile/breadcrum.net',
    discordUrl: 'https://discord.gg/pYJdTvNdZN',
    version,
    authorName: 'Breadcrum',
    authorUrl: baseUrl,
    authorImgUrl: `${baseUrl}/static/breadcrum-fill-red.png`,
    authorImgAlt: 'Picture of author',
    transport,
    host,
    baseUrl,
    providers: {
      hostingProvider: 'Fly.io',
      storageProvider: 'Backblaze B2',
      emailProvider: 'AWS SES',
    }
  }
}
