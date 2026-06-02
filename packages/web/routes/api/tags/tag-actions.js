import SQL from '@nearform/sql'

/**
 * @import { FastifyInstance } from 'fastify'
 */

/**
 * @typedef {object} TagSummary
 * @property {string} name
 * @property {number} count
 */

/**
 * @typedef {{ ok: true }} TagMutationSuccess
 */

/**
 * @typedef {{ ok: false, statusCode: 404 | 409 | 422, message: string }} TagMutationFailure
 */

/**
 * @typedef {TagMutationSuccess | TagMutationFailure} TagMutationResult
 */

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {boolean} params.sensitive
 * @returns {Promise<TagSummary[]>}
 */
export async function listTags (fastify, { userId, sensitive }) {
  const query = SQL`
    select tags.name, tags.created_at, count(bookmarks_tags.tag_id)::int as count
    from tags
    left outer join bookmarks_tags on (tags.id = bookmarks_tags.tag_id)
    left outer join bookmarks on (bookmarks_tags.bookmark_id = bookmarks.id)
    where tags.owner_id = ${userId}
    ${!sensitive ? SQL`AND sensitive = false` : SQL``}
    group by (tags.name, tags.created_at)
    order by tags.created_at desc;
  `

  const results = await fastify.pg.query(query)
  return /** @type {TagSummary[]} */ (results.rows)
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.name
 * @returns {Promise<TagMutationResult>}
 */
export async function deleteTagByName (fastify, { userId, name }) {
  const tagName = normalizeTagName(name)
  if (!tagName) return tagMutationFailure(422, 'Tag name is required')

  const query = SQL`
    delete from tags
    where name = ${tagName}
      and owner_id = ${userId}
    returning id;
  `

  const results = await fastify.pg.query(query)
  if (results.rows.length === 0) {
    return tagMutationFailure(404, `Tag ${tagName} not found`)
  }

  return tagMutationSuccess()
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.oldName
 * @param {string} params.newName
 * @returns {Promise<TagMutationResult>}
 */
export async function renameTag (fastify, { userId, oldName, newName }) {
  const oldTag = normalizeTagName(oldName)
  const newTag = normalizeTagName(newName)

  if (!oldTag || !newTag) return tagMutationFailure(422, 'Old and new tag names are required')
  if (oldTag.length > 255 || newTag.length > 255) return tagMutationFailure(422, 'Tag names must be 255 characters or fewer')
  if (oldTag.toLowerCase() === newTag.toLowerCase()) return tagMutationSuccess()

  return fastify.pg.transact(async client => {
    const existingQuery = SQL`
      select name
      from tags
      where owner_id = ${userId}
        and name in (${oldTag}, ${newTag});
    `
    const existing = await client.query(existingQuery)
    const names = new Set(existing.rows.map(row => String(row.name).toLowerCase()))

    if (!names.has(oldTag.toLowerCase())) {
      return tagMutationFailure(404, `Tag ${oldTag} not found`)
    }

    if (names.has(newTag.toLowerCase())) {
      return tagMutationFailure(409, `Tag ${newTag} already exists`)
    }

    const updateQuery = SQL`
      update tags
      set name = ${newTag}
      where owner_id = ${userId}
        and name = ${oldTag};
    `

    await client.query(updateQuery)
    return tagMutationSuccess()
  })
}

/**
 * @param {FastifyInstance} fastify
 * @param {object} params
 * @param {string} params.userId
 * @param {string[]} params.sourceNames
 * @param {string} params.targetName
 * @returns {Promise<TagMutationResult>}
 */
export async function mergeTags (fastify, { userId, sourceNames, targetName }) {
  const targetTag = normalizeTagName(targetName)
  const sourceTags = Array.from(new Set(sourceNames.map(normalizeTagName).filter(Boolean)))
    .filter(name => name.toLowerCase() !== targetTag.toLowerCase())

  if (!targetTag) return tagMutationFailure(422, 'Target tag is required')
  if (targetTag.length > 255 || sourceTags.some(name => name.length > 255)) {
    return tagMutationFailure(422, 'Tag names must be 255 characters or fewer')
  }
  if (sourceTags.length === 0) return tagMutationFailure(422, 'At least one source tag is required')

  return fastify.pg.transact(async client => {
    const targetQuery = SQL`
      insert into tags (name, owner_id)
      values (${targetTag}, ${userId})
      on conflict (name, owner_id)
      do update set name = excluded.name
      returning id;
    `
    const targetResults = await client.query(targetQuery)
    const targetId = targetResults.rows[0]?.id
    if (!targetId) return tagMutationFailure(422, `Tag ${targetTag} could not be created`)

    const sourceQuery = SQL`
      select id, name
      from tags
      where owner_id = ${userId}
        and name in (${SQL.glue(sourceTags.map(name => SQL`${name}`), ', ')});
    `
    const sourceResults = await client.query(sourceQuery)
    if (sourceResults.rows.length === 0) {
      return tagMutationFailure(404, 'Source tags not found')
    }

    const sourceIds = sourceResults.rows.map(row => row.id)
    const applyTargetQuery = SQL`
      insert into bookmarks_tags (bookmark_id, tag_id)
      select bookmark_id, ${targetId}
      from bookmarks_tags
      where tag_id in (${SQL.glue(sourceIds.map(id => SQL`${id}`), ', ')})
      on conflict (bookmark_id, tag_id)
      do nothing;
    `
    await client.query(applyTargetQuery)

    const deleteSourcesQuery = SQL`
      delete from tags
      where owner_id = ${userId}
        and id in (${SQL.glue(sourceIds.map(id => SQL`${id}`), ', ')});
    `
    await client.query(deleteSourcesQuery)

    return tagMutationSuccess()
  })
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeTagName (value) {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * @returns {TagMutationSuccess}
 */
function tagMutationSuccess () {
  return {
    ok: true,
  }
}

/**
 * @param {404 | 409 | 422} statusCode
 * @param {string} message
 * @returns {TagMutationFailure}
 */
function tagMutationFailure (statusCode, message) {
  return {
    ok: false,
    statusCode,
    message,
  }
}
