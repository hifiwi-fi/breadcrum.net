import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'

// Used for editors and canary testing

/**
 * @typedef {import('eslint').Linter.FlatConfig} FlatConfig
 */

/** @type {string[]} */
const ignores = resolveIgnoresFromGitignore()
/** @type {string[]} */
const browserFiles = ['assets/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}']
const browserPrefix = 'assets/'
/** @type {string[]} */
const extraTsFiles = ['**/*.cts', '**/*.mts']

/**
 * @param {FlatConfig} config
 * @returns {FlatConfig}
 */
const scopeToBrowser = (config) => {
  if (config.ignores && Object.keys(config).length === 1) {
    return config
  }

  if (Array.isArray(config.files)) {
    return {
      ...config,
      files: config.files.map((pattern) => `${browserPrefix}${pattern}`),
    }
  }

  return {
    ...config,
    files: browserFiles,
  }
}

/**
 * @param {FlatConfig} config
 * @returns {FlatConfig}
 */
const excludeBrowser = (config) => {
  if (config.ignores && Object.keys(config).length === 1) {
    return config
  }

  return {
    ...config,
    ignores: [...(config.ignores || []), 'assets/**'],
  }
}

export default [
  { ignores },
  ...neostandard({
    ts: true,
    filesTs: extraTsFiles,
  }).map(excludeBrowser),
  ...neostandard({
    ts: true,
    env: ['browser'],
    filesTs: extraTsFiles,
  }).map(scopeToBrowser),
]
