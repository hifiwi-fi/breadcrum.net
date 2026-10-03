/**
 * One owner for process teardown, including signals received during startup.
 * @param {object} options
 * @param {() => Promise<void>} options.closeApp
 * @param {() => Promise<void>} options.shutdownTelemetry
 * @param {number} options.timeoutMs
 * @param {(error: Error) => void} options.onTimeout
 */
export function createShutdown ({ closeApp, shutdownTelemetry, timeoutMs, onTimeout }) {
  /** @type {Promise<void> | undefined} */
  let closing
  return function shutdown () {
    closing ??= (async () => {
      /** @type {ReturnType<typeof setTimeout> | undefined} */
      let timer
      const deadline = new Promise((_resolve, reject) => {
        timer = setTimeout(() => {
          const error = new Error(`Shutdown exceeded ${timeoutMs}ms; interrupted jobs may be retried`)
          onTimeout(error)
          reject(error)
        }, timeoutMs)
      })
      const cleanup = (async () => {
        try {
          await closeApp()
        } finally {
          await shutdownTelemetry()
        }
      })()
      try {
        await Promise.race([cleanup, deadline])
      } finally {
        clearTimeout(timer)
      }
    })()
    return closing
  }
}
