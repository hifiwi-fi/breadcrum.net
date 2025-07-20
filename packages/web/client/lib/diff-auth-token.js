export function diffToken (oldToken, newToken) {
  const tokenDiff = {}
  for (const [key, newValue] of Object.entries(newToken)) {
    const oldValue = oldToken[key]

    if (newValue !== oldValue) tokenDiff[key] = newValue
  }

  return tokenDiff
}
