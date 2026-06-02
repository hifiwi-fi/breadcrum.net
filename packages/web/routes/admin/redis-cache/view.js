/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @typedef {object} AdminRedisCacheState
 * @property {string} message
 * @property {string} error
 */

/**
 * @typedef {ViewContext & { adminRedisCache: AdminRedisCacheState }} AdminRedisCacheContext
 */

/**
 * @type {FragtmlTemplate<AdminRedisCacheContext, AppLayoutName, AppFragmentId>}
 */
export const adminRedisCachePage = (context) => html/* html */`
  <div class="bc-admin-page">
    <h1>Redis cache</h1>
    ${adminNav()}
    ${context.adminRedisCache.message ? html`<div class="bc-info-message" role="status">${context.adminRedisCache.message}</div>` : null}
    ${context.adminRedisCache.error ? html`<div class="bc-form-errors" role="alert"><p>${context.adminRedisCache.error}</p></div>` : null}
    <p>This flushes all cache keys from the Redis instance used by the app.</p>
    <form method="post" action="/admin/redis-cache/">
      <button class="bc-button bc-button-primary" type="submit">Flush Redis cache</button>
    </form>
  </div>
`

/**
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function adminNav () {
  return html/* html */`
    <nav class="bc-admin-subnav" aria-label="Admin navigation">
      <a href="/admin/">Admin</a>
      <a href="/admin/flags/">Flags</a>
      <a href="/admin/stats/">Stats</a>
      <a href="/admin/users/">Users</a>
    </nav>
  `
}
