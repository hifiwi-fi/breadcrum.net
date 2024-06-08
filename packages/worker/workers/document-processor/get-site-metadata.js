import { extractMeta } from '@breadcrum/extract-meta'

export async function getSiteMetadata ({
  document,
}) {
  const metadata = extractMeta(document)
  return metadata
}
