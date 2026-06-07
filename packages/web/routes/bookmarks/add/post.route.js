/**
 * @import { FastifyRequest } from 'fastify'
 * @import { RouteContext } from '@domstack/fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { TypeBookmarkCreate } from '../../api/bookmarks/schemas/schema-bookmark-create.js'
 * @import { BookmarkAddFormState } from './page.route.js'
 */

import { formError, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { createBookmarkFromInput } from '../../api/bookmarks/bookmark-create-action.js'
import { checkboxField, stringField, tagsFromString } from '../form-fields.js'

/**
 * @param {RouteContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Add Bookmark',
  })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const form = bookmarkAddForm(request.body)
  const errors = validateBookmarkAddForm(form)

  if (errors.length === 0) {
    const result = await createBookmarkFromInput(fastify, {
      userId: context.user.id,
      input: bookmarkCreateInput(form),
      options: {
        update: false,
        meta: form.meta,
        episode: form.episode,
        archive: form.archive,
        normalize: form.normalize,
        exactUrl: false,
      },
    })

    if (result.ok) {
      return redirectForRequest(request, reply, `/bookmarks/view/?id=${result.bookmark.id}`)
    }

    errors.push(formError(result.message))
  }

  return ctx.renderPage({
    state: {
      bookmarkAdd: {
        ...form,
        errors,
      },
    },
  })
}

/**
 * @param {unknown} body
 * @returns {BookmarkAddFormState}
 */
function bookmarkAddForm (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return {
    url: stringField(fields['url']).trim(),
    title: stringField(fields['title']).trim(),
    note: stringField(fields['note']),
    summary: stringField(fields['summary']),
    tags: stringField(fields['tags']),
    archiveUrl: stringField(fields['archiveUrl']).trim(),
    toread: checkboxField(fields['toread']),
    sensitive: checkboxField(fields['sensitive']),
    meta: checkboxField(fields['meta']),
    episode: checkboxField(fields['episode']),
    archive: checkboxField(fields['archive']),
    normalize: checkboxField(fields['normalize']),
    errors: [],
  }
}

/**
 * @param {BookmarkAddFormState} form
 * @returns {FormError[]}
 */
function validateBookmarkAddForm (form) {
  /** @type {FormError[]} */
  const errors = []

  if (!form.url) {
    errors.push(formError('URL is required.', 'url'))
  } else if (!URL.canParse(form.url)) {
    errors.push(formError('Enter a valid URL.', 'url'))
  }

  if (form.title.length > 255) {
    errors.push(formError('Title must be 255 characters or fewer.', 'title'))
  }

  if (form.archiveUrl && !URL.canParse(form.archiveUrl)) {
    errors.push(formError('Enter a valid archive URL.', 'archiveUrl'))
  }

  for (const tag of tagsFromString(form.tags)) {
    if (tag.length > 255) {
      errors.push(formError('Tags must be 255 characters or fewer.', 'tags'))
      break
    }
  }

  return errors
}

/**
 * @param {BookmarkAddFormState} form
 * @returns {TypeBookmarkCreate}
 */
function bookmarkCreateInput (form) {
  return {
    url: new URL(form.url).toString(),
    ...(form.title ? { title: form.title } : {}),
    ...(form.note ? { note: form.note } : {}),
    ...(form.summary ? { summary: form.summary } : {}),
    ...(form.archiveUrl ? { archive_urls: [new URL(form.archiveUrl).toString()] } : {}),
    tags: tagsFromString(form.tags),
    toread: form.toread,
    sensitive: form.sensitive,
  }
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/bookmarks/add/'))
  return `/login/?redirect=${redirect}`
}
