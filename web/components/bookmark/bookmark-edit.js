/* eslint-env browser */
/* eslint-disable camelcase */
import { Component, html, useState, useRef, useCallback, useEffect } from 'uland-isomorphic'
import cn from 'classnames'
import format from 'format-duration'
import { useWindow } from '../../hooks/useWindow.js'
import { episodeTitle } from '../episode-title/index.js'
import { useLSP } from '../../hooks/useLSP.js'

export const bookmarkEdit = Component(({
  bookmark: b,
  bookmarkletUpdateAvailable,
  bookmarkletVersion,
  onSave,
  onDeleteBookmark,
  onCancelEdit,
  legend
} = {}) => {
  const window = useWindow()
  const state = useLSP()
  const [error, setError] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef()
  const [archiveURLs, setArchiveURLs] = useState(b?.archive_urls?.length > 0 ? [...b.archive_urls] : [undefined])
  const [createEpisodeChecked, setCreateEpisodeChecked] = useState(false)
  const [customEpisodeURLChecked, setCustomEpisodeURLChecked] = useState(false)
  const [episodeMediumSelect, setEpisodeMediumSelect] = useState(false)
  const [episodePreviewLoading, setEpisodePreviewLoading] = useState(false)
  const [episodePreview, setEpisodePreview] = useState()
  const [episodePreviewError, setEpisodePreviewError] = useState()
  const [prevBookmarkURLValue, setPrevBookmarkURLValue] = useState(formRef?.current?.url?.value)
  const [previewRefresh, setPreviewRefresh] = useState(0)

  useEffect(() => {
    // Set bookmark archiveURL state when we get new ones in
    if (b?.archive_urls?.length > 0) {
      setArchiveURLs([...b?.archive_urls])
    }
  }, [b?.archive_urls])

  useEffect(() => {
    const controller = new AbortController()
    const getPreview = async () => {
      setEpisodePreviewLoading(true)
      setEpisodePreview(null)
      setEpisodePreviewError(null)
      try {
        const form = formRef.current
        const searchParams = new URLSearchParams()
        searchParams.set('url', form.createEpisodeURL.value)
        searchParams.set('medium', form.episodeMedium.value)
        const response = await fetch(`${state.apiUrl}/episodes/preview?${searchParams}`, {
          headers: {
            'content-type': 'application/json'
          },
          signal: controller.signal
        })

        if (response.ok) {
          const body = await response.json()
          setEpisodePreview(body)
        } else {
          const err = await response.json()
          setEpisodePreviewError(new Error(`${err.message}`))
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err)
          setEpisodePreviewError(err)
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

  const handleInitiateDelete = useCallback((ev) => {
    setDeleteConfirm(true)
  }, [setDeleteConfirm])

  const hanldeCancelDelete = useCallback((ev) => {
    setDeleteConfirm(false)
  }, [setDeleteConfirm])

  const handleDeleteBookmark = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      await onDeleteBookmark()
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, onDeleteBookmark])

  const handleCreateEpisodeCheckbox = useCallback(async (ev) => {
    const checked = ev.currentTarget.checked
    setCreateEpisodeChecked(checked)
  }, [setCreateEpisodeChecked])

  const handleEpisodeMediumSelect = useCallback(async (ev) => {
    setEpisodeMediumSelect(formRef.current.episodeMedium.value)
  }, [setEpisodeMediumSelect, formRef])

  const handleCustomEpisodeURLCheckboxChange = useCallback(async (ev) => {
    const checked = ev.currentTarget.checked
    setCustomEpisodeURLChecked(checked)
    const form = formRef.current

    if (!checked) {
      if (form.createEpisodeURL.value !== form.url.value) {
        form.createEpisodeURL.value = form.url.value
        setPreviewRefresh(previewRefresh + 1)
      }
    }
  }, [formRef, setCustomEpisodeURLChecked])

  const handleBookmarkURLInput = useCallback(async (ev) => {
    const form = formRef.current
    if (!form['custom-episode-url'].checked || form.createEpisodeURL.value === prevBookmarkURLValue) {
      form.createEpisodeURL.value = ev.currentTarget.value
    }
    setPrevBookmarkURLValue(ev.currentTarget.value)
  }, [formRef, prevBookmarkURLValue])

  useEffect(() => {
    setPrevBookmarkURLValue(b?.url)
  }, [b?.url])

  const handlePreviewRefresh = useCallback(async (ev) => {
    ev.preventDefault()
    setPreviewRefresh(previewRefresh + 1)
  })

  const handleSave = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = formRef.current

    let url = form.url.value
    try {
      url = (new URL(form.url.value)).toString()
    } catch (err) {
      console.error(new Error(`Error sanitizing URL: ${url}`, { cause: err }))
    }
    const title = form.title.value
    const note = form.note.value
    const rawTags = form.tags.value
    const tags = Array.from(new Set(rawTags.split(' ').map(t => t.trim()).filter(t => Boolean(t))))
    const toread = form.toread.checked
    const starred = form.starred.checked
    const sensitive = form.sensitive.checked
    const episodeMedium = form.episodeMedium.value
    let episodeURL = customEpisodeURLChecked ? form.createEpisodeURL.value : url
    try {
      episodeURL = (new URL(form.createEpisodeURL.value)).toString()
    } catch (err) {
      console.error(new Error(`Error sanitizing episode URL: ${episodeURL}`, { cause: err }))
    }

    let archive_urls = []

    for (const i of Object.keys(archiveURLs)) {
      let archiveURL = form[`archive-url-${i}`].value
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
          url: episodeURL
        }
      : null

    const formState = {
      url,
      title,
      note,
      tags,
      toread,
      starred,
      sensitive,
      archive_urls,
      createEpisode
    }

    try {
      await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, formRef?.current, onSave, createEpisodeChecked, customEpisodeURLChecked])

  const handleAddArchiveURL = useCallback(async (ev) => {
    ev.preventDefault()
    archiveURLs.push(undefined)
    setArchiveURLs(archiveURLs)
  }, [archiveURLs])

  const handleUndoAddArchiveURL = useCallback(async (ev) => {
    ev.preventDefault()
    archiveURLs.pop()
    setArchiveURLs(archiveURLs)
  }, [archiveURLs])

  const handleNewWindowLink = useCallback((ev) => {
    if (window.toolbar.visible) {
      ev.preventDefault()
      window.open(ev.currentTarget.href)
    }
  }, [window])

  // Parent can delay passing a bookmark to disable the form.
  const initializing = b == null

  return html`
    <div class='bc-bookmark-edit'>
      <form ref="${formRef}" class="add-bookmark-form" id="add-bookmark-form" onsubmit=${handleSave}>
      <fieldset class='bc-bookmark-edit-fieldset' ?disabled=${disabled || initializing}>
        ${legend ? html`<legend class="bc-bookmark-legend">${legend}</legend>` : null}

        <!-- Bookmark URL -->
        <div>
          <label class='block'>
            url:
            <input class='block bc-bookmark-url-edit' type="url" name="url" value="${b?.url}" oninput="${handleBookmarkURLInput}">
          </label>
        </div>

        <!-- Bookmark Title -->
        <div>
          <label class="block">
            title:
            <input class="block" type="text" name="title" value="${b?.title}">
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
            >
          </label>
        </div>

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
              <a onclick=${handleNewWindowLink} target="_blank" href="${`http://archive.today/?run=1&url=${encodeURIComponent(b?.url)}`}">archive.today</a>,
              <a onclick=${handleNewWindowLink} target="_blank" href="${`https://web.archive.org/${encodeURIComponent(b?.url)}`}">web.archive.org</a>,
              <a onclick=${handleNewWindowLink} target="_blank" href="${`https://threadreaderapp.com/search?q=${encodeURIComponent(b?.url)}`}">threadreaderapp.com</a>
            </div>

            ${archiveURLs.length > 0
              ? html`${archiveURLs.map(
                  (url, i) => html`<input class='bc-bookmark-archive-url-edit' placeholder='https://archive.today/...' type="url" name="${`archive-url-${i}`}" value="${url}">`
                )
            }`
              : null
            }

            <div>
              <button onclick=${handleAddArchiveURL}>add</button>
              ${archiveURLs.length > 1 ? html`<button onclick=${handleUndoAddArchiveURL}>remove</button>` : null}
            </div>

        </details>

        <!-- Bookmark Options -->
        <div>
          <label>
            <input type="checkbox" name="toread" ?checked="${b?.toread}">
            to read
          </label>
          <label>
            <input type="checkbox" name="starred" ?checked="${b?.starred}">
            starred
          </label>
          <label>
            <input type="checkbox" name="sensitive" ?checked="${b?.sensitive}">
            sensitive
          </label>
        </div>

        ${b?.episodes?.length > 0
            ? html`
            <label class="block">
              episodes:
            </label>
            ${b.episodes.map(
                ep => html.for(ep, ep.id)`${episodeTitle({ episode: ep, small: true })}`
              )
          }`
            : null
          }

        <!-- Bookmark Create Episode -->
        <div>
          <label>
            <input type="checkbox" onchange="${handleCreateEpisodeCheckbox}" name="createEpisode">
            create episode
          </label>
          <span class="bc-help-text">
            ℹ️ Save an episode with this bookmark
          </span>
        </div>

        <div class="${cn({
          'bc-create-episode-details': true,
          'bc-create-episode-hidden': !createEpisodeChecked
        })}">
          <div id="bc-podcast-radio">
            <label>
              <input
                type="radio"
                name="episodeMedium"
                value="video"
                ?checked="${true}"
                onchange="${handleEpisodeMediumSelect}"
              >
              <span>video</span>
            </label>

            <label>
              <input
                type="radio"
                name="episodeMedium"
                value="audio"
                onchange=${handleEpisodeMediumSelect}
              >
              <span>audio</span>
            </label>
          <label>
            <input type="checkbox" name="custom-episode-url" onchange="${handleCustomEpisodeURLCheckboxChange}">
            custom url
          </label>
          <button onclick="${handlePreviewRefresh}">refresh preview</button>
          </div>

          <input class="${cn({
            'bc-bookmark-edit-create-episode-url': true,
            'bc-bookmark-edit-create-episode-url-hidden': !customEpisodeURLChecked
          })}" type="url" name="createEpisodeURL" value="${b?.url}">

          ${episodePreviewLoading ? html`<div class="bc-help-text">Episode preview loading...</div>` : null}
          ${episodePreview
            ? html`
            <span class="bc-help-text bc-episode-preview-title">
              <span>${episodePreview.src_type === 'video' ? '📼' : episodePreview.src_type === 'audio' ? '💿' : null}</span>
              <a onclick=${handleNewWindowLink} target="_blank" href="${episodePreview.url}">${`${episodePreview.title}.${episodePreview.ext}`}</a>
              <span>(${format(episodePreview.duration * 1000)})</span>
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
            ${onSave ? html`<input name="submit-button" type="submit">` : null}
            ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
          </div>
          <div>
            ${onDeleteBookmark
              ? deleteConfirm
                ? html`
                  <button onClick=${hanldeCancelDelete}>Cancel</button>
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
                ? html`<a onclick=${handleNewWindowLink} target="_blank" href="/docs/bookmarklets/">An updated bookmarklet is available</a>`
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
})

function validateURL (maybeURL) {
  try {
    const url = new URL(maybeURL) // eslint-disable-line no-unused-vars
    // TODO: block more bad URL stuff here
    return true
  } catch (err) {
    return false
  }
}
