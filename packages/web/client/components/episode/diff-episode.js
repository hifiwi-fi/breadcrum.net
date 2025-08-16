/// <reference lib="dom" />
/* eslint-env browser */

/**
 * @import { TypeEpisodeReadClient } from '../../../routes/api/episodes/schemas/schema-episode-read.js'
 */

/**
 * Compare two episodes and return an object with only the changed properties
 * @param {TypeEpisodeReadClient} oldEpisode - The original episode
 * @param {Partial<TypeEpisodeReadClient>} newEpisode - The updated episode data
 * @returns {Partial<TypeEpisodeReadClient>} Object containing only changed properties
 */
export function diffEpisode (oldEpisode, newEpisode) {
  /** @type {Partial<TypeEpisodeReadClient>} */
  const episodeDiff = {}

  for (const [key, newValue] of Object.entries(newEpisode)) {
    const oldValue = oldEpisode[/** @type {keyof TypeEpisodeReadClient} */(key)]
    if (newValue !== oldValue) {
      // @ts-expect-error - Dynamic key assignment
      episodeDiff[key] = newValue
    }
  }

  return episodeDiff
}
