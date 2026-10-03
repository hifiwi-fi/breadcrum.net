import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Readability } from '@mozilla/readability'
import { createDocumentFromHtml } from './create-document-from-html.js'

/**
 * @import { TestContext } from 'node:test'
 */

/**
 * @param {TestContext} t
 * @param {string | null | undefined} html
 * @param {string | URL} [url]
 */
function createTestDocument (t, html, url = 'https://example.com/articles/page') {
  const document = createDocumentFromHtml({ html, url })
  t.after(() => document.defaultView?.close())
  return document
}

test('createDocumentFromHtml removes styles from the head and body without removing article metadata', (t) => {
  const document = createTestDocument(t, `
    <head>
      <title>Article title</title>
      <meta name="description" content="Article description">
      <STYLE media="screen">p { color: red }</STYLE>
    </head>
    <body>
      <article style="color: blue"><p>Article text</p></article>
      <style type="text/css">p { color: green }</style>
    </body>
  `)

  assert.equal(document.querySelectorAll('style').length, 0)
  assert.equal(document.title, 'Article title')
  assert.equal(document.querySelector('meta')?.getAttribute('content'), 'Article description')
  assert.equal(document.querySelector('article')?.textContent, 'Article text')
  assert.equal(document.querySelector('article')?.getAttribute('style'), 'color: blue')
})

for (const [name, html] of [
  ['nested style text', '<style>outer<style>inner</style><p>Article text</p></style>'],
  ['split style tag', '<sty<style>p { color: red }</style>le>p { color: blue }</style><p>Article text</p>'],
  ['whitespace in closing tag', '<style>p { color: red }</style ><p>Article text</p>'],
  ['quoted closing tag in attribute', '<style data-example="</style>">p { color: red }</style><p>Article text</p>'],
  ['unclosed style', '<p>Article text</p><style>p { color: red }'],
]) {
  test(`createDocumentFromHtml handles ${name} using HTML parsing`, (t) => {
    const document = createTestDocument(t, html)

    assert.equal(document.querySelectorAll('style').length, 0)
    assert.equal(document.querySelector('p')?.textContent, 'Article text')
  })
}

test('createDocumentFromHtml preserves literal style markup in text, attributes, and comments', (t) => {
  const literal = '<style>p { color: red }</style>'
  const document = createTestDocument(t, `
    <title>${literal}</title>
    <body>
      <pre>&lt;style&gt;p { color: red }&lt;/style&gt;</pre>
      <textarea>${literal}</textarea>
      <p data-example="${literal}">Article text</p>
      <script type="application/json">{"example":"${literal}"}</script>
      <div><!--${literal}--></div>
      <style>p { color: blue }</style>
    </body>
  `)

  assert.equal(document.querySelectorAll('style').length, 0)
  assert.equal(document.title, literal)
  assert.equal(document.querySelector('pre')?.textContent, literal)
  assert.equal(document.querySelector('textarea')?.value, literal)
  assert.equal(document.querySelector('p')?.getAttribute('data-example'), literal)
  assert.equal(document.querySelector('script')?.textContent, JSON.stringify({ example: literal }))
  assert.equal(document.querySelector('div')?.firstChild?.nodeValue, literal)
})

for (const html of ['', null, undefined]) {
  test(`createDocumentFromHtml creates an empty document for ${JSON.stringify(html)}`, (t) => {
    const document = createTestDocument(t, html)

    assert.equal(document.URL, 'https://example.com/articles/page')
    assert.equal(document.head.innerHTML, '')
    assert.equal(document.body.innerHTML, '')
  })
}

test('createDocumentFromHtml preserves string and URL inputs and relative URL resolution', (t) => {
  const url = 'https://example.com/articles/page?view=full#intro'
  for (const input of [url, new URL(url)]) {
    const document = createTestDocument(t, '<a href="next">Next</a>', input)

    assert.equal(document.URL, url)
    assert.equal(document.querySelector('a')?.href, 'https://example.com/articles/next')
  }

  const document = createTestDocument(t, '<base href="/assets/"><a href="next">Next</a>', url)
  assert.equal(document.querySelector('a')?.href, 'https://example.com/assets/next')
})

test('createDocumentFromHtml suppresses CSS parsing errors through the virtual console', (t) => {
  const error = t.mock.method(console, 'error', () => {})
  const document = createTestDocument(t, '<style>/* unterminated comment</style><p>Article text</p>')

  assert.equal(document.querySelectorAll('style').length, 0)
  assert.equal(document.querySelector('p')?.textContent, 'Article text')
  assert.equal(error.mock.callCount(), 0)
})

test('createDocumentFromHtml leaves scripts inert and does not load stylesheets', async (t) => {
  const document = createTestDocument(t, `
    <link rel="stylesheet" href="data:text/css,body%7Bcolor%3Ared%7D">
    <script>document.documentElement.setAttribute('data-inline-script', 'ran')</script>
    <script src="data:text/javascript,document.documentElement.setAttribute('data-external-script','ran')"></script>
    <p onclick="this.textContent = 'ran'">Article text</p>
  `)
  const window = document.defaultView
  assert.ok(window)
  await new Promise(resolve => window.addEventListener('load', resolve, { once: true }))

  assert.equal(document.documentElement.hasAttribute('data-inline-script'), false)
  assert.equal(document.documentElement.hasAttribute('data-external-script'), false)
  assert.equal(document.querySelectorAll('script').length, 2)
  assert.equal(document.querySelector('link')?.sheet, null)
  const paragraph = document.querySelector('p')
  assert.ok(paragraph)
  paragraph.click()
  assert.equal(paragraph.textContent, 'Article text')
  assert.equal(paragraph.getAttribute('onclick'), "this.textContent = 'ran'")
})

test('createDocumentFromHtml returns a document usable by Readability', (t) => {
  const text = 'This article describes how careful HTML parsing preserves useful content, relative links, and metadata. '
  const document = createTestDocument(t, `
    <head><title>Parsing an article</title><style>p { color: red }</style></head>
    <body><article>
      <h1>Parsing an article</h1>
      <p>${text.repeat(8)}</p>
      <p>${text.repeat(8)}<a href="related">Related article</a></p>
    </article></body>
  `)
  const article = new Readability(document).parse()

  assert.ok(article)
  assert.equal(article.title, 'Parsing an article')
  assert.ok(article.textContent?.includes(text))
  assert.ok(article.content?.includes('href="https://example.com/articles/related"'))
})
