/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 */

import html from 'fragtml'

/**
 * @typedef {ViewContext & { adminDeps: { output: string } }} AdminDepsContext
 */

/**
 * @type {FragtmlTemplate<AdminDepsContext, AppLayoutName, AppFragmentId>}
 */
export const adminDepsPage = (context) => html/* html */`
  <div class="bc-admin-page">
    <h1>Deps</h1>
    ${adminNav()}
    <pre class="bc-admin-pre"><code>${context.adminDeps.output}</code></pre>
  </div>
`

/**
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function adminNav () {
  return html/* html */`
    <nav class="bc-admin-subnav" aria-label="Admin navigation">
      <a href="/admin/">Admin</a>
      <a href="/admin/stats/">Stats</a>
      <a href="/admin/flags/">Flags</a>
      <a href="/admin/users/">Users</a>
    </nav>
  `
}
