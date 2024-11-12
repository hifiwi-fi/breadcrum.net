import neostandard, { resolveIgnoresFromGitignore } from 'neostandard'

// Used for editors and canary testing

export default neostandard({
  ts: true,
  ignores: resolveIgnoresFromGitignore(),
})
