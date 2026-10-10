import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { loadEnvironment } from '#config/config.js'

const child = spawn('/bin/sh', ['./src/scripts/deploy-with-sentry.sh', ...process.argv.slice(2)], {
  env: loadEnvironment({ dotEnvPath: join(process.cwd(), '.env') }),
  stdio: 'inherit',
})

child.on('error', error => {
  console.error('Could not start deploy helper:', error)
  process.exitCode = 1
})

child.on('close', (code, signal) => {
  process.exitCode = code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1)
})
