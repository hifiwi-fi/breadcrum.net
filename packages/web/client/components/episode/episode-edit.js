/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { FunctionComponent, ComponentChild } from 'preact'
 * @import { TypeEpisodeReadClient } from '../../../routes/api/episodes/schemas/schema-episode-read.js'
 */

import { html } from 'htm/preact'
import { useState, useRef, useCallback } from 'preact/hooks'

/**
 * @typedef {object} EpisodeUpdateData
 * @property {string} title
 * @property {boolean} explicit
 */

/**
 * @typedef {object} EpisodeEditProps
 * @property {TypeEpisodeReadClient} [episode]
 * @property {(formState: EpisodeUpdateData) => Promise<void>} [onSave]
 * @property {() => Promise<void>} [onDeleteEpisode]
 * @property {() => void} [onCancelEdit]
 * @property {string | ComponentChild} [legend]
 */

/**
 * @type {FunctionComponent<EpisodeEditProps>}
 */
export const EpisodeEdit = ({
  episode: e,
  onSave,
  onDeleteEpisode,
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

  const handleDeleteEpisode = useCallback(async (/** @type {Event} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)
    try {
      if (onDeleteEpisode) await onDeleteEpisode()
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, onDeleteEpisode])

  const handleSave = useCallback(async (/** @type {SubmitEvent} */ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = formRef.current
    if (!form) return

    // @ts-expect-error title is a shadowed property
    const title = /** @type{string} */ (form['title'].value)
    const explicit = /** @type{boolean} */(form['explicit'].checked)

    const formState = {
      title,
      explicit,
    }

    try {
      if (onSave) await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(/** @type {Error} */(err))
    }
  }, [setDisabled, setError, formRef?.current, onSave])

  // Parent can delay passing an episode to disable the form.
  const initializing = e == null

  return html`
    <div class='bc-episode-edit'>
      <form ref="${formRef}" class="add-episode-form" id="add-episode-form" onsubmit=${handleSave}>
        <fieldset ?disabled=${disabled || initializing}>
          ${legend ? html`<legend class="bc-episode-legend">${legend}</legend>` : null}
          <div>
            <label class='block'>
              url:
              <input disabled class='block bc-episode-url-edit' type="url" name="url" value="${e?.url}"/>
            </label>
          </div>
          <div>
            <label class="block">
              title:
              <input class="block" type="text" name="title" value="${e?.title}">
            </label>
          </div>
          <div>
            <label>
              explicit:
              <input type="checkbox" name="explicit" ?checked="${e?.explicit}">
            </label>
          </div>

          <div class="bc-episode-edit-submit-line">
            <div class="button-cluster">
              ${onSave ? html`<input name="submit-button" type="submit">` : null}
              ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
            </div>
            <div>
              ${onDeleteEpisode
                ? deleteConfirm
                  ? html`
                    <button onClick=${handleCancelDelete}>Cancel</button>
                    <button onClick=${handleDeleteEpisode}>Destroy</button>`
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
