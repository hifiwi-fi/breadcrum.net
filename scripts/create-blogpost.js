import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { BLOGPOST_DIR } from './BLOGPOST_DIR.js'

const __filename = fileURLToPath(import.meta.url)
export const __dirname = path.dirname(__filename)

const args = parseArgs({
  options: {
    title: {
      type: 'string',
      short: 't'
    }
  }
})

const title = args.values.title
if (!title) {
  console.error('Please provide a title for the blog post.')
  process.exit(1)
}

const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
const currentYear = new Date().getFullYear()
const blogPostDir = path.join(BLOGPOST_DIR, `${currentYear.toString()}/${slug}`)
const readmePath = path.join(blogPostDir, 'README.draft.md')
const imgDir = path.join(blogPostDir, 'img')

await fs.mkdir(blogPostDir, { recursive: true })
await fs.mkdir(imgDir, { recursive: true })

const frontmatter = `---
layout: article
title: "${title}"
serif: false
publishDate: "${new Date().toISOString()}"
handlebars: false
---

Content goes here.
`

await fs.writeFile(readmePath, frontmatter, 'utf8')

console.log(`Blog post created at ${readmePath}`)
