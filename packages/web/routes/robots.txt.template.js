import { createTemplateContext } from './template-context.js'

export default async function robotsTxtTemplate () {
  const context = await createTemplateContext()

  return `User-agent: *
Allow: /

Sitemap: ${context.baseUrl}/sitemap.xml
`
}
