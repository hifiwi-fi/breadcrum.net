import { Component, html, useState, useRef, useCallback } from 'uland-isomorphic'

export const passwordEdit = Component(({ onSave, onCancelEdit }) => {
  const [error, setError] = useState(null)
  const [disabled, setDisabled] = useState(false)
  const formRef = useRef()

  const handleSave = useCallback(async (ev) => {
    ev.preventDefault()
    setDisabled(true)
    setError(null)

    const form = formRef.current

    const password = form.password.value
    const confirmPassword = form.confirmPassword.value

    if (password !== confirmPassword) {
      setError(new Error('Passwords do not match'))
      setDisabled(false)
      return
    }

    const formState = {
      password
    }

    try {
      await onSave(formState)
    } catch (err) {
      setDisabled(false)
      setError(err)
    }
  }, [setDisabled, setError, formRef?.current, onSave])

  return html`
    <div class='bc-account-password-edit'>
      <form ref="${formRef}" class="bc-account-password-edit-form" id="bc-account-password-edit-form" onsubmit=${handleSave}>
      <fieldset ?disabled=${disabled}>
        <legend class="bc-account-password-edit-legend">Edit password</legend>
        <div>
          <label class='block'>
            password:
            <input class="block" type="password" minlength="8" maxlength="50" name="password">
          </label>
          <label class='block'>
            confirm password:
            <input class="block" type="password" minlength="8" maxlength="50" name="confirmPassword">
          </label>
        </div>
        <div class="bc-account-password-edit-submit-line">
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
