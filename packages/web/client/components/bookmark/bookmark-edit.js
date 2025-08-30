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
import { useReload } from '../../hooks/useReload.js'

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
  const formRef = useRef(/** @type {HTMLFormElement | null} */(null))

  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [archiveURLs, setArchiveURLs] = useState(/** @type {(string | undefined)[]} */(b?.archive_urls?.length ? [...b.archive_urls] : [undefined]))
  const [createEpisodeChecked, setCreateEpisodeChecked] = useState(false)
  const [customEpisodeURLChecked, setCustomEpisodeURLChecked] = useState(false)
  const [episodeMediumSelect, setEpisodeMediumSelect] = useState(/** @type {string | null} */(null))
  const [episodePreviewLoading, setEpisodePreviewLoading] = useState(false)
  const [episodePreview, setEpisodePreview] = useState(/** @type {TypeEpisodePreview | null} */(null))
  const [episodePreviewError, setEpisodePreviewError] = useState(/** @type {Error | null} */(null))
  const [prevBookmarkURLValue, setPrevBookmarkURLValue] = useState(/** @type {string | undefined} */(b?.url))
  const { signal: previewSignal, reload: previewReload } = useReload()

  useEffect(() => {
    // Set bookmark archiveURL state when we get new ones in
    if (b?.archive_urls?.length) {
      setArchiveURLs([...b.archive_urls])
    }
  }, [...(b?.archive_urls ?? [])])

  useEffect(() => {
    // Keyboard handler for ctl-enter saving

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
    // Episode preview trigger
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
  }, [createEpisodeChecked, episodeMediumSelect, previewSignal])

  const handleInitiateDelete = useCallback(() => {
    // Enter delete modal
    setDeleteConfirm(true)
  }, [setDeleteConfirm])

  const handleCancelDelete = useCallback(() => {
    // Leave delete modal
    setDeleteConfirm(false)
  }, [setDeleteConfirm])

  const handleDeleteBookmark = useCallback(async (/** @type {Event} */ev) => {
    // Actually delete the bookmark
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
    // Create episode checkbox clicked
    const checked = ev.currentTarget.checked
    setCreateEpisodeChecked(checked)
  }, [setCreateEpisodeChecked])

  const handleEpisodeMediumSelect = useCallback(async () => {
    // Episode medium selected
    setEpisodeMediumSelect(formRef?.current?.['episodeMedium'].value)
  }, [setEpisodeMediumSelect, formRef])

  const handleCustomEpisodeURLCheckboxChange = useCallback(async (/** @type {Event & {currentTarget: HTMLInputElement}} */ev) => {
    // Custom episode selected
    const checked = ev.currentTarget.checked
    setCustomEpisodeURLChecked(checked)
    const form = formRef.current
    const createEpisodeURLNode = form?.['createEpisodeURL']
    if (!checked && createEpisodeURLNode) {
      if (createEpisodeURLNode.value !== form?.['url'].value) {
        createEpisodeURLNode.value = form?.['url'].value
        previewReload()
      }
    }
  }, [formRef, setCustomEpisodeURLChecked, previewReload])

  const handleBookmarkURLInput = useCallback(async (/** @type {Event & {currentTarget: HTMLInputElement}} */ev) => {
    // Bookmark episode default custom URL sync
    const form = formRef.current
    const createEpisodeNode = form?.['createEpisodeURL']
    if (!createEpisodeNode.checked || createEpisodeNode.value === prevBookmarkURLValue) {
      createEpisodeNode.value = ev.currentTarget.value
    }
    setPrevBookmarkURLValue(ev.currentTarget.value)
  }, [formRef, prevBookmarkURLValue])

  useEffect(() => {
    // Initial bookmark URL set
    setPrevBookmarkURLValue(b?.url)
  }, [b?.url])

  const handlePreviewRefresh = useCallback(async (/** @type {Event} */ev) => {
    // Preview refresh event handler
    ev.preventDefault()
    previewReload()
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
      if (archiveURL) {
        try {
          archiveURL = (new URL(archiveURL)).toString()
        } catch (err) {
          console.error(new Error(`Error sanitizing archive URL: ${archiveURL}`, { cause: err }))
        }
        archive_urls.push(archiveURL)
      }
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
  }, [setDisabled, setError, formRef?.current, onSave, createEpisodeChecked, customEpisodeURLChecked, archiveURLs])

  const handleAddArchiveURL = useCallback((/** @type {Event} */ev) => {
    // Adding a new archive URL row
    ev.preventDefault()
    setArchiveURLs([...archiveURLs, undefined])
  }, [archiveURLs, setArchiveURLs])

  const handleUndoAddArchiveURL = useCallback((/** @type {Event} */ev) => {
    // Removing an archive URL row
    ev.preventDefault()
    archiveURLs.pop()
    setArchiveURLs([...archiveURLs])
  }, [archiveURLs, setArchiveURLs])

  const handleNewWindowLink = useCallback((/** @type {MouseEvent & {currentTarget: HTMLAnchorElement}} */ev) => {
    // Open a link in a new window
    if (window?.toolbar.visible) {
      ev.preventDefault()
      window.open(ev.currentTarget.href)
    }
  }, [window])

  // Parent can delay passing a bookmark to disable the form.
  const initializing = b === null

  return html`
    <div class='bc-bookmark-edit'>
      <form ref=${formRef} class="add-bookmark-form" id="add-bookmark-form" onSubmit=${handleSave}>
      <fieldset class='bc-bookmark-edit-fieldset' disabled=${disabled || initializing}>
        ${legend ? html`<legend class="bc-bookmark-legend">${legend}</legend>` : null}

        <!-- Bookmark URL -->
        <div>
          <label class='block'>
            url:
            <input class='block bc-bookmark-url-edit' type="url" name="url" defaultValue="${b?.url}" onInput="${handleBookmarkURLInput}" />
          </label>
        </div>

        <!-- Bookmark Title -->
        <div>
          <label class="block">
            title:
            <input class="block" type="text" name="title" defaultValue="${b?.title}" />
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
              autoCapitalize="off"
              autoCorrect="off"
              defaultValue="${b?.tags?.join(' ')}"
            />
          </label>
        </div>

        <!-- Bookmark Options -->
        <div>
          <label>
            <input type="checkbox" name="toread" defaultChecked=${b?.toread} />
            ${'\n'}
            to read
          </label>
          ${'\n'}
          <label>
            <input type="checkbox" name="starred" defaultChecked=${b?.starred} />
            ${'\n'}
            starred
          </label>
          ${'\n'}
          <label>
            <input type="checkbox" name="sensitive" defaultChecked=${b?.sensitive} />
            ${'\n'}
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
        <details class="bc-bookmark-archive-url-edit-details" open=${archiveURLs[0] !== undefined} >
            <summary>
              <label>archive URLs</label>
              <span class="bc-help-text">
                ℹ️ Save associated public archive URLs
              </span>
            </summary>

            <div class="bc-help-text">
              ↬:
              <a onClick=${handleNewWindowLink} target="_blank" href="${`https://archive.today/?run=1&url=${encodeURIComponent(b?.url ?? '')}`}">archive.today</a>,
              ${'\n'}
              <a onClick=${handleNewWindowLink} target="_blank" href="${`https://ghostarchive.org/search?term=${encodeURIComponent(b?.url ?? '')}`}">ghostarchive.org</a>,
              ${'\n'}
              <a onClick=${handleNewWindowLink} target="_blank" href="${`https://web.archive.org/${encodeURIComponent(b?.url ?? '')}`}">web.archive.org</a>,
              ${'\n'}
              <a onClick=${handleNewWindowLink} target="_blank" href="${`https://threadreaderapp.com/search?q=${encodeURIComponent(b?.url ?? '')}`}">threadreaderapp.com</a>
              ${'\n'}
            </div>

            ${archiveURLs.length > 0
              ? html`${archiveURLs.map(
                  (url, i) => html`<input key=${i} class='bc-bookmark-archive-url-edit' placeHolder='https://archive.today/...' type="url" name="${`archive-url-${i}`}" defaultValue="${url}" />`
                )
            }`
              : null
            }

            <div class="button-spacing">
              <button type="button" onClick=${handleAddArchiveURL}>add</button>
              ${archiveURLs.length > 1 ? html`<button type="button" onClick=${handleUndoAddArchiveURL}>remove</button>` : null}
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
            ${'\n'}
            create new archive
          </label>
          <span class="bc-help-text">
            ℹ️ Save readability archive
          </span>
        </div>

        <!-- Bookmark Create Episode -->
        <div>
          <label>
            <input type="checkbox" onChange=${handleCreateEpisodeCheckbox} name="createEpisode" />
            ${'\n'}
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
                defaultChecked
                onChange="${handleEpisodeMediumSelect}"
              />
              ${'\n'}
              <span>video</span>
            </label>
            ${'\n'}
            <label>
              <input
                type="radio"
                name="episodeMedium"
                value="audio"
                onChange=${handleEpisodeMediumSelect}
              />
              ${'\n'}
              <span>audio</span>
            </label>
            ${'\n'}
            <label>
              <input type="checkbox" name="custom-episode-url" onChange="${handleCustomEpisodeURLCheckboxChange}" />
              ${'\n'}
              custom url
            </label>
            ${'\n'}
            <button type="button" onClick="${handlePreviewRefresh}">refresh preview</button>
          </div>

          <input class="${cn({
            'bc-bookmark-edit-create-episode-url': true,
            'bc-bookmark-edit-create-episode-url-hidden': !customEpisodeURLChecked,
          })}" type="url" name="createEpisodeURL" defaultValue="${b?.url}" />

          ${episodePreviewLoading ? html`<div class="bc-help-text">Episode preview loading...</div>` : null}
          ${episodePreview
            ? html`
            <span class="bc-help-text bc-episode-preview-title">
              <span>${episodePreview?.src_type === 'video' ? '📼' : episodePreview?.src_type === 'audio' ? '💿' : null}</span>
              ${'\n'}
              <a onClick=${handleNewWindowLink} target="_blank" href="${episodePreview?.url}">${`${episodePreview?.title}.${episodePreview?.ext}`}</a>
              ${'\n'}
              <span>(${format((episodePreview?.duration || 0) * 1000)})</span>
            </span>
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
          <div class="button-cluster button-spacing">
            ${onSave ? html`<span><input name="submit-button" type="submit" /></span>` : null}
            ${onCancelEdit ? html`<span><button type="button" onClick=${onCancelEdit}>Cancel</button></span>` : null}
          </div>
          <div class="button-spacing">
            ${onDeleteBookmark
              ? deleteConfirm
                ? html`
                  <span><button type="button" onClick=${handleCancelDelete}>Cancel</button></span>
                  <span><button type="button" onClick=${handleDeleteBookmark}>Destroy</button></span>`
                : html`<span><button type="button" onClick=${handleInitiateDelete}>Delete</button></span>`
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
