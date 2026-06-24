/// <reference lib="dom" />

if (typeof window !== 'undefined') {
  const container = document.getElementById('bc-bookmarklet-copy')
  const bookmarkletLink = /** @type {HTMLAnchorElement | null} */ (document.querySelector('a.bc-bookmarklet'))
  const bookmarklet = bookmarkletLink?.href ?? ''

  if (container && bookmarklet) {
    const input = document.createElement('input')
    input.className = 'bc-bookmarklet-copy-select'
    input.type = 'text'
    input.readOnly = true
    input.value = bookmarklet
    input.addEventListener('click', () => input.select())

    const button = document.createElement('button')
    button.textContent = 'Copy'
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(bookmarklet)
        button.textContent = 'Copied'
      } catch (e) {
        console.error(e)
        button.textContent = 'Error'
      }
    })

    const help = document.createElement('span')
    help.className = 'bc-help-text'
    help.textContent = 'Or create a Bookmark and set the URL to the above script.'

    const line = document.createElement('div')
    line.className = 'bc-bookmarklet-copy-line'
    line.append(input, button)

    const wrapper = document.createElement('div')
    wrapper.append(line, help)

    container.append(wrapper)
  }
}
