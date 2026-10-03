/**
 * @import { AsyncTemplateFunction } from '@domstack/static/types.js'
 * @import { GlobalVars } from './globals/global.vars.js'
 */

/** @type {AsyncTemplateFunction<GlobalVars>} */
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
