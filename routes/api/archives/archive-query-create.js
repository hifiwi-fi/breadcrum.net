/* eslint-disable camelcase */
import SQL from '@nearform/sql'

export async function createArchive ({
  client,
  userID,
  bookmarkId,
  bookmarkTitle,
  url
}) {
  const createArchiveQuery = SQL`
          INSERT INTO archives (owner_id, bookmark_id, url, title)
          VALUES (${userID}, ${bookmarkId}, ${url}, ${bookmarkTitle})
          returning id, url, title;
          `

  const archiveResults = await client.query(createArchiveQuery)
  const archive = archiveResults.rows[0]
  return archive
}
