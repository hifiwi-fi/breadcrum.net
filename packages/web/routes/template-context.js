/**
 * @import { ViewContext } from '#views/context.js'
 */

import { readFile } from 'node:fs/promises'
import { createDefaultViewContextFromConfig } from '#views/context.js'

/**
 * @typedef {Omit<ViewContext, 'currentPath' | 'htmx' | 'title'>} TemplateViewContext
 */

/**
 * @returns {Promise<TemplateViewContext>}
 */
export async function createTemplateContext () {
  return createDefaultViewContextFromConfig({
    transport: process.env['TRANSPORT'] ?? 'http',
    host: process.env['HOST'] ?? 'localhost:3000',
    version: await packageVersion(),
  })
}

/**
 * @returns {Promise<string>}
 */
async function packageVersion () {
  try {
    const source = await readFile(new URL('../package.json', import.meta.url), 'utf8')
    const parsed = JSON.parse(source)
    return typeof parsed.version === 'string' ? parsed.version : '0.0.0'
  } catch {
    return '0.0.0'
  }
}
