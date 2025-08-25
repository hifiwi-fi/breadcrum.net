/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent, ComponentChild } from 'preact'
 * @import { TypeFeedRead } from '../../../routes/api/feeds/schemas/schema-feed-read.js'
 */

import { html } from 'htm/preact'
import { useState, useRef, useCallback } from 'preact/hooks'

/**
 * @typedef {object} FeedUpdateData
 * @property {string} title
 * @property {string} description
 * @property {boolean} explicit
 */

/**
 * @typedef {object} FeedEditProps
 * @property {TypeFeedRead} [feed]
 * @property {(formState: FeedUpdateData) => Promise<void>} [onSave]
 * @property {() => Promise<void>} [onDeleteFeed]
 * @property {() => void} [onCancelEdit]
 * @property {string | ComponentChild} [legend]
 */

/**
 * @type {FunctionComponent<FeedEditProps>}
 */
export const FeedEdit = ({
  feed: f,
  onSave,
  onDeleteFeed,
  onCancelEdit,
  legend,
}) => {
  const [error, setError] = useState(/** @type {Error | null} */(null))
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef(/** @type {HTMLFormElement | null} */(null))

  const handleInitiateDelete = useCallback(() => {
    setDeleteConfirm(true)
  }, [setDeleteConfirm])

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(false)
  }, [setDeleteConfirm])

  const handleDeleteFeed = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      if (onDeleteFeed) await onDeleteFeed()
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, onDeleteFeed])

  const handleSave = useCallback(async (/** @type {SubmitEvent} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = /** @type {HTMLFormElement | null} */ (/** @type {unknown} */ (formRef.current))
    if (!form) return

    // @ts-expect-error Shadowed form value
    const title = /** @type {string} */(form['title'].value)
    const description = /** @type {string} */(form['description'].value)
    const explicit = /** @type {boolean} */(form['explicit'].checked)

    const formState = {
      title,
      description,
      explicit,
    }

    try {
      if (onSave) await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, onSave])

  // Parent can delay passing a feed to disable the form.
  const initializing = f == null

  return html`
    <div class='bc-feed-edit'>
      <form ref="${formRef}" class="add-feed-form" id="add-feed-form" onsubmit=${handleSave}>
        <fieldset disabled=${disabled || initializing}>
          ${legend ? html`<legend class="bc-feed-legend">${legend}</legend>` : null}

          <div>
            <label class='block'>
              title:
              <input
                class='block bc-feed-title-edit'
                type="text"
                name="title"
                maxlength="255"
                minlength="1"
                value="${f?.title}"
              />
            </label>
          </div>

          <div>
            <label class="block">
              note:
              <textarea
                class="block bc-feed-description-edit"
                rows="6"
                name="description"
              >
                ${f?.description}
              </textarea>
            </label>
          </div>

          <div>
            <label>
              explicit:
              <input type="checkbox" name="explicit" checked="${f?.explicit}" />
            </label>
          </div>

          <div class="bc-feed-edit-submit-line">
            <div class="button-cluster">
              ${onSave ? html`<input name="submit-button" type="submit" />` : null}
              ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
            </div>
            <div>
              ${onDeleteFeed && !f?.default_feed
                ? deleteConfirm
                  ? html`
                    <button onClick=${handleCancelDelete}>Cancel</button>
                    <button onClick=${handleDeleteFeed}>Destroy</button>`
                  : html`<button onClick=${handleInitiateDelete}>Delete</button>`
                : null
              }
            </div>
          </div>
          ${error ? html`<div class="error-box">${error.message}</div>` : null}
        </fieldset>
      </form>
    </div>
  `
}
