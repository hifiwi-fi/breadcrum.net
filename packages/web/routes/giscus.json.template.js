import { createTemplateContext } from './template-context.js'

export default async function giscusJsonTemplate () {
  const context = await createTemplateContext()

  return JSON.stringify({
    origins: [context.baseUrl],
    originsRegex: ['http://localhost:[0-9]+'],
  }, null, ' ')
}
