/* eslint-env browser */

/**
 * Performs a client-side navigation with view transitions if supported
 * @param {Function} updateFn - The function that updates the DOM/state
 * @returns {Promise<void>}
 */
export async function navigateWithTransition(updateFn) {
  // Check if View Transitions API is supported
  if (document.startViewTransition) {
    // Start a view transition
    await document.startViewTransition(async () => {
      await updateFn()
    }).finished
  } else {
    // Fallback for browsers that don't support View Transitions
    await updateFn()
  }
}

/**
 * Creates a navigation handler with view transitions
 * @param {Function} pushState - The pushState function from useQuery
 * @param {Window} window - The window object
 * @returns {Function} Event handler for navigation
 */
export function createPageNavHandler(pushState, window) {
  return async (ev) => {
    ev.preventDefault()
    
    await navigateWithTransition(async () => {
      pushState(ev.currentTarget.href)
      window.scrollTo({ top: 0 })
    })
  }
}