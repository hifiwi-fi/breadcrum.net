import { deleteTag } from './delete-tag.js'

export default async function getBookmarksRoute (fastify, opts) {
  await Promise.all([
    deleteTag(fastify, opts),
  ])
}
