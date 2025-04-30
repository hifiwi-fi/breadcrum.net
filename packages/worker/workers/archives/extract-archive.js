import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'
import createDOMPurify from 'dompurify'

/**
 * @typedef {ReturnType<Readability['parse']>} ReadabilityParseResult
 */

/**
 * @param  {object} params
 * @param  {Document} params.document
 * @returns {Promise<ReadabilityParseResult>}
 */
export async function extractArchive ({
  document,
}) {
  const reader = new Readability(document)
  const article = reader.parse()

  if (!article) return null

  const dpWindow = new JSDOM('').window
  // @ts-expect-error
  const DOMPurify = createDOMPurify(dpWindow)
  if (!article.content) throw new Error('Article extracted without content')
  article.content = DOMPurify.sanitize(article.content)

  if (!article.title) throw new Error('Article extracted without a title')
  return article
}
