import { Component, html, useState, useRef, useCallback } from 'uland-isomorphic'

export const usernameEdit = Component(({ user, onSave, onCancelEdit }) => {
  const [error, setError] = useState(null)
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef()

  const handleSave = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = formRef.current

    const username = form.username.value

    const formState = {
      username
    }

    try {
      await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, formRef?.current, onSave])

  return html`
    <div class='bc-account-username-edit'>
      <form ref="${formRef}" class="bc-account-username-edit-form" id="bc-account-username-edit-form" onsubmit=${handleSave}>
      <fieldset ?disabled=${disabled}>
        <legend class="bc-account-username-edit-legend">Edit username</legend>
        <div>
          <label class='block'>
            username:
            <input class='block' type="text" name="username" value="${user.username}"/>
          </label>
        </div>
        <div class="bc-account-username-edit-submit-line">
          <div class="button-cluster">
            ${onSave ? html`<input name="submit-button" type="submit">` : null}
            ${onCancelEdit ? html`<button onClick=${onCancelEdit}>Cancel</button>` : null}
          </div>
        </div>
        ${error ? html`<div class="error-box">${error.message}</div>` : null}
      </fieldset>
    </form>
    </div>
  `
})
