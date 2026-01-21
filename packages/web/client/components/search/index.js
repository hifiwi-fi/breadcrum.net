/// <reference lib="dom" />

/**
 * @import { FunctionComponent } from 'preact'
 */

import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'

/**
 * @typedef {object} SearchProps
 * @property {string} [placeholder]
 * @property {string} [value]
 * @property {(query: string) => void} [onSearch]
 * @property {boolean} [autofocus]
 */

/**
 * @type {FunctionComponent<SearchProps>}
 */
export const Search = ({
  placeholder = 'Search...',
  value,
  onSearch = () => {},
  autofocus = false,
}) => {
  const handleSearch = useCallback((/** @type {SubmitEvent & {currentTarget: HTMLFormElement}} */ev) => {
    ev.preventDefault()
    const form = ev.currentTarget
    const formData = new FormData(form)
    const query = /** @type {string} */(formData.get('search') || '')
    onSearch(query)
  }, [onSearch])

  return html`
    <div class="bc-search-container">
      <search role="search">
        <form onSubmit="${handleSearch}" class="search-form">
          <input
            defaultValue="${value}"
            class="search-bar"
            placeholder="${placeholder}"
            type="search"
            name="search"
            autofocus=${autofocus ? '' : null}
          />
          <input name="search-button" type="submit" value="search" />
        </form>
      </search>
    </div>
  `
}
