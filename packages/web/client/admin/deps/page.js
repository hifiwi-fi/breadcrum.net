/** @import { AsyncPageFunction } from '@domstack/static' */
/** @import { RootLayoutVars, PageReturn } from '../../layouts/root/root.layout.js' */
import { html } from 'htm/preact'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execPromise = promisify(exec)

/** @type {AsyncPageFunction<RootLayoutVars, PageReturn>} */
export default async () => {
  const ls = await npmList()
  return html`<div>
    <h2>Deps</h2>
    <pre><code>
      ${ls}
    </code></pre>
  </div>`
}

/**
 * @returns {Promise<string>}
 */
async function npmList () {
  try {
    const { stdout, stderr } = await execPromise('npm ls')

    if (stderr) {
      console.error(`Error: ${stderr}`)
      return stderr
    }
    return stdout
  } catch (error) {
    console.error(`Execution error: ${error}`)
    return /** @type {Error} */(error).message
  }
}
