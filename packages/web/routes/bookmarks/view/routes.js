/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { TypeBookmarkRead } from '../../api/bookmarks/schemas/schema-bookmark-read.js'
 * @import { TypeBookmarkUpdate } from '../../api/bookmarks/schemas/schema-bookmark-update.js'
 * @import { BookmarkEditFormState } from './view.js'
 */

import { formError, fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { render } from 'fragtml'
import { createRouteViewContext } from '#views/context.js'
import { getBookmark } from '../../api/bookmarks/get-bookmarks-query.js'
import { updateBookmarkFromInput } from '../../api/bookmarks/bookmark-update-action.js'
import { archiveUrlsFromString, checkboxField, stringField, tagsFromString } from '../form-fields.js'
import { bookmarkView } from '../list.view.js'
import { bookmarkEditForm, bookmarkViewPage } from './view.js'

const bookmarkViewTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function bookmarkViewRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        404: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function getBookmarkViewHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Bookmark',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, loginRedirectForRequest(request))
    }

    const url = new URL(request.url, 'https://breadcrum.invalid')
    const id = url.searchParams.get('id')
    if (!id) {
      return redirectForRequest(request, reply, '/bookmarks/')
    }

    const edit = url.searchParams.get('edit') === 'true'
    const bookmark = await getBookmark({
      fastify,
      ownerId: context.user.id,
      bookmarkId: id,
      sensitive: edit || url.searchParams.get('sensitive') === 'true',
      perPage: 1,
    })

    if (!bookmark) {
      reply.status(404)
    }

    if (bookmark && isHtmxRequest(request) && url.searchParams.get('fragment') === 'bookmark') {
      const redirectPath = safeRedirectPath(
        url.searchParams.get('redirect'),
        `/bookmarks/view/?id=${bookmark.id}`
      )
      const body = await render(bookmarkView(bookmark, { redirectPath }))
      return reply.send(body)
    }

    const body = await reply.render(bookmarkViewPage, {
      ...context,
      title: bookmark?.title ?? 'Bookmark',
      bookmarkViewPage: {
        bookmark: bookmark ?? null,
        error: bookmark ? null : 'Bookmark not found.',
        edit,
        editForm: bookmark ? bookmarkEditFormFromBookmark(bookmark) : null,
      },
    }, renderOptions(request))

    return reply.send(body)
  })

  fastify.post('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        400: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        404: {
          type: 'string',
          contentMediaType: 'text/html',
        },
        422: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function postBookmarkViewHandler (request, reply) {
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

    const body = await reply.render(bookmarkViewPage, {
      ...context,
      title: bookmark?.title ?? 'Bookmark',
      bookmarkViewPage: {
        bookmark,
        error: bookmark ? null : 'Bookmark not found.',
        edit: true,
        editForm,
      },
    }, renderOptions(request))

    return reply.send(body)
  })
}

/**
 * @param {FastifyRequest} request
 * @returns {{ fragmentId: 'main' } | undefined}
 */
function renderOptions (request) {
  const fragmentId = isHtmxRequest(request)
    ? fragmentIdFromTarget(request, bookmarkViewTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
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
 * @param {TypeBookmarkRead} bookmark
 * @returns {BookmarkEditFormState}
 */
function bookmarkEditFormFromBookmark (bookmark) {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title || bookmark.url,
    note: bookmark.note ?? '',
    summary: bookmark.summary ?? '',
    tags: bookmark.tags.join(' '),
    archiveUrls: bookmark.archive_urls.join('\n'),
    toread: Boolean(bookmark.toread),
    starred: Boolean(bookmark.starred),
    sensitive: Boolean(bookmark.sensitive),
    normalize: true,
    errors: [],
  }
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
