import { request as undiciRequest } from 'undici'
import { pipeline } from 'node:stream/promises'
import gunzip from 'gunzip-maybe'
import concat from 'concat-stream'
// Sorry newspapers, no cheating
const GOOGLE_BOT_UA = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/W.X.Y.Z Safari/537.36'

/**
 * @type {{
 *   [url: string]: string
 * }}
 */
const uaHacks = {
  'twitter.com': GOOGLE_BOT_UA,
  'mobile.twitter.com': GOOGLE_BOT_UA,
}

/**
 * Fetch HTML documents from an HTML. Supports max 3 redirects and gzip. Probably needs more work.
 * @param  {object} params
 * @param  {URL} params.url
 */
export async function fetchHTML ({ url }) {
  const requestURL = url
  const ua = uaHacks[requestURL.hostname] ?? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'

  const response = await undiciRequest(requestURL, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': ua,
    },
    maxRedirections: 3,
    autoSelectFamily: true,
    headersTimeout: 15000,
    bodyTimeout: 15000,
  })

  if (response.statusCode > 299) {
    const text = await response.body.text()
    throw new Error(`Fetch HTML error (${response.statusCode}): ` + text)
  }

  let html
  if (response.headers['content-encoding'] === 'gzip') {
    await pipeline(response.body, gunzip(), concat(gotData))

    /**
     * @param  {Buffer} htmlData
     */
    function gotData (htmlData) {
      html = htmlData.toString('utf8')
    }
  } else {
    // If the content is not gzip-encoded, process it as usual
    html = await response.body.text()
  }

  return html
}
