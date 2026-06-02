/**
 * @param {unknown} value
 * @returns {string}
 */
export function stringField (value) {
  return typeof value === 'string' ? value : ''
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function checkboxField (value) {
  return value === true || value === 'true' || value === 'on'
}

/**
 * @param {string} value
 * @returns {string[]}
 */
export function tagsFromString (value) {
  return Array.from(new Set(value.split(/\s+/).map(tag => tag.trim()).filter(Boolean)))
}

/**
 * @param {string} value
 * @returns {string[]}
 */
export function archiveUrlsFromString (value) {
  return Array.from(new Set(value.split(/\s+/).map(url => url.trim()).filter(Boolean)))
}
