/**
 * @import { FastifyPluginAsync, FastifyRequest } from 'fastify'
 * @import { FormError } from '#lib/htmx.js'
 * @import { TypeBookmarkCreate } from '../../api/bookmarks/schemas/schema-bookmark-create.js'
 * @import { BookmarkAddFormState } from './view.js'
 */

import { formError, fragmentIdFromTarget, isHtmxRequest, redirectForRequest, safeRedirectPath } from '#lib/htmx.js'
import { createRouteViewContext } from '#views/context.js'
import { createBookmarkFromInput } from '../../api/bookmarks/bookmark-create-action.js'
import { checkboxField, stringField, tagsFromString } from '../form-fields.js'
import { bookmarkAddPage } from './view.js'

const bookmarkAddTargetFragments = /** @type {const} */ ({
  'bc-main': 'main',
})

/**
 * @type {FastifyPluginAsync}
 */
export default async function bookmarkAddRoutes (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['html'],
      response: {
        200: {
          type: 'string',
          contentMediaType: 'text/html',
        },
      },
    },
  }, async function getBookmarkAddHandler (request, reply) {
    const context = await createRouteViewContext(fastify, request, {
      title: 'Add Bookmark',
    })

    if (!context.user) {
      return redirectForRequest(request, reply, loginRedirectForRequest(request))
    }

    const body = await reply.render(bookmarkAddPage, {
      ...context,
      bookmarkAdd: bookmarkAddQuery(request),
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
      },
    },
  }, async function postBookmarkAddHandler (request, reply) {
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

    const body = await reply.render(bookmarkAddPage, {
      ...context,
      bookmarkAdd: {
        ...form,
        errors,
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
    ? fragmentIdFromTarget(request, bookmarkAddTargetFragments, 'main')
    : null

  return fragmentId ? { fragmentId } : undefined
}

/**
 * @param {FastifyRequest} request
 * @returns {BookmarkAddFormState}
 */
function bookmarkAddQuery (request) {
  const url = new URL(request.url, 'https://breadcrum.invalid')
  const summaryValue = url.searchParams.get('summary') ?? ''
  const pwaTextAsUrl = Boolean(!url.searchParams.get('url') && summaryValue && URL.canParse(summaryValue))
  const workingUrl = pwaTextAsUrl ? summaryValue : url.searchParams.get('url') ?? ''
  const workingSummary = pwaTextAsUrl ? '' : summaryValue
  const meta = url.searchParams.get('meta')

  return {
    url: workingUrl,
    title: url.searchParams.get('title') ?? '',
    note: url.searchParams.get('note') ?? '',
    summary: workingSummary,
    tags: url.searchParams.getAll('tags').filter(Boolean).join(' '),
    archiveUrl: '',
    toread: false,
    sensitive: false,
    meta: meta === null ? true : meta !== 'false',
    episode: true,
    archive: true,
    normalize: true,
    errors: [],
  }
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
