/* eslint-disable camelcase */
import SQL from '@nearform/sql'

export async function createArchive ({
  client,
  userId,
  bookmarkId,
  bookmarkTitle,
  extractionMethod,
  url
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
