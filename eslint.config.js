/** @import { Linter } from 'eslint' */
import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'

// Used for editors and canary testing

const ignores = resolveIgnoresFromGitignore()
const clientFiles = ['client/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}']
const clientPrefix = 'client/'
const extraTsFiles = ['**/*.cts', '**/*.mts']

/** @param {Linter.Config} config */
const scopeToClient = (config) => {
  if (config.ignores && Object.keys(config).length === 1) {
    return config
  }

  if (config.files) {
    return {
      ...config,
      files: config.files.map((pattern) => Array.isArray(pattern)
        ? pattern.map(part => `${clientPrefix}${part}`)
        : `${clientPrefix}${pattern}`),
    }
  }

  return {
    ...config,
    files: clientFiles,
  }
}

/** @param {Linter.Config} config */
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
