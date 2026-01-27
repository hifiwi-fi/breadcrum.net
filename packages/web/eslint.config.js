import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'

// Used for editors and canary testing

/**
 * @typedef {import('eslint').Linter.FlatConfig} FlatConfig
 */

/** @type {string[]} */
const ignores = resolveIgnoresFromGitignore()
/** @type {string[]} */
const clientFiles = ['client/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}']
const clientPrefix = 'client/'
/** @type {string[]} */
const extraTsFiles = ['**/*.cts', '**/*.mts']

/**
 * @param {FlatConfig} config
 * @returns {FlatConfig}
 */
const scopeToClient = (config) => {
  if (config.ignores && Object.keys(config).length === 1) {
    return config
  }

  if (Array.isArray(config.files)) {
    return {
      ...config,
      files: config.files.map((pattern) => `${clientPrefix}${pattern}`),
    }
  }

  return {
    ...config,
    files: clientFiles,
  }
}

/**
 * @param {FlatConfig} config
 * @returns {FlatConfig}
 */
const excludeClient = (config) => {
  if (config.ignores && Object.keys(config).length === 1) {
    return config
  }

  return {
    ...config,
    ignores: [...(config.ignores || []), 'client/**'],
  }
}

export default [
  { ignores },
  ...neostandard({
    ts: true,
    filesTs: extraTsFiles,
  }).map(excludeClient),
  ...neostandard({
    ts: true,
    env: ['browser'],
    filesTs: extraTsFiles,
  }).map(scopeToClient),
]
