import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'

// Used for editors and canary testing

const ignores = resolveIgnoresFromGitignore()
const clientFiles = ['packages/web/client/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}']
const clientPrefix = 'packages/web/client/'
const extraTsFiles = ['**/*.cts', '**/*.mts']

const scopeToClient = (config) => {
  if (config.ignores && Object.keys(config).length === 1) {
    return config
  }

  if (config.files) {
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

const excludeClient = (config) => {
  if (config.ignores && Object.keys(config).length === 1) {
    return config
  }

  return {
    ...config,
    ignores: [...(config.ignores || []), 'packages/web/client/**'],
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
