/**
 * @import { FastifyRequest } from 'fastify'
 * @import { RouteContext } from '@domstack/fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { TypeBookmarkUpdate } from '../../api/bookmarks/schemas/schema-bookmark-update.js'
 * @import { BookmarkEditFormState } from './page.route.js'
 */

import { formError, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { render } from 'fragtml'
import { createRouteViewContext } from '#views/context.js'
import { getBookmark } from '../../api/bookmarks/get-bookmarks-query.js'
import { updateBookmarkFromInput } from '../../api/bookmarks/bookmark-update-action.js'
import { archiveUrlsFromString, checkboxField, stringField, tagsFromString } from '../form-fields.js'
import { bookmarkView } from '../bookmark.view.js'
import { bookmarkEditForm } from './page.route.js'

/**
 * @param {RouteContext} ctx
 */
export default async function postRoute (ctx) {
  const { request, reply } = ctx
  const fastify = request.server

  const context = await createRouteViewContext(fastify, request, {
    title: 'Bookmark',
  })

  if (!context.user) {
    return redirectForRequest(request, reply, loginRedirectForRequest(request))
  }

  const form = bookmarkEditFormFromBody(request.body)
  const errors = validateBookmarkEditForm(form)

  if (errors.length === 0) {
    const result = await updateBookmarkFromInput(fastify, {
      userId: context.user.id,
      bookmarkId: form.id,
      input: bookmarkUpdateInput(form),
      options: {
        normalize: form.normalize,
        exactUrl: false,
      },
    })

    if (result.ok) {
      if (isHtmxRequest(request)) {
        const body = await render(bookmarkView(result.bookmark, {
          redirectPath: `/bookmarks/view/?id=${result.bookmark.id}`,
        }))
        return reply.send(body)
      }

      return redirectForRequest(request, reply, `/bookmarks/view/?id=${result.bookmark.id}`)
    }

    errors.push(formError(result.message))
    reply.status(result.statusCode)
  } else {
    reply.status(422)
  }

  const bookmark = (form.id
    ? await getBookmark({
      fastify,
      ownerId: context.user.id,
      bookmarkId: form.id,
      sensitive: true,
      perPage: 1,
    })
    : null) ?? null

  const editForm = {
    ...form,
    errors,
  }

  if (isHtmxRequest(request)) {
    const body = await render(bookmarkEditForm(editForm))
    return reply.send(body)
  }

  return ctx.renderPage({
    statusCode: reply.statusCode,
    data: {
      context: {
        ...context,
        title: bookmark?.title ?? 'Bookmark',
      },
      bookmarkViewPage: {
        bookmark,
        error: bookmark ? null : 'Bookmark not found.',
        edit: true,
        editForm,
      },
    },
  })
}

/**
 * @param {FastifyRequest} request
 * @returns {string}
 */
function loginRedirectForRequest (request) {
  const redirect = encodeURIComponent(safeRedirectPath(request.url, '/bookmarks/view/'))
  return `/login/?redirect=${redirect}`
}

/**
 * @param {unknown} body
 * @returns {BookmarkEditFormState}
 */
function bookmarkEditFormFromBody (body) {
  const fields = body && typeof body === 'object'
    ? /** @type {Record<string, unknown>} */ (body)
    : {}

  return {
    id: stringField(fields['id']),
    url: stringField(fields['url']).trim(),
    title: stringField(fields['title']).trim(),
    note: stringField(fields['note']),
    summary: stringField(fields['summary']),
    tags: stringField(fields['tags']),
    archiveUrls: stringField(fields['archiveUrls']),
    toread: checkboxField(fields['toread']),
    starred: checkboxField(fields['starred']),
    sensitive: checkboxField(fields['sensitive']),
    normalize: checkboxField(fields['normalize']),
    errors: [],
  }
}

/**
 * @param {BookmarkEditFormState} form
 * @returns {FormError[]}
 */
function validateBookmarkEditForm (form) {
  /** @type {FormError[]} */
  const errors = []

  if (!form.id) {
    errors.push(formError('Missing bookmark id.', 'id'))
  }

  if (!form.url) {
    errors.push(formError('URL is required.', 'url'))
  } else if (!URL.canParse(form.url)) {
    errors.push(formError('Enter a valid URL.', 'url'))
  }

  if (!form.title) {
    errors.push(formError('Title is required.', 'title'))
  } else if (form.title.length > 255) {
    errors.push(formError('Title must be 255 characters or fewer.', 'title'))
  }

  for (const url of archiveUrlsFromString(form.archiveUrls)) {
    if (!URL.canParse(url)) {
      errors.push(formError('Enter valid archive URLs.', 'archiveUrls'))
      break
    }
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
 * @param {BookmarkEditFormState} form
 * @returns {TypeBookmarkUpdate}
 */
function bookmarkUpdateInput (form) {
  return {
    url: new URL(form.url).toString(),
    title: form.title,
    note: form.note,
    summary: form.summary,
    tags: tagsFromString(form.tags),
    archive_urls: archiveUrlsFromString(form.archiveUrls).map(url => new URL(url).toString()),
    toread: form.toread,
    starred: form.starred,
    sensitive: form.sensitive,
  }
}
