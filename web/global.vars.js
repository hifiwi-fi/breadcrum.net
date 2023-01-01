import 'dotenv/config'
import { readFile } from 'fs/promises'
import desm from 'desm'
import { join } from 'path'

const __dirname = desm(import.meta.url)

export default async () => {
  return {
    siteName: 'Breadcrum',
    version: JSON.parse(await readFile(new URL(join(__dirname, '../package.json'), import.meta.url))).version
  }
}

export const browser = {
  'process.env.TRANSPORT': process.env.TRANSPORT,
  'process.env.HOST': process.env.HOST
}
