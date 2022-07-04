import * as YTDlpWrapExports from 'yt-dlp-wrap'
import cp from 'child_process'
import util from 'util'
const exec = util.promisify(cp.exec)

const YTDlpWrap = YTDlpWrapExports.default.default

const results = await YTDlpWrap.downloadFromGithub()
console.log(results)

process.exit()

const ytDlpWrap = new YTDlpWrap(binPath)

const metadata = await ytDlpWrap.getVideoInfo(
  [
    'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    '-f',
    'best[ext=mp4]'
  ]
)

console.log(JSON.stringify(metadata, null, ' '))
