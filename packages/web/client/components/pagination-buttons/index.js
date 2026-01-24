/// <reference lib="dom" />

/** @import { FunctionComponent } from 'preact' */

import { html } from 'htm/preact'
import { useCallback } from 'preact/hooks'

/**
 * @typedef {{
 * beforeParams: string | undefined | null
 * afterParams: string | undefined | null
 * onPageNav: (ev: MouseEvent & {currentTarget: HTMLAnchorElement}) => void
 * onDateNav?: (url: string) => void
 * dateParams?: URLSearchParams | string | undefined | null
 * dateValue?: string | undefined | null
 }} PaginationButtonParams
 */

/**
 * @type {FunctionComponent<PaginationButtonParams>}
 */
export const PaginationButtons = ({
  onPageNav,
  beforeParams,
  afterParams,
  onDateNav,
  dateParams,
  dateValue
}) => {
  const showDatePicker = Boolean(onDateNav && dateParams)
  const hasBefore = Boolean(beforeParams)
  const hasAfter = Boolean(afterParams)
  const maxDateValue = (() => {
    const today = new Date()
    if (Number.isNaN(today.valueOf())) return undefined
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })()

  const handleDateChange = useCallback((/** @type {Event & {currentTarget: HTMLInputElement}} */ ev) => {
    if (!onDateNav || !dateParams) return
    const value = ev.currentTarget.value
    if (!value) return
    const selectedDay = new Date(`${value}T00:00:00`)
    if (Number.isNaN(selectedDay.valueOf())) return
    const nextDay = new Date(selectedDay)
    nextDay.setDate(nextDay.getDate() + 1)
    const params = new URLSearchParams(dateParams)
    params.set('before', String(nextDay.valueOf()))
    params.delete('after')
    onDateNav(`./?${params.toString()}`)
  }, [onDateNav, dateParams])

  return html`
    <div class="pagination-buttons">
      ${hasBefore
        ? html`<a class="pagination-button" onClick=${onPageNav} href=${'./?' + beforeParams}>earlier</a>`
        : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">earlier</span>`
      }
      ${showDatePicker
? html`
        <input
          class="pagination-date-picker"
          type="date"
          aria-label="Jump to date"
          max=${maxDateValue}
          value=${dateValue ?? ''}
          onChange=${handleDateChange}
        />
      `
: null}
      ${hasAfter
        ? html`<a class="pagination-button" onClick=${onPageNav} href=${'./?' + afterParams}>later</a>`
        : html`<span class="pagination-button pagination-button-disabled" aria-disabled="true">later</span>`
      }
    </div>
  `
}
