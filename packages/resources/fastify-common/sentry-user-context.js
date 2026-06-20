/**
 * @typedef {Object} SentryUserContext
 * @property {string} id
 */

/**
 * @param {unknown} request
 * @returns {SentryUserContext | null}
 */
export function getSentryUserFromFastifyRequest (request) {
  const requestWithUser = /** @type {{ user?: { id?: unknown }, feedTokenUser?: { userId?: unknown } }} */ (request)
  const userId = requestWithUser.user?.id ?? requestWithUser.feedTokenUser?.userId

  return typeof userId === 'string' ? { id: userId } : null
}

/**
 * @param {unknown} jobData
 * @returns {SentryUserContext | null}
 */
export function getSentryUserFromPgBossJobData (jobData) {
  if (!jobData || typeof jobData !== 'object') return null

  const data = /** @type {{ userId?: unknown }} */ (jobData)
  return typeof data.userId === 'string' ? { id: data.userId } : null
}
