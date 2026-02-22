/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

/**
 * @typedef {{
 *  onSubmitUrl: (url: string) => void,
 *  openOnMount?: boolean,
 *  showToggle?: boolean,
 *  showCancel?: boolean,
 * }} BookmarkQuickAddProps
 */

/**
 * @type {FunctionComponent<BookmarkQuickAddProps>}
 */
export const BookmarkQuickAdd = ({
  onSubmitUrl,
  openOnMount = false,
  showToggle = true,
  showCancel = true,
}) => {
  const [open, setOpen] = useState(openOnMount || !showToggle)
  const inputRef = useRef(/** @type {HTMLInputElement | null} */(null))

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleSubmit = useCallback((/** @type {Event & {currentTarget: HTMLFormElement}} */ev) => {
    ev.preventDefault()
    const form = ev.currentTarget
    if (!form.reportValidity()) return
    const urlElement = /** @type {HTMLInputElement | null} */ (form.elements.namedItem('url'))
    const url = urlElement?.value.trim()
    if (!url) return
    onSubmitUrl(url)
  }, [onSubmitUrl])

  const handleOpen = useCallback(() => {
    setOpen(true)
  }, [])

  const handleCancel = useCallback(() => {
    if (!showToggle) return
    setOpen(false)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [showToggle])

  return html`
    <div class="bc-bookmark-quick-add">
      ${open
        ? html`
          <form class="bc-quick-add-form" onSubmit=${handleSubmit}>
            <label class="bc-quick-add-label">
              🔖
              <input
                ref=${inputRef}
                type="url"
                name="url"
                placeholder="Paste a URL to bookmark"
                required
              />
            </label>
            <button type="submit">Add</button>
            ${showCancel
              ? html`<button type="button" onClick=${handleCancel}>Cancel</button>`
              : null}
          </form>
          <a class="bc-help-text bc-quick-add-help" href="/docs/bookmarks/bookmarklets/">
            Adding bookmarks is easier with the bookmarklet!
          </a>
        `
        : showToggle
          ? html`<button type="button" onClick=${handleOpen}>🔖 add +</button>`
          : null
      }
    </div>
  `
}
