import SQL from '@nearform/sql'

/** @typedef {{ title?: string | null | undefined, note?: string | null | undefined, summary?: string | null | undefined, starred?: boolean | undefined, toread?: boolean | undefined, sensitive?: boolean | undefined }} BookmarkScalars */

/** @param {BookmarkScalars} values */
export function bookmarkScalarAssignments (values) {
  const assignments = []
  if (values.title !== undefined) assignments.push(SQL`title = ${values.title}`)
  if (values.note !== undefined) assignments.push(SQL`note = ${values.note}`)
  if (values.summary !== undefined) assignments.push(SQL`summary = ${values.summary}`)
  if (values.starred !== undefined) assignments.push(SQL`starred = ${values.starred}`)
  if (values.toread !== undefined) assignments.push(SQL`toread = ${values.toread}`)
  if (values.sensitive !== undefined) assignments.push(SQL`sensitive = ${values.sensitive}`)
  return assignments
}
