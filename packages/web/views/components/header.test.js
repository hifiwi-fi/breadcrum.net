import { test, suite } from 'node:test'
import assert from 'node:assert'
import { render } from 'fragtml'
import { header } from './header.js'
import { defaultViewFrontendFlags } from '../context.js'

await suite('header component', async () => {
  await test('renders anonymous navigation', async () => {
    const body = await render(header({
      ...baseContext(),
      user: null,
    }))

    assert.match(body, /href="\/login\/"/)
    assert.match(body, /href="\/register\/"/)
    assert.doesNotMatch(body, /href="\/bookmarks\/"/)
  })

  await test('renders authenticated navigation', async () => {
    const body = await render(header({
      ...baseContext(),
      user: fakeUser(),
    }))

    assert.match(body, /href="\/account\/">bret<\/a>/)
    assert.match(body, /href="\/bookmarks\/"/)
    assert.match(body, /href="\/tags\/"/)
    assert.match(body, /href="\/feeds\/"/)
    assert.match(body, /href="\/\?toread=true"/)
    assert.match(body, /href="\/\?starred=true"/)
    assert.match(body, /href="\/\?sensitive=true"/)
    assert.match(body, /method="post" action="\/logout\/"/)
    assert.match(body, /<button type="submit">logout<\/button>/)
    assert.doesNotMatch(body, /href="\/login\/"/)
  })

  await test('renders authenticated filters from query params', async () => {
    const body = await render(header({
      ...baseContext(),
      currentPath: '/bookmarks/?tag=video&toread=true',
      user: fakeUser(),
    }))

    assert.match(body, /aria-label="Disable To read filter"/)
    assert.match(body, /aria-pressed="true"/)
    assert.match(body, /href="\/bookmarks\/\?tag=video"/)
    assert.match(body, /href="\/bookmarks\/\?tag=video&amp;toread=true&amp;starred=true"/)
  })

  await test('renders service notice banners from flags', async () => {
    const body = await render(header({
      ...baseContext(),
      flags: {
        ...defaultViewFrontendFlags,
        service_notice_message: 'Maintenance soon',
        service_notice_message_color: '#123456',
        service_notice_dismissible_message: 'Trial notice',
        service_notice_dismissible_message_color: '#654321',
      },
    }))

    assert.match(body, /Maintenance soon/)
    assert.match(body, /Trial notice/)
    assert.match(body, /background-color: #123456/)
    assert.match(body, /background-color: #654321/)
  })

  await test('hides dismissed service notice for matching user hash', async () => {
    const body = await render(header({
      ...baseContext(),
      flags: {
        ...defaultViewFrontendFlags,
        service_notice_dismissible_message: 'Trial notice',
      },
      user: fakeUser({
        service_notice_dismissed_hash: hashNoticeMessage('Trial notice'),
      }),
    }))

    assert.doesNotMatch(body, /Trial notice/)
  })

  await test('renders email confirmation banner', async () => {
    const body = await render(header({
      ...baseContext(),
      user: fakeUser({ email_confirmed: false }),
    }))

    assert.match(body, /Click here to confirm your email address!/)
    assert.match(body, /href="\/account\/"/)
  })

  await test('does not render email confirmation banner on email confirmation route', async () => {
    const body = await render(header({
      ...baseContext(),
      currentPath: '/email_confirm/',
      user: fakeUser({ email_confirmed: false }),
    }))

    assert.doesNotMatch(body, /confirm your email address/)
  })

  await test('renders disabled account banner', async () => {
    const body = await render(header({
      ...baseContext(),
      user: fakeUser({ disabled: true }),
    }))

    assert.match(body, /Your account is disabled\. Click for details/)
  })
})

/**
 * @returns {import('../context.js').ViewContext}
 */
function baseContext () {
  return {
    title: 'Test',
    siteName: 'Breadcrum',
    siteDescription: 'Test site',
    baseUrl: 'http://localhost:3000',
    host: 'localhost:3000',
    transport: 'http',
    version: '0.0.0',
    mastodonUrl: 'https://example.com/mastodon',
    discordUrl: 'https://example.com/discord',
    siteTwitterUrl: 'https://example.com/x',
    bskyUrl: 'https://example.com/bsky',
    themeColorLight: '#fff',
    themeColorDark: '#111',
    currentPath: '/',
    htmx: {
      isHtmx: false,
      target: null,
      requestType: null,
    },
    user: null,
    flags: defaultViewFrontendFlags,
  }
}

/**
 * @param {Partial<import('../context.js').ViewUser>} [overrides]
 * @returns {import('../context.js').ViewUser}
 */
function fakeUser (overrides = {}) {
  return {
    id: '00000000-0000-4000-8000-000000000000',
    username: 'bret',
    email_confirmed: true,
    admin: false,
    disabled: false,
    disabled_reason: null,
    service_notice_dismissed_hash: null,
    ...overrides,
  }
}

/**
 * Keep this in sync with the header service notice hash.
 * @param {string} message
 * @returns {string}
 */
function hashNoticeMessage (message) {
  let hash = 5381
  for (let i = 0; i < message.length; i += 1) {
    hash = ((hash << 5) + hash) ^ message.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}
