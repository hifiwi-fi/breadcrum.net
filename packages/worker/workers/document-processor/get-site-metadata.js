import { extractMeta } from '@breadcrum/extract-meta'

/**
 * @param  {object} params
 * @param  {Document} params.document
 */
export async function getSiteMetadata ({
  document,
}) {
  const metadata = extractMeta(document)
  return metadata
}
