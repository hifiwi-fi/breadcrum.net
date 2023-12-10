import { html } from 'uland-isomorphic'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execPromise = promisify(exec)

export default async () => {
  const ls = await npmList()
  return html`<div>
    <h2>Deps</h2>
    <pre><code>
      ${ls}
    </code></pre>
  </div>`
}

async function npmList () {
  try {
    const { stdout, stderr } = await execPromise('npm ls')

    if (stderr) {
      console.error(`Error: ${stderr}`)
      return stderr
    }

    console.log(stdout)
    return stdout
  } catch (error) {
    console.error(`Execution error: ${error}`)
    return error.message
  }
}
