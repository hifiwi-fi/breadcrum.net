import UserAgent from 'user-agents'

// const DEFAULT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36'
const GOOGLE_BOT_UA = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/W.X.Y.Z Safari/537.36'

const ua = new UserAgent()

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
 * @param {URL} url
 */
export function getUA (url) {
  return (
    uaHacks[url.hostname] ??
    // @ts-expect-error ua is not listed as callable for some reason
    ua().toString()
  )
}
