import { downloadFromGithub } from 'bc-dlp'
import cp from 'child_process'
import * as path from 'path'
import util from 'util'
import desm from 'desm'

const token = process?.env?.GITHUB_TOKEN

const exec = util.promisify(cp.exec)

const __dirname = desm(import.meta.url)

try {
  const { stdout } = await exec('which yt-dlp')
  console.log(`yt-dlp found: ${stdout.trim()}`)
} catch (err) {
  console.warn('yt-dlp not found, downloading it')
  const octokitOpts = token ? { auth: token } : null
  await downloadFromGithub({
    filepath: path.join(__dirname, 'yt-dlp'),
    octokitOpts
  })
  console.log(`yt-dlp downloaded: ${path.join(__dirname, '../yt-dlp')}`)
  process.exit(0)
}
