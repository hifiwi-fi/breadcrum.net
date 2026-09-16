/**
 * @import { TemplateFunction } from '@domstack/static'
 * @import { GlobalVars } from './globals/global.vars.js'
 */

/** @type {TemplateFunction<GlobalVars>} */
export default async ({
  vars: {
    baseUrl,
  },
}) => {
  return JSON.stringify({
    origins: [baseUrl],
    originsRegex: ['http://localhost:[0-9]+'],
  }, null, ' ')
}
