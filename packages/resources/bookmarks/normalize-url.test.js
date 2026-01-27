import { equal, ok } from 'node:assert'
import { test } from 'node:test'
import { normalizeURL } from './normalize-url.js'

// YouTube normalization tests
test('normalizeURL - youtube shorts normalize to watch', async () => {
  const url = await normalizeURL(
    new URL('https://m.youtube.com/shorts/abc123?si=xyz&utm_source=foo&list=PL123&t=30'),
    { followShorteners: false }
  )

  equal(
    url.toString(),
    'https://www.youtube.com/watch?list=PL123&t=30&v=abc123',
    'Expected shorts URLs to normalize to watch with cleaned params'
  )
})

test('normalizeURL - youtu.be normalizes to youtube.com', async () => {
  const url = await normalizeURL(
    new URL('https://youtu.be/dQw4w9WgXcQ?t=30'),
    { followShorteners: false }
  )

  equal(
    url.toString(),
    'https://www.youtube.com/watch?t=30&v=dQw4w9WgXcQ',
    'Expected youtu.be URLs to normalize to youtube.com/watch'
  )
})

test('normalizeURL - youtube embed normalizes to watch', async () => {
  const url = await normalizeURL(
    new URL('https://www.youtube.com/embed/dQw4w9WgXcQ'),
    { followShorteners: false }
  )

  equal(
    url.toString(),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'Expected embed URLs to normalize to watch'
  )
})

test('normalizeURL - youtube host variants normalize', async () => {
  const hosts = ['music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']

  for (const host of hosts) {
    const url = await normalizeURL(
      new URL(`https://${host}/watch?v=abc123`),
      { followShorteners: false }
    )
    equal(url.hostname, 'www.youtube.com', `Expected ${host} to normalize to www.youtube.com`)
  }
})

test('normalizeURL - youtube invalid video ID is not normalized', async () => {
  const url = await normalizeURL(
    new URL('https://www.youtube.com/shorts/'),
    { followShorteners: false }
  )

  equal(
    url.pathname,
    '/shorts/',
    'Expected empty video ID to leave URL unchanged'
  )
})

test('normalizeURL - youtube video ID validation rejects special chars', async () => {
  const url = await normalizeURL(
    new URL('https://youtu.be/../etc/passwd'),
    { followShorteners: false }
  )

  // Should not normalize invalid ID with path traversal
  equal(
    url.hostname,
    'youtu.be',
    'Expected invalid video ID to not be normalized'
  )
})

// X/Twitter normalization tests
test('normalizeURL - x mediaViewer collapses to status URL', async () => {
  const url = await normalizeURL(
    new URL('https://x.com/oasishealthapp/status/2016241457255088281/mediaViewer?currentTweet=2016241457255088281&currentTweetUser=oasishealthapp'),
    { followShorteners: false }
  )

  equal(
    url.toString(),
    'https://x.com/oasishealthapp/status/2016241457255088281',
    'Expected mediaViewer URLs to collapse to base status URL'
  )
})

test('normalizeURL - x mediaViewer case insensitive', async () => {
  const url = await normalizeURL(
    new URL('https://x.com/user/Status/123/MediaViewer?currentTweet=123'),
    { followShorteners: false }
  )

  equal(
    url.toString(),
    'https://x.com/user/status/123',
    'Expected case-insensitive mediaViewer detection'
  )
})

test('normalizeURL - twitter.com normalizes to x.com', async () => {
  const hosts = ['twitter.com', 'mobile.twitter.com', 'm.twitter.com', 'mobile.x.com', 'm.x.com']

  for (const host of hosts) {
    const url = await normalizeURL(
      new URL(`https://${host}/user/status/123`),
      { followShorteners: false }
    )
    equal(url.hostname, 'x.com', `Expected ${host} to normalize to x.com`)
  }
})

// Tracking parameter tests
test('normalizeURL - tracking params stripped and query sorted', async () => {
  const url = await normalizeURL(
    new URL('https://example.com/path?b=2&utm_source=foo&a=1&a=0#section'),
    { followShorteners: false }
  )

  equal(
    url.toString(),
    'https://example.com/path?a=0&a=1&b=2#section',
    'Expected tracking params removed, query sorted, and fragment preserved'
  )
})

test('normalizeURL - all utm params are stripped', async () => {
  const url = await normalizeURL(
    new URL('https://example.com?utm_source=x&utm_medium=y&utm_campaign=z&keep=this'),
    { followShorteners: false }
  )

  equal(
    url.toString(),
    'https://example.com/?keep=this',
    'Expected all utm_* params to be removed'
  )
})

