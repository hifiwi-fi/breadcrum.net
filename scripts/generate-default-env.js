import sodium from 'sodium-native'
import { writeFile } from 'fs/promises'
import desm from 'desm'
import { resolve } from 'path'
import { schema } from '../plugins/env.js'

const __dirname = desm(import.meta.url)

// This script sets up a default .env dotenv file for use in development
// Do not run this in production or when deploying.

const varsNeedingDevKeys = [
  'COOKIE_SECRET',
  'JWT_SECRET'
]

const dotenv = []

for (const envVar of varsNeedingDevKeys) {
  const buf = Buffer.allocUnsafe(sodium.crypto_secretbox_KEYBYTES)
  sodium.randombytes_buf(buf)
  const hexString = buf.toString('hex')
  dotenv.push(`${envVar}=${hexString}`)
}

for (const [name, opts] of Object.entries(schema.properties)) {
  if (opts.default) dotenv.push(`${name}=${opts.default}`)
}

dotenv.push('')
await writeFile(resolve(__dirname, '../.env'), dotenv.join('\n'))
