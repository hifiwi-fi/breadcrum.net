/**
 * @param  {Url} url A URL object to check
 * @return {[type]}     [description]
 */
export async function ssrfCheck (url) {
  try {
    // Validate protocol
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return {
        ssrf: false
      }
    }

    // Block cloud metadata endpoints
    const blockedHostnames = ['169.254.169.254', 'metadata.google.internal']
    if (blockedHostnames.includes(url.hostname)) {
      return false // Block specific metadata endpoints
    }

    // Resolve hostname to IP addresses
    const addresses = await dns.lookup(url.hostname, { all: true })

    // Validate each resolved IP
    for (const { address } of addresses) {
      if (isBlockedIP(address)) {
        return false // Blocked IP detected
      }
    }

    // Additional DNS rebinding check
    await dnsRebindingCheck(url.hostname)

    return true // Passed all checks, URL is safe
  } catch (err) {
    console.error('Error validating URL:', err.message)
    return false // Fail closed on error
  }
}