test('normalizeURL - known tracking params are stripped', async () => {
  const trackingParams = ['fbclid', 'gclid', 'dclid', 'msclkid', 'igshid']

  for (const param of trackingParams) {
    const url = await normalizeURL(
      new URL(`https://example.com?${param}=12345&keep=this`),
      { followShorteners: false }
    )
    ok(!url.searchParams.has(param), `Expected ${param} to be removed`)
    ok(url.searchParams.has('keep'), 'Expected other params to be kept')
  }
})

// URL sanitization tests
test('normalizeURL - scheme is lowercased', async () => {
  const url = await normalizeURL(
    new URL('HTTPS://EXAMPLE.COM/PATH'),
    { followShorteners: false }
  )

  equal(url.protocol, 'https:', 'Expected protocol to be lowercased')
  equal(url.hostname, 'example.com', 'Expected hostname to be lowercased')
})

test('normalizeURL - default ports are removed', async () => {
  const httpUrl = await normalizeURL(
    new URL('http://example.com:80/path'),
    { followShorteners: false }
  )
  equal(httpUrl.port, '', 'Expected default HTTP port 80 to be removed')

  const httpsUrl = await normalizeURL(
    new URL('https://example.com:443/path'),
    { followShorteners: false }
  )
  equal(httpsUrl.port, '', 'Expected default HTTPS port 443 to be removed')
})

test('normalizeURL - custom ports are preserved', async () => {
  const url = await normalizeURL(
    new URL('https://example.com:8080/path'),
    { followShorteners: false }
  )

  equal(url.port, '8080', 'Expected custom port to be preserved')
})

// Fragment tests
test('normalizeURL - fragments are preserved', async () => {
  const url = await normalizeURL(
    new URL('https://example.com/page#section'),
    { followShorteners: false }
  )

  equal(url.hash, '#section', 'Expected fragment to be preserved')
})

test('normalizeURL - fragments preserved in github URLs', async () => {
  const url = await normalizeURL(
    new URL('https://github.com/user/repo/blob/main/file.js#L45-L50'),
    { followShorteners: false }
  )

  equal(url.hash, '#L45-L50', 'Expected GitHub line number fragment to be preserved')
})

// Query parameter sorting tests
test('normalizeURL - query params sorted by key and value', async () => {
  const url = await normalizeURL(
    new URL('https://example.com?z=3&a=2&a=1&b=0'),
    { followShorteners: false }
  )

  equal(
    url.search,
    '?a=1&a=2&b=0&z=3',
    'Expected params sorted by key, then by value for duplicates'
  )
})

test('normalizeURL - duplicate query params are preserved', async () => {
  const url = await normalizeURL(
    new URL('https://example.com?tag=a&tag=b&tag=c'),
    { followShorteners: false }
  )

  const tags = url.searchParams.getAll('tag')
  equal(tags.length, 3, 'Expected all duplicate params to be preserved')
  equal(tags.join(','), 'a,b,c', 'Expected params to be sorted')
})

// Cache error handling tests
test('normalizeURL - handles malformed cached URLs gracefully', async () => {
  const mockCache = {
    get: async () => 'not-a-valid-url',
    set: async () => {}
  }

  const url = await normalizeURL(
    new URL('https://example.com'),
    { followShorteners: false, cache: mockCache }
  )

  equal(url.href, 'https://example.com/', 'Expected malformed cache value to be ignored')
})

// Host rewrite tests
test('normalizeURL - multiple host rewrites in sequence', async () => {
  const url = await normalizeURL(
    new URL('https://m.youtube.com/watch?v=abc'),
    { followShorteners: false }
  )

  equal(url.hostname, 'www.youtube.com', 'Expected host rewrite to apply')
})

// Edge case tests
test('normalizeURL - empty query string', async () => {
  const url = await normalizeURL(
    new URL('https://example.com?'),
    { followShorteners: false }
  )

  equal(url.search, '', 'Expected empty query string to be removed')
})

test('normalizeURL - paths are preserved', async () => {
  const url = await normalizeURL(
    new URL('https://example.com/path/to/resource?utm_source=x'),
    { followShorteners: false }
  )

  equal(url.pathname, '/path/to/resource', 'Expected path to be preserved')
})

test('normalizeURL - unicode in URLs is preserved', async () => {
  const url = await normalizeURL(
    new URL('https://example.com/文档?param=值#片段'),
    { followShorteners: false }
  )

  ok(decodeURIComponent(url.pathname).includes('文档'), 'Expected unicode path to be preserved')
  ok(decodeURIComponent(url.search).includes('值'), 'Expected unicode query to be preserved')
  ok(decodeURIComponent(url.hash).includes('片段'), 'Expected unicode fragment to be preserved')
})
