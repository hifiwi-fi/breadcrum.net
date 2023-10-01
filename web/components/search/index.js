/* eslint-env browser */
/* eslint-disable camelcase */
import { Component, html, useCallback } from 'uland-isomorphic'
// import cn from 'classnames'

export const search = Component(
  ({
    placeholder = 'Search...',
    value,
    onSearch = (query) => {}
  }) => {
    const handleSearch = useCallback((ev) => {
      ev.preventDefault()
      const query = ev.currentTarget.search.value
      onSearch(query)
    }, [onSearch])

    return html`
    <div class="bc-search-container">
      <search role="search">
        <form onsubmit="${handleSearch}" class="search-form">
          <input value="${value}" class="search-bar" placeholder="${placeholder}" type="search" name="search">
          <input name="search-button" type="submit" value="search">
        </form>
      </search>
    </div>
    `
  }
)
