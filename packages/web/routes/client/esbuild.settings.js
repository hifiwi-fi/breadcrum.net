/**
 * @import { BuildOptions } from '@domstack/static'
 */

/**
 * @param {BuildOptions} esbuildSettings
 * @returns {Promise<BuildOptions>}
 */
const esbuildSettingsOverride = async (esbuildSettings) => {
  esbuildSettings.target = [...(esbuildSettings.target ?? []), 'safari18']
  return esbuildSettings
}

export default esbuildSettingsOverride
