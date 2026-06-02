/**
 * @param {string | null} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampInteger (value, fallback, min, max) {
  const number = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(number)) return fallback
  return Math.min(Math.max(number, min), max)
}

/**
 * @param {string | null} value
 * @returns {boolean}
 */
export function booleanParam (value) {
  return value === 'true' || value === '1' || value === 'on'
}
