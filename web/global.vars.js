import envSchema from 'env-schema'
import { readFile } from 'fs/promises'
import desm from 'desm'
import { join } from 'path'
import { schema } from '../plugins/env.js'

const config = envSchema({
  schema,
  dotenv: true
})

const __dirname = desm(import.meta.url)

export default async () => {
  return {
    siteName: '🥖 Breadcrum',
    registration: config.REGISTRATION,
    version: JSON.parse(await readFile(new URL(join(__dirname, '../package.json'), import.meta.url))).version
  }
}

export const browser = {
  'process.env.REGISTRATION': config.REGISTRATION
}
