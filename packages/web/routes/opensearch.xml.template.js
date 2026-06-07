import { createTemplateContext } from './template-context.js'

export default async function opensearchXmlTemplate () {
  const context = await createTemplateContext()

  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>${escapeXml(context.siteName)}</ShortName>
  <Description>Search Breadcrum for Bookmarks</Description>
  <Image width="16" height="16" type="image/x-icon">${escapeXml(`${context.baseUrl}/favicon.ico`)}</Image>
  <Url type="text/html" method="get" template="${escapeXml(`${context.baseUrl}/search/bookmarks/?query={searchTerms}`)}"/>
  <moz:SearchForm>${escapeXml(`${context.baseUrl}/search/bookmarks/`)}</moz:SearchForm>
  <Url type="application/opensearchdescription+xml" rel="self" template="${escapeXml(`${context.baseUrl}/opensearch.xml`)}"/>
  <Language>en-us</Language>
  <OutputEncoding>UTF-8</OutputEncoding>
  <InputEncoding>UTF-8</InputEncoding>
</OpenSearchDescription>
`
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeXml (value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
