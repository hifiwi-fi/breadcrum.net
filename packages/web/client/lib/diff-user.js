export function diffUser (oldUser, newUser) {
  const userDiff = {}
  for (const [key, newValue] of Object.entries(newUser)) {
    const oldValue = oldUser[key]

    if (newValue !== oldValue) userDiff[key] = newValue
  }

  return userDiff
}
