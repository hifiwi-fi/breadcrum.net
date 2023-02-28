/* eslint-env browser */
import { Component, html, render } from 'uland-isomorphic'
import { bookmarklet } from '../bookmarklets/bookmarklet.js'
import { version } from '@breadcrum/bookmarklet/version.js'

export const page = Component(() => {
  return html`
    <h1>📑 Bookmarklets</h1>

  <p>
    Drag this bookmarklet to your bookmark bar or menu.
    When you visit a page you want to bookmark, click the the bookmarklet in your bookmark bar or menu and it will open a new bookmark window. Existing URLs will open an edit window.
  </p>

  <p><a class="bc-bookmarklet" href="${bookmarklet}">🥖 bookmark</a> <span class="bc-help-text">Version ${version}</span></p>

  <h2>Apple Shortcut</h2>

  <p>This apple shortcut will let you save safari web pages to breadcrum from the share sheet. Eventually this will be provided by a native app.</p>

  <ul>
    <li>
      <a href="https://www.icloud.com/shortcuts/7026e513f3d749b8b4f40f61c6d88cd5">Breadcrum iOS shortcut</a>
    </li>
    </ul>

`
})

if (typeof window !== 'undefined') {
  render(document.querySelector('.bc-main'), page)
}
