/**
 * @import { ArgscloptsParseArgsOptionsConfig } from 'argsclopts'
 * @import { ParseArgsConfig } from 'node:util'
 */
import { resolve, join } from 'node:path'
import { parseArgs } from 'node:util'
import { printHelpText } from 'argsclopts'
import { updateGeoipDatabase } from '../lib/geoip-download.js'

const __dirname = import.meta.dirname

/** @type {ArgscloptsParseArgsOptionsConfig} */
const options = {
  help: {
    type: 'boolean',
    short: 'h',
    help: 'Show help text',
  },
  'env-file': {
    type: 'string',
    short: 'e',
    help: 'Path to .env file to load (default: .env in current directory)',
  },
  'edition-id': {
    type: 'string',
    help: 'MaxMind edition ID (default: GeoLite2-City)',
  },
  'data-dir': {
    type: 'string',
    help: 'Destination directory for the database (default: data/geoip)',
  },
  force: {
    type: 'boolean',
    help: 'Skip conditional headers and force re-download',
  },
}

/** @type {ParseArgsConfig & { options: typeof options, strict: false }} */
const parseConfig = { options, strict: false }

const args = parseArgs(parseConfig)

if (args.values['help']) {
  await printHelpText({
    pkgPath: join(__dirname, '../package.json'),
    options,
    name: 'update-geoip-db',
    exampleFn: ({ name }) => `    Download and refresh MaxMind GeoLite2 databases\n\n    Examples:\n      ${name}\n      ${name} --env-file ./.env\n      ${name} --edition-id GeoLite2-City\n      ${name} --data-dir ./data/geoip\n      ${name} --force\n`,
  })
  process.exit(0)
}

const envFile = args.values['env-file'] ? String(args.values['env-file']) : '.env'
try {
  process.loadEnvFile(envFile)
} catch (_err) {
  // Ignore missing env file; rely on process.env
}

const editionId = args.values['edition-id']
  ? String(args.values['edition-id'])
  : 'GeoLite2-City'
const dataDir = args.values['data-dir']
  ? resolve(String(args.values['data-dir']))
  : resolve(__dirname, '..', 'data', 'geoip')
const forceDownload = Boolean(args.values['force'])

const accountId = process.env['MAXMIND_ACCOUNT_ID']
const licenseKey = process.env['MAXMIND_LICENSE_KEY']

if (!accountId || !licenseKey) {
  console.log('MaxMind credentials missing; skipping GeoIP database download.')
  process.exit(0)
}

await updateGeoipDatabase({
  accountId,
  licenseKey,
  editionId,
  dataDir,
  force: forceDownload,
  logger: {
    info: (obj, message) => {
      if (typeof obj === 'string') {
        console.log(obj)
        return
      }
      if (message) {
        console.log(message, obj)
        return
      }
      console.log(obj)
    },
    warn: (obj, message) => {
      if (typeof obj === 'string') {
        console.warn(obj)
        return
      }
      if (message) {
        console.warn(message, obj)
        return
      }
      console.warn(obj)
    },
    debug: (obj, message) => {
      if (typeof obj === 'string') {
        console.debug(obj)
        return
      }
      if (message) {
        console.debug(message, obj)
        return
      }
      console.debug(obj)
    },
  },
})
