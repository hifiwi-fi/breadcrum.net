// Search Name: URL Validation Rules

import dns from 'node:dns/promises'
import ipaddr from 'ipaddr.js'

// List of blocked IP ranges
const blockedIPRanges = [
  '127.0.0.0/8',   // Loopback
  '::1/128',       // IPv6 Loopback
  '10.0.0.0/8',    // Private network
  '172.16.0.0/12', // Private network
  '192.168.0.0/16', // Private network
  '169.254.0.0/16', // Link-local
  'fc00::/7',      // IPv6 Unique local
  'fe80::/10',     // IPv6 Link-local
  '224.0.0.0/4',   // Multicast
  'ff00::/8',      // IPv6 Multicast
  '100.64.0.0/10', // Carrier-grade NAT
  '192.0.2.0/24',  // Documentation
  '198.18.0.0/15', // Benchmark testing
  '203.0.113.0/24', // Documentation
  '240.0.0.0/4',   // Reserved
]

// Blocked hostnames (e.g., cloud metadata)
const blockedHostnames = [
  '169.254.169.254',      // AWS Metadata
  'metadata.google.internal', // GCP Metadata
]

// Function to check if an IP is in a blocked range
/**
 * @param  {string}  ip
 * @return {Boolean}
 */
function isBlockedIP (ip) {
  const parsedIP = ipaddr.parse(ip)
  for (const range of blockedIPRanges) {
    if (parsedIP.match(ipaddr.parseCIDR(range))) {
      return true
    }
  }
  return false
}

/**
 * @param  {string} hostname
 */
async function dnsRebindingCheck (hostname) {
  const firstResolution = await dns.lookup(hostname, { all: true })
  await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1 second
  const secondResolution = await dns.lookup(hostname, { all: true })

  const firstIPs = firstResolution.map((addr) => addr.address)
  const secondIPs = secondResolution.map((addr) => addr.address)

  if (!firstIPs.every((ip) => secondIPs.includes(ip))) {
    throw new Error('DNS rebinding detected')
  }
}

/**
 * @param  {string}  urlString
 * @return {Promise<Boolean>}
 */
export async function isNotSSRF (urlString) {
  try {
    const url = new URL(urlString)

    // Validate protocol
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false // Only allow http and https
    }

    // Block specific metadata endpoints
    if (blockedHostnames.includes(url.hostname)) {
      return false // Blocked hostname detected
    }

    // Resolve hostname to IP addresses
    const addresses = await dns.lookup(url.hostname, { all: true })

    // Validate each resolved IP
    for (const { address } of addresses) {
      if (isBlockedIP(address)) {
        return false // Blocked IP detected
      }
    }

    // Perform DNS rebinding check
    await dnsRebindingCheck(url.hostname)

    return true // Passed all checks, URL is safe
  } catch (err) {
    const workingError = err instanceof Error ? err : new Error('Unknown Error Type', { cause: err })
    console.error('Error validating URL:', workingError.message)
    return false // Fail closed on error
  }
}
