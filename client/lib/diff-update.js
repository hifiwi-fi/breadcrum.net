/**
 * @template T
 * @param {T} oldObject - The original object
 * @param {Partial<T>} newObject - The updated object data
 * @param {Partial<Record<keyof T, (oldVal: any, newVal: any) => boolean>>} [customEqualityChecks] - Optional custom equality functions for specific keys
 * @returns {Partial<T>} Object containing only changed properties
 */
export function diffUpdate (oldObject, newObject, customEqualityChecks = {}) {
  /** @type {Partial<T>} */
  const diff = {}

  for (const [key, newValue] of Object.entries(newObject)) {
    const typedKey = /** @type {keyof T} */ (key)
    const oldValue = oldObject[typedKey]

    // Check if there's a custom equality function for this key
    const customEqualityFn = customEqualityChecks[typedKey]

    let isEqual
    if (customEqualityFn) {
      isEqual = customEqualityFn(oldValue, newValue)
    } else {
      isEqual = oldValue === newValue
    }

    if (!isEqual) {
      diff[typedKey] = newValue
    }
  }

  return diff
}

/**
 * Helper function for array equality using Set comparison
 * @param {any[]} oldArray
 * @param {any[]} newArray
 * @returns {boolean}
 */
export function arraySetEqual (oldArray, newArray) {
  if (!Array.isArray(oldArray) || !Array.isArray(newArray)) {
    return oldArray === newArray
  }

  const oldSet = new Set(oldArray)
  const newSet = new Set(newArray)

  if (oldSet.size !== newSet.size) {
    return false
  }

  return Array.from(oldSet).every(element => newSet.has(element))
}
