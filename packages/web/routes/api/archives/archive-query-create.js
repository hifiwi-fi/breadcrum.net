import SQL from '@nearform/sql'

/**
 * Creates an archive entry in the database for a given bookmark.
 *
 * @param {Object} params - The parameters for creating an archive.
 * @param {import('@fastify/postgres').PostgresDb} params.client - The database client for executing queries, an instance of a pg connection from `fastify.pg` or `node-pg`.
 * @param {string} params.userId - The ID of the user who owns the bookmark.
 * @param {string} params.bookmarkId - The ID of the bookmark being archived.
 * @param {string} params.bookmarkTitle - The title of the bookmark.
 * @param {string} params.extractionMethod - The method used for archiving the bookmark.
 * @param {string} params.url - The URL of the bookmark.
 * @returns {Promise<Object>} A promise that resolves to the newly created archive object, including its ID, URL, and title.
 */
export async function createArchive ({
  client,
  userId,
  bookmarkId,
  bookmarkTitle,
  extractionMethod,
  url,
}) {
  const createArchiveQuery = SQL`
          INSERT INTO archives (owner_id, bookmark_id, url, title, extraction_method)
          VALUES (${userId}, ${bookmarkId}, ${url}, ${bookmarkTitle}, ${extractionMethod})
          returning id, url, title;
          `

  const archiveResults = await client.query(createArchiveQuery)
  const archive = archiveResults.rows[0]
  return archive
}
