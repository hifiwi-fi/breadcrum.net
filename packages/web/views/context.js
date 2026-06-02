/**
 * @import { FastifyInstance, FastifyRequest } from 'fastify'
 * @import { HtmxContext } from '#lib/htmx.js'
 * @import { TypeUserRead } from '../routes/api/user/schemas/schema-user-read.js'
 */

import { getHtmxContext } from '#lib/htmx.js'
import { getUser } from '../routes/api/user/user-query.js'

/**
 * @typedef {'main'} AppFragmentId
 */

/**
 * @typedef {'root'} AppLayoutName
 */

/**
 * @typedef {object} FrontendFlags
 * @property {boolean} registration
 * @property {boolean} registration_invite_required
 * @property {string} service_notice_message
 * @property {string} service_notice_message_color
 * @property {string} service_notice_dismissible_message
 * @property {string} service_notice_dismissible_message_color
 */

/**
 * @typedef {object} ViewUser
 * @property {string} id
 * @property {string} username
 * @property {boolean} email_confirmed
 * @property {boolean} admin
 * @property {boolean} disabled
 * @property {string | null} disabled_reason
 * @property {string | null} service_notice_dismissed_hash
 */

/**
 * @typedef {object} ViewContext
 * @property {string} title
 * @property {string} siteName
 * @property {string} siteDescription
 * @property {string} baseUrl
 * @property {string} host
 * @property {string} transport
 * @property {string} version
 * @property {string} mastodonUrl
 * @property {string} discordUrl
 * @property {string} siteTwitterUrl
 * @property {string} bskyUrl
 * @property {string} themeColorLight
 * @property {string} themeColorDark
 * @property {string} [description]
 * @property {string} [image]
 * @property {string} [imageAlt]
 * @property {boolean} [noindex]
 * @property {string} currentPath
 * @property {HtmxContext} htmx
 * @property {ViewUser | null} user
 * @property {FrontendFlags} flags
 */

/**
 * @type {FrontendFlags}
 */
export const defaultViewFrontendFlags = {
  registration: true,
  registration_invite_required: false,
  service_notice_message: '',
  service_notice_message_color: '',
  service_notice_dismissible_message: '',
  service_notice_dismissible_message_color: '',
}

/**
 * @param {FastifyInstance} fastify
 * @returns {Omit<ViewContext, 'currentPath' | 'htmx' | 'title'>}
 */
export function createDefaultViewContext (fastify) {
  const transport = fastify.config.TRANSPORT
  const host = fastify.config.HOST

  return {
    siteName: 'Breadcrum',
    siteDescription: 'Personal private bookmarking with video, audio, and text archiving and podcasting tools.',
    baseUrl: `${transport}://${host}`,
    host,
    transport,
    version: String(fastify.pkg.version ?? '0.0.0'),
    mastodonUrl: 'https://fosstodon.org/@breadcrum',
    discordUrl: 'https://discord.gg/pYJdTvNdZN',
    siteTwitterUrl: 'http://x.com/breadcrum_',
    bskyUrl: 'https://bsky.app/profile/breadcrum.net',
    themeColorLight: '#ffffff',
    themeColorDark: '#1a1a1a',
    user: null,
    flags: defaultViewFrontendFlags,
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} flags
 * @returns {FrontendFlags}
 */
export function normalizeFrontendFlags (flags) {
  return {
    registration: typeof flags?.['registration'] === 'boolean'
      ? flags['registration']
      : defaultViewFrontendFlags.registration,
    registration_invite_required: typeof flags?.['registration_invite_required'] === 'boolean'
      ? flags['registration_invite_required']
      : defaultViewFrontendFlags.registration_invite_required,
    service_notice_message: stringFlag(flags, 'service_notice_message'),
    service_notice_message_color: stringFlag(flags, 'service_notice_message_color'),
    service_notice_dismissible_message: stringFlag(flags, 'service_notice_dismissible_message'),
    service_notice_dismissible_message_color: stringFlag(flags, 'service_notice_dismissible_message_color'),
  }
}

/**
 * @param {FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {Pick<ViewContext, 'title'> & Partial<ViewContext>} data
 * @returns {ViewContext}
 */
export function createViewContext (fastify, request, data) {
  return {
    ...createDefaultViewContext(fastify),
    currentPath: request.url,
    htmx: getHtmxContext(request),
    ...data,
  }
}

/**
 * Build a complete route view context from over-the-wire request state.
 *
 * @param {FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @param {Pick<ViewContext, 'title'> & Partial<ViewContext>} data
 * @returns {Promise<ViewContext>}
 */
export async function createRouteViewContext (fastify, request, data) {
  const [flags, user] = await Promise.all([
    fastify.getFlags({ frontend: true, backend: false }),
    getOptionalViewUser(fastify, request),
  ])

  return createViewContext(fastify, request, {
    flags: data.flags ?? normalizeFrontendFlags(flags),
    user: data.user ?? user,
    ...data,
  })
}

/**
 * Reads the current user from the existing signed JWT cookie when present.
 *
 * @param {FastifyInstance} fastify
 * @param {FastifyRequest} request
 * @returns {Promise<ViewUser | null>}
 */
export async function getOptionalViewUser (fastify, request) {
  try {
    await request.jwtVerify()
  } catch {
    return null
  }

  const userId = request.user?.id
  if (!userId) return null

  const user = await getUser({ fastify, userId })
  return user ? toViewUser(user) : null
}

/**
 * @param {TypeUserRead} user
 * @returns {ViewUser}
 */
function toViewUser (user) {
  return {
    id: user.id,
    username: user.username,
    email_confirmed: user.email_confirmed,
    admin: user.admin,
    disabled: Boolean(user.disabled),
    disabled_reason: user.disabled_reason ?? null,
    service_notice_dismissed_hash: user.service_notice_dismissed_hash ?? null,
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} flags
 * @param {keyof FrontendFlags} key
 * @returns {string}
 */
function stringFlag (flags, key) {
  const value = flags?.[key]
  return typeof value === 'string' ? value : ''
}
