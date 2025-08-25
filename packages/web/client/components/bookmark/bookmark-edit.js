/// <reference lib="dom" />
/* eslint-env browser */
/* eslint-disable camelcase */

/**
 * @import { FunctionComponent, ComponentChild } from 'preact'
 * @import { TypeBookmarkReadClient } from '../../../routes/api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { TypeEpisodePreview } from '../../../routes/api/episodes/schemas/episode-preview.js'
 */

import { html } from 'htm/preact'
import { useState, useRef, useCallback, useEffect } from 'preact/hooks'
import cn from 'classnames'
import format from 'format-duration'
import { useWindow } from '../../hooks/useWindow.js'
import { EpisodeTitle } from '../episode-title/index.js'
import { useLSP } from '../../hooks/useLSP.js'
import { ArchiveTitle } from '../archive-title/index.js'

/**
 * @typedef {object} BookmarkEditProps
 * @property {TypeBookmarkReadClient} [bookmark]
 * @property {boolean} [bookmarkletUpdateAvailable]
 * @property {string} [bookmarkletVersion]
 * @property {(formState: any) => Promise<void>} [onSave]
 * @property {() => Promise<void>} [onDeleteBookmark]
 * @property {() => void} [onCancelEdit]
 * @property {string | ComponentChild} [legend]
 */

/**
 * @type {FunctionComponent<BookmarkEditProps>}
 */
