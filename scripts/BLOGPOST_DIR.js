import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
export const __dirname = path.dirname(__filename)

export const BLOGPOST_DIR = path.join(__dirname, '../packages/web/client/blog')
