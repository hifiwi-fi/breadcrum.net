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

const transport = process.env.TRANSPORT ?? 'https'
const host = process.env.HOST ?? 'localhost:3000'
const baseUrl = `${transport}://${host}`

export const browser = {
  'process.env.TRANSPORT': transport,
  'process.env.HOST': host,
}

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
