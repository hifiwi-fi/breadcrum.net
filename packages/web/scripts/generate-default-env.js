import { randomBytes } from 'crypto'
import { writeFile } from 'fs/promises'
import { resolve } from 'path'
import { envSchema } from '../config/env-schema.js'

const __dirname = import.meta.dirname

// This script sets up a default .env dotenv file for use in development
// Do not run this in production or when deploying.

if (process.env['ENV'] !== 'production') {
  const varsNeedingDevKeys = [
    'COOKIE_SECRET',
    'JWT_SECRET',
  ]

  const dotenv = []

  for (const envVar of varsNeedingDevKeys) {
    // Generate 32 bytes (256 bits) of random data, equivalent to crypto_secretbox_KEYBYTES
    const buf = randomBytes(32)
    const hexString = buf.toString('hex')
    dotenv.push(`${envVar}=${hexString}`)
  }

  for (const [name, opts] of Object.entries(envSchema.properties)) {
    if ('default' in opts && opts.default != null) dotenv.push(`${name}=${opts.default}`)
  }

  dotenv.push('')
  await writeFile(resolve(__dirname, '../.env'), dotenv.join('\n'))
  console.log('wrote development .env file')
} else {
  console.log('skipping creation of development .env file')
}
