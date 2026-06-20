/// <reference lib="webworker" />

import { serviceWorker } from './context.ts'

/**
 * Broadcast a lifecycle or cache update message to every window client.
 */
export async function postToClients (message: unknown) {
  const clients = await serviceWorker.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  })

  for (const client of clients) {
    client.postMessage(message)
  }
}
