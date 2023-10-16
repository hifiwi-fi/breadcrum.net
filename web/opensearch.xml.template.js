export default ({
  transport,
  host
}) => {
  const baseUrl = `${transport}://${host}`
  return /* xml */`<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>Breadcrum Bookmarks</ShortName>
  <Description>Search Breadcrum for Bookmarks</Description>
  <Image width="16" height="16" type="image/x-icon">${baseUrl}/favicon.ico</Image>
  <Url type="text/html" method="get" template="${baseUrl}/search/bookmarks/?query={searchTerms}"/>
  <moz:SearchForm>${baseUrl}/search/bookmarks</moz:SearchForm>
  <Url type="application/opensearchdescription+xml" rel="self" template="${baseUrl}/opensearch.xml" />
  <Language>en-us</Language>
  <OutputEncoding>UTF-8</OutputEncoding>
  <InputEncoding>UTF-8</InputEncoding>
</OpenSearchDescription>
`
}
