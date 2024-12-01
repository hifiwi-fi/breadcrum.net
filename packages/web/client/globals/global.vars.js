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
    siteDescription: 'Breadcrum.net: bookmarking with podcasting and archiving super powers.',
    // image: '/static/preview.png',
    siteTwitter: '@breadcrum_',
    mastodonUrl: 'https://fosstodon.org/@breadcrum',
    version,
    authorName: 'Breadcrum',
    authorUrl: baseUrl,
    authorImgUrl: `${baseUrl}/static/breadcrum-fill-red-santa.png`,
    authorImgAlt: 'Picture of author',
    transport,
    host,
    baseUrl,
  }
}
