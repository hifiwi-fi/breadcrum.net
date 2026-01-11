/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { SchemaTypeAdminUserReadClient } from '../../../routes/api/admin/users/schemas/schema-admin-user-read.js'
 */

/**
 * @param {SchemaTypeAdminUserReadClient['user_agent']} userAgent
 * @returns {string}
 */
export function formatUserAgent (userAgent) {
  if (!userAgent) return 'Unknown'

  const browserVersion = `${userAgent.major}.${userAgent.minor}${userAgent.patch ? `.${userAgent.patch}` : ''}`
  const osVersion = `${userAgent.os.major}.${userAgent.os.minor}${userAgent.os.patch ? `.${userAgent.os.patch}` : ''}`
  const device = userAgent.device.family !== 'Other' ? ` (${userAgent.device.family})` : ''

  return `Browser: ${userAgent.family} ${browserVersion} on ${userAgent.os.family} ${osVersion}${device}`
}
