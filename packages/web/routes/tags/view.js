/**
 * @import { FragtmlTemplate } from 'fastify-fragtml'
 * @import { AppFragmentId, AppLayoutName, ViewContext } from '#views/context.js'
 * @import { TagSummary } from '../api/tags/tag-actions.js'
 */

import html from 'fragtml'

/**
 * @typedef {object} TagsPageState
 * @property {TagSummary[]} tags
 * @property {boolean} sensitive
 */

/**
 * @typedef {ViewContext & { tagsPage: TagsPageState }} TagsPageContext
 */

/**
 * @type {FragtmlTemplate<TagsPageContext, AppLayoutName, AppFragmentId>}
 */
export const tagsPage = (context) => html/* html */`
  <div class="bc-tags-page">
    <h1>Tags</h1>
    <div class="${context.tagsPage.tags.length === 0 ? 'bc-tags-results bc-tags-results-empty' : 'bc-tags-results'}">
      ${context.tagsPage.tags.length === 0
        ? html`<div class="bc-tags-empty">Tag some bookmarks!</div>`
        : html/* html */`
          <div class="bc-tags-list">
            ${context.tagsPage.tags.map(tag => tagView(tag, context))}
          </div>
        `}
    </div>
  </div>
`

/**
 * @param {TagSummary} tag
 * @param {TagsPageContext} context
 * @returns {import('fragtml/types.js').HtmlRenderable}
 */
function tagView (tag, context) {
  const fontSize = sizeForCount(tag.count, context.tagsPage.tags)

  return html/* html */`
    <article class="bc-tag-row" id="bc-tag-${tagSlug(tag.name)}">
      <a class="bc-tag-link" href="/bookmarks/?tag=${encodeURIComponent(tag.name)}" style="font-size: ${fontSize}">
        ${tag.name}<sup>${tag.count}</sup>
      </a>
      <div class="bc-tag-actions">
        <details>
          <summary>Rename</summary>
          <form class="bc-tag-action-form" method="post" action="/tags/rename/">
            <input type="hidden" name="old" value="${tag.name}">
            <input type="hidden" name="redirect" value="${context.currentPath}">
            <label class="bc-field">
              <span>New tag name</span>
              <input type="text" name="new" value="${tag.name}" maxlength="255" required>
            </label>
            <button class="bc-button" type="submit">Rename</button>
          </form>
        </details>
        <details>
          <summary>Merge</summary>
          <form class="bc-tag-action-form" method="post" action="/tags/merge/">
            <input type="hidden" name="source" value="${tag.name}">
            <input type="hidden" name="redirect" value="${context.currentPath}">
            <label class="bc-field">
              <span>Merge into</span>
              <input type="text" name="target" maxlength="255" required>
            </label>
            <button class="bc-button" type="submit">Merge</button>
          </form>
        </details>
        <details>
          <summary>Delete</summary>
          <form class="bc-tag-action-form" method="post" action="/tags/delete/">
            <input type="hidden" name="name" value="${tag.name}">
            <input type="hidden" name="redirect" value="${context.currentPath}">
            <button class="bc-button" type="submit">Delete tag</button>
          </form>
        </details>
      </div>
    </article>
  `
}

/**
 * @param {number} count
 * @param {TagSummary[]} tags
 * @returns {string}
 */
function sizeForCount (count, tags) {
  if (tags.length === 0) return '1em'

  const counts = tags.map(tag => tag.count).sort((a, b) => a - b)
  const minCount = counts[0] ?? 0
  const ceilingIndex = Math.floor((counts.length - 1) * 0.95)
  const maxCount = counts[ceilingIndex] ?? minCount
  const countRange = Math.max(maxCount - minCount, 1)
  const minSize = 0.85
  const maxSize = 1.6
  const clamped = Math.min(count, maxCount)
  const ratio = (clamped - minCount) / countRange

  return `${minSize + (maxSize - minSize) * ratio}em`
}

/**
 * @param {string} value
 * @returns {string}
 */
function tagSlug (value) {
  return encodeURIComponent(value).replaceAll('%', '-')
}