export const BookmarkEdit = ({
  bookmark: b,
  bookmarkletUpdateAvailable,
  bookmarkletVersion,
  onSave,
  onDeleteBookmark,
  onCancelEdit,
  legend,
}) => {
  const window = useWindow()
  const state = useLSP()
  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef(/** @type {HTMLFormElement | null} */(null))
  const [archiveURLs, setArchiveURLs] = useState(/** @type {(string | undefined)[]} */(b?.archive_urls?.length ? [...b.archive_urls] : [undefined]))
  const [createEpisodeChecked, setCreateEpisodeChecked] = useState(false)
  const [customEpisodeURLChecked, setCustomEpisodeURLChecked] = useState(false)
  const [episodeMediumSelect, setEpisodeMediumSelect] = useState(/** @type {string | null} */(null))
  const [episodePreviewLoading, setEpisodePreviewLoading] = useState(false)
  const [episodePreview, setEpisodePreview] = useState(/** @type {TypeEpisodePreview | null} */(null))
  const [episodePreviewError, setEpisodePreviewError] = useState(/** @type {Error | null} */(null))
  const [prevBookmarkURLValue, setPrevBookmarkURLValue] = useState(/** @type {string | undefined} */(b?.url))
  const [previewRefresh, setPreviewRefresh] = useState(0)

  useEffect(() => {
    // Set bookmark archiveURL state when we get new ones in
    if (b?.archive_urls?.length) {
      setArchiveURLs([...b.archive_urls])
    }
  }, [b?.archive_urls])

  useEffect(() => {
    /** @param {KeyboardEvent} ev */
    const handleKeyDown = (ev) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') {
        ev.preventDefault()
        const form = /** @type {HTMLFormElement | null} */ (/** @type {unknown} */ (formRef.current))
        if (form) {
          // Dispatch a native submit event to trigger the form submission
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [formRef])

  useEffect(() => {
    const controller = new AbortController()
    const getPreview = async () => {
      setEpisodePreviewLoading(true)
      setEpisodePreview(null)
      setEpisodePreviewError(null)
      try {
        const form = /** @type {HTMLFormElement | null} */ (/** @type {unknown} */ (formRef.current))
        const searchParams = new URLSearchParams()
        searchParams.set('url', form?.['createEpisodeURL'].value)
        searchParams.set('medium', form?.['episodeMedium'].value)
        const response = await fetch(`${state.apiUrl}/episodes/preview?${searchParams}`, {
          headers: {
            'content-type': 'application/json',
          },
          signal: controller.signal,
        })

        if (response.ok) {
          /** @type {TypeEpisodePreview} */
          const body = await response.json()
          setEpisodePreview(body)
        } else {
          const err = await response.json()
          setEpisodePreviewError(new Error(`${err.message}`))
        }
      } catch (err) {
        const error = /** @type {Error} */(err)
        if (error.name !== 'AbortError') {
          console.error(error)
          setEpisodePreviewError(error)
        }
      } finally {
        if (!controller.signal.aborted) {
          setEpisodePreviewLoading(false)
        }
      }
    }
    if (createEpisodeChecked) {
      getPreview()
    }

    return () => {
      controller.abort()
    }
  }, [createEpisodeChecked, episodeMediumSelect, previewRefresh])

  const handleInitiateDelete = useCallback(() => {
    setDeleteConfirm(true)
  }, [setDeleteConfirm])

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(false)
  }, [setDeleteConfirm])

  const handleDeleteBookmark = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      if (onDeleteBookmark) await onDeleteBookmark()
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, onDeleteBookmark])

  const handleCreateEpisodeCheckbox = useCallback(async (/** @type {Event & {currentTarget: HTMLInputElement}} */ev) => {
    const checked = ev.currentTarget.checked
    setCreateEpisodeChecked(checked)
  }, [setCreateEpisodeChecked])

  const handleEpisodeMediumSelect = useCallback(async () => {
    setEpisodeMediumSelect(formRef?.current?.['episodeMedium'].value)
  }, [setEpisodeMediumSelect, formRef])

  const handleCustomEpisodeURLCheckboxChange = useCallback(async (/** @type {Event & {currentTarget: HTMLInputElement}} */ev) => {
    const checked = ev.currentTarget.checked
    setCustomEpisodeURLChecked(checked)
    const form = formRef.current
    const createEpisodeURLNode = form?.['createEpisodeURL']
    if (!checked && createEpisodeURLNode) {
      if (createEpisodeURLNode.value !== form?.['url'].value) {
        createEpisodeURLNode.value = form?.['url'].value
        setPreviewRefresh(previewRefresh + 1)
      }
    }
  }, [formRef, setCustomEpisodeURLChecked])

  const handleBookmarkURLInput = useCallback(async (/** @type {Event & {currentTarget: HTMLInputElement}} */ev) => {
    const form = formRef.current
    const createEpisodeNode = form?.['createEpisodeURL']
    if (!createEpisodeNode.checked || createEpisodeNode.value === prevBookmarkURLValue) {
      createEpisodeNode.value = ev.currentTarget.value
    }
    setPrevBookmarkURLValue(ev.currentTarget.value)
  }, [formRef, prevBookmarkURLValue])

  useEffect(() => {
    setPrevBookmarkURLValue(b?.url)
  }, [b?.url])

  const handlePreviewRefresh = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setPreviewRefresh(previewRefresh + 1)
  }, [])

  const handleSave = useCallback(async (/** @type {SubmitEvent} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = formRef.current
    if (!form) return

    /** @type {string} */
    let url = form['url'].value
    try {
      url = (new URL(url)).toString()
    } catch (err) {
      console.warn(new Error(`Error sanitizing URL: ${url}`, { cause: err }))
    }
    // @ts-expect-error title is a shadowed property
    const title = /** @type{string} */ (form['title'].value)
    const note = /** @type{string} */ (form['note'].value)
    const summary = /** @type{string} */ (form['summary'].value)
    const rawTags = /** @type{string} */ (form['tags'].value)
    const tags = Array.from(new Set(rawTags.split(' ').map(t => t.trim()).filter(t => Boolean(t))))
    const toread = /** @type{boolean} */(form['toread'].checked)
    const starred = /** @type{boolean} */(form['starred'].checked)
    const sensitive = /** @type{boolean} */(form['sensitive'].checked)
    const createArchive = /** @type{boolean} */(form['createArchive'].checked)
    const episodeMedium = /** @type{string} */(form['episodeMedium'].value)
    let episodeURL = customEpisodeURLChecked ? /** @type{string} */(form['createEpisodeURL'].value) : url
    try {
      episodeURL = (new URL(form['createEpisodeURL'].value)).toString()
    } catch (err) {
      console.error(new Error(`Error sanitizing episode URL: ${episodeURL}`, { cause: err }))
    }

    let archive_urls = []

    for (const i of Object.keys(archiveURLs)) {
      let archiveURL = /** @type{string} */(form[`archive-url-${i}`].value)
      try {
        archiveURL = (new URL(archiveURL)).toString()
      } catch (err) {
        console.error(new Error(`Error sanitizing archive URL: ${archiveURL}`, { cause: err }))
      }
      archive_urls.push(archiveURL)
    }

    archive_urls = archive_urls.filter(v => !!v && validateURL(v)).map(url => url.trim())

    const createEpisode = createEpisodeChecked
      ? {
          type: 'redirect',
          medium: episodeMedium,
          url: episodeURL,
        }
      : null

    const formState = {
      url,
      title,
      note,
      summary,
      tags,
      toread,
      starred,
      sensitive,
      archive_urls,
      createArchive,
      createEpisode,
    }

    try {
      if (onSave) await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, formRef?.current, onSave, createEpisodeChecked, customEpisodeURLChecked])

  const handleAddArchiveURL = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    archiveURLs.push(undefined)
    setArchiveURLs(archiveURLs)
  }, [archiveURLs])

  const handleUndoAddArchiveURL = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    archiveURLs.pop()
    setArchiveURLs(archiveURLs)
  }, [archiveURLs])

  const handleNewWindowLink = useCallback((/** @type {MouseEvent & {currentTarget: HTMLAnchorElement}} */ev) => {
    if (window?.toolbar.visible) {
      ev.preventDefault()
      window.open(ev.currentTarget.href)
    }
  }, [window])

  // Parent can delay passing a bookmark to disable the form.
  const initializing = b == null

  return html`
    <div class='bc-bookmark-edit'>
      <form ref="${formRef}" class="add-bookmark-form" id="add-bookmark-form" onsubmit=${handleSave}>
      <fieldset class='bc-bookmark-edit-fieldset' disabled=${disabled || initializing}>
        ${legend ? html`<legend class="bc-bookmark-legend">${legend}</legend>` : null}

        <!-- Bookmark URL -->
        <div>
          <label class='block'>
            url:
            <input class='block bc-bookmark-url-edit' type="url" name="url" value="${b?.url}" oninput="${handleBookmarkURLInput}" />
          </label>
        </div>

        <!-- Bookmark Title -->
        <div>
          <label class="block">
            title:
            <input class="block" type="text" name="title" value="${b?.title}" />
          </label>
        </div>

        <!-- Bookmark Note -->
        <div>
          <label class="block">
            note:
            <textarea class="bc-bookmark-note" rows="6" name="note">${b?.note}</textarea>
          </label>
        </div>

        <!-- Bookmark Tags -->
        <div>
          <label class="block">
            tags:
            <input
              class="block"
              type="text"
              name="tags"
              autocapitalize="off"
              autocorrect="off"
              value="${b?.tags?.join(' ')}"
            />
          </label>
        </div>

        <!-- Bookmark Options -->
        <div>
          <label>
            <input type="checkbox" name="toread" checked="${b?.toread}" />
            to read
          </label>
          <label>
            <input type="checkbox" name="starred" checked="${b?.starred}" />
            starred
          </label>
          <label>
            <input type="checkbox" name="sensitive" checked="${b?.sensitive}" />
            sensitive
          </label>
        </div>

        <!-- Bookmark Summary -->
        <details class="bc-bookmark-summary-edit-details">
            <summary>
              <label>summary</label>
              <span class="bc-help-text">
                ℹ️ Summary fallback text is typically auto-populated
              </span>
            </summary>

            <textarea class="bc-bookmark-summary" rows="3" name="summary">${b?.summary}</textarea>
        </details>

         <!-- Bookmark Archive URLs -->
        <details class="bc-bookmark-archive-url-edit-details" ?open=${archiveURLs[0] !== undefined} >
            <summary>
              <label>archive URLs</label>
              <span class="bc-help-text">
                ℹ️ Save associated public archive URLs
              </span>
            </summary>

            <div class="bc-help-text">
              ↬:
              <a onClick=${handleNewWindowLink} target="_blank" href="${`https://archive.today/?run=1&url=${encodeURIComponent(b?.url ?? '')}`}">archive.today</a>,
              <a onClick=${handleNewWindowLink} target="_blank" href="${`https://ghostarchive.org/search?term=${encodeURIComponent(b?.url ?? '')}`}">ghostarchive.org</a>,
              <a onClick=${handleNewWindowLink} target="_blank" href="${`https://web.archive.org/${encodeURIComponent(b?.url ?? '')}`}">web.archive.org</a>,
              <a onClick=${handleNewWindowLink} target="_blank" href="${`https://threadreaderapp.com/search?q=${encodeURIComponent(b?.url ?? '')}`}">threadreaderapp.com</a>
            </div>

            ${archiveURLs.length > 0
              ? html`${archiveURLs.map(
                  (url, i) => html`<input class='bc-bookmark-archive-url-edit' placeholder='https://archive.today/...' type="url" name="${`archive-url-${i}`}" value="${url}" />`
                )
            }`
              : null
            }

            <div>
              <button onClick=${handleAddArchiveURL}>add</button>
              ${archiveURLs.length > 1 ? html`<button onClick=${handleUndoAddArchiveURL}>remove</button>` : null}
            </div>

        </details>

        ${b?.archives?.length
            ? html`
            <label class="block">
              archives:
            </label>
            ${b.archives.map(
                ar => html`<${ArchiveTitle} key=${ar.id} archive=${ar} small=${true} />`
              )
          }`
            : null
        }

        ${b?.episodes?.length
            ? html`
            <label class="block">
              episodes:
            </label>
            ${b.episodes.map(
                ep => html`<${EpisodeTitle} key=${ep.id} episode=${ep} small=${true} />`
              )
          }`
            : null
        }


        <!-- Readability Archive Options -->
        <div>
          <label>
            <input type="checkbox" name="createArchive" />
            create new archive
          </label>
          <span class="bc-help-text">
            ℹ️ Save readability archive
          </span>
        </div>

        <!-- Bookmark Create Episode -->
        <div>
          <label>
            <input type="checkbox" onChange="${handleCreateEpisodeCheckbox}" name="createEpisode" />
            create new episode
          </label>
          <span class="bc-help-text">
            ℹ️ Save an episode with this bookmark
          </span>
        </div>

        <div class="${cn({
          'bc-create-episode-details': true,
          'bc-create-episode-hidden': !createEpisodeChecked,
        })}">
          <div id="bc-podcast-radio">
            <label>
              <input
                type="radio"
                name="episodeMedium"
                value="video"
                checked="${true}"
                onChange="${handleEpisodeMediumSelect}"
              />
              <span>video</span>
            </label>

            <label>
              <input
                type="radio"
                name="episodeMedium"
                value="audio"
                onChange=${handleEpisodeMediumSelect}
              />
              <span>audio</span>
            </label>
          <label>
            <input type="checkbox" name="custom-episode-url" onChange="${handleCustomEpisodeURLCheckboxChange}" />
            custom url
          </label>
          <button onClick="${handlePreviewRefresh}">refresh preview</button>
          </div>

          <input class="${cn({
            'bc-bookmark-edit-create-episode-url': true,
            'bc-bookmark-edit-create-episode-url-hidden': !customEpisodeURLChecked,
          })}" type="url" name="createEpisodeURL" value="${b?.url}" />

          ${episodePreviewLoading ? html`<div class="bc-help-text">Episode preview loading...</div>` : null}
          ${episodePreview
            ? html`
            <span class="bc-help-text bc-episode-preview-title">
              <span>${episodePreview?.src_type === 'video' ? '📼' : episodePreview?.src_type === 'audio' ? '💿' : null}</span>
              <a onClick=${handleNewWindowLink} target="_blank" href="${episodePreview?.url}">${`${episodePreview?.title}.${episodePreview?.ext}`}</a>
              <span>(${format((episodePreview?.duration || 0) * 1000)})</span>
            <span>
            `
            : null
          }
          ${episodePreviewError
            ? html`<pre class='bc-bookmark-edit-episode-error'>${episodePreviewError?.message}</pre>`
            : null
          }
        </div>

        <!-- Bookmark Submission Line -->
        <div class="bc-bookmark-edit-submit-line">
          <div class="button-cluster">
            ${onSave ? html`<input name="submit-button" type="submit" />` : null}
            ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
          </div>
          <div>
            ${onDeleteBookmark
              ? deleteConfirm
                ? html`
                  <button onClick=${handleCancelDelete}>Cancel</button>
                  <button onClick=${handleDeleteBookmark}>Destroy</button>`
                : html`<button onClick=${handleInitiateDelete}>Delete</button>`
              : null
            }
          </div>
        </div>

        ${
          bookmarkletVersion
            ? html`
            <div class="bc-help-text">
              Version ${bookmarkletVersion}
              ${bookmarkletUpdateAvailable
                ? html`<a onClick=${handleNewWindowLink} target="_blank" href="/docs/bookmarklets/">An updated bookmarklet is available</a>`
              : null}
            </div>
            `
            : null
        }
        <!-- Bookmark Error Box -->
        ${error ? html`<div class="error-box">${error.message}</div>` : null}
      </fieldset>
    </form>
    </div>`
}

function validateURL (/** @type {string} */maybeURL) {
  return URL.canParse(maybeURL)
}
