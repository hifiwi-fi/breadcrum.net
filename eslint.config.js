/** @import { Linter } from 'eslint' */
import { globalIgnores } from 'eslint/config'
import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'

// Used for editors and canary testing

const ignores = resolveIgnoresFromGitignore()
const clientFiles = ['src/client/**/*.{js,jsx,mjs,cjs}']
const clientPrefix = 'src/client/'

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
    ignores: [...(config.ignores || []), 'src/client/**'],
  }
}

export default [
  globalIgnores(ignores),
  ...neostandard().map(excludeClient),
  ...neostandard({
    env: ['browser'],
  }).map(scopeToClient),
]
