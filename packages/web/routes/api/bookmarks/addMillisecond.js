/**
 * Add 1ms to any date object
 * @param {Date | string | undefined | null} dateObj
 * @returns Date | null
 */
export function addMillisecond (dateObj) {
  if (!dateObj) return null
  if (typeof dateObj === 'string') dateObj = new Date(dateObj)
  return new Date(dateObj.getTime() + 1)
}
