import 'dotenv/config'
import { readFile } from 'fs/promises'
import desm from 'desm'
import { join } from 'path'

const __dirname = desm(import.meta.url)

const transport = process.env.TRANSPORT ?? 'https'
const host = process.env.HOST ?? 'localhost:3000'

export const browser = {
  'process.env.TRANSPORT': transport,
  'process.env.HOST': host
}

export default async () => {
  return {
    siteName: 'Breadcrum',
    mastodonUrl: 'https://fosstodon.org/@breadcrum',
    version: JSON.parse(
      await readFile(
        new URL(
          join(__dirname, '../package.json'),
          import.meta.url),
        'utf8')
    ).version,
    authorName: 'Bret Comnes',
    authorUrl: 'https://bret.io',
    authoImgUrl: 'https://www.gravatar.com/avatar/8d8b82740cb7ca994449cccd1dfdef5f?s=500',
    authorImgAlt: 'Picture of author',
    transport,
    host
  }
}
