/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

/**
 * @typedef {{
 *  onSubmitUrl: (url: string) => void,
 * }} BookmarkQuickAddProps
 */

/**
 * @type {FunctionComponent<BookmarkQuickAddProps>}
 */
export const BookmarkQuickAdd = ({ onSubmitUrl }) => {
  const [open, setOpen] = useState(false)
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
    setOpen(false)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [])

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
            <button type="button" onClick=${handleCancel}>Cancel</button>
          </form>
        `
        : html`
          <button type="button" onClick=${handleOpen}>🔖 add +</button>
        `
      }
    </div>
  `
}
