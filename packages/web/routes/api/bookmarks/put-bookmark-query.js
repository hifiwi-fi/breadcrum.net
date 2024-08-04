// @ts-nocheck
import SQL from '@nearform/sql'
import { putTagsQuery } from '@breadcrum/resources/tags/put-tags-query.js'

/**
 * @import { FastifyInstance } from 'fastify'
 * @import { PoolClient } from 'pg'
 * @import { TypeBookmarkRead } from './schemas/schema-bookmark-read.js'
 */

/**
 * @typedef {Pick<TypeBookmarkRead, 'id' | 'url' | 'title' >} CreatedBookmark
 */

/**
 * Create a bookmark and apply tags to it. Returns a simple bookmark object.
 *
 * @function createBookmark
 * @exports
 * @param {Object} params - Parameters to shape the query.
 * @param {FastifyInstance} params.fastify - Fastify instance, used for logging and other utilities.
 * @param {PoolClient} params.pg - PostgreSQL connection or transaction client for executing the query.
 * @param {string} params.url - URL of the bookmark to be created.
 * @param {string} [params.title] - Title of the bookmark, defaults to the URL if not provided.
 * @param {string} [params.note] - Optional note associated with the bookmark.
 * @param {boolean} [params.toread=false] - Flag indicating if the bookmark is marked to read later.
 * @param {boolean} [params.sensitive=false] - Flag indicating if the bookmark is marked as sensitive.
 * @param {Array<string>} [params.archiveUrls=[]] - List of archived URLs, defaults to an empty array.
 * @param {string} [params.summary] - Optional summary of the bookmark.
 * @param {string} params.userId - UUID of the user creating the bookmark (must be provided).
 * @param {boolean} [params.meta=false] - Metadata flag for the bookmark, defaults to false.
 * @param {Array<string>} [params.tags] - List of tags to associate with the bookmark.
 * @throws {Error} Throws an error if userId is not provided.
 * @returns {Promise<CreatedBookmark>} The created bookmark object.
 */
export async function createBookmark ({
  fastify,
  pg,
  url,
  title,
  note,
  toread,
  sensitive,
  archiveUrls,
  summary,
  userId,
  meta,
  tags
}) {
  const createBookmarkQuery = SQL`
    insert into bookmarks (
      url,
      title,
      note,
      toread,
      sensitive,
      archive_urls,
      summary,
      owner_id,
      done
    )
    select
      ${url} as url,
      ${title ?? url ?? null} as title,
      ${note ?? null} as note,
      ${toread ?? false} as toread,
      ${sensitive ?? false} as sensitive,
      ${archiveUrls.length > 0 ? archiveUrls : SQL`'{}'`} as archive_urls,
      ${summary ?? null} as summary,
      ${userId} as owner_id,
      ${meta === false} as done
    returning
      id,
      url,
      title;
  `

  const results = await pg.query(createBookmarkQuery)
  /** @type {CreatedBookmark} */
  const bookmark = results.rows[0]

  if (tags?.length > 0) {
    await putTagsQuery({
      fastify,
      pg,
      userId,
      bookmarkId: bookmark.id,
      tags,
    })
  }

  return bookmark
}
