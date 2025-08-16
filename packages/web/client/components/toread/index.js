/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import cn from 'classnames'

/** @type{FunctionComponent<{
 * toread: boolean,
 * onToggleRead: (ev: MouseEvent) => void
}>} */
export const ToRead = ({
  toread = false,
  onToggleRead = () => {},
}) => {
  return html`
    <span class="${cn({ 'bc-unread': toread, 'bc-read': !toread, 'bc-toread': true })}" onClick=${onToggleRead}>
      ${toread
        ? html`
          <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
             width="15px" height="15px" viewBox="0 0 120 120" enable-background="new 0 0 120 120" xml:space="preserve">
            <circle cx="60" cy="60.834" r="54.167" fill=currentColor/>
          </svg>`
        : html`
          <svg width="15px" height="15px" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10.5" cy="10.5" fill="none" r="8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`
        }
    </span>`
}
