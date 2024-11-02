import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import createDOMPurify from 'dompurify'

/**
 * @param  {object} params
 * @param  {Document} params.document
 */
export async function extractArchive ({
  document,
}) {
  const reader = new Readability(document)
  const article = reader.parse()

  if (!article) return null

  const dpWindow = new JSDOM('').window
  const DOMPurify = createDOMPurify(dpWindow)
  article.content = DOMPurify.sanitize(article.content)
  return article
}
