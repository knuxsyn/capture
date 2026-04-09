/**
 * Derive a stable explorer hash from handle + passphrase.
 * Used as the vault lookup key. Deterministic: same inputs → same hash.
 * @param {string} handle
 * @param {string} passphrase
 * @returns {Promise<string>} hex-encoded SHA-256 hash
 */
export async function deriveExplorerHash(handle, passphrase) {
  const encoder = new TextEncoder()
  const data = encoder.encode(handle.toLowerCase().trim() + ':' + passphrase)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Derive a deterministic salt from the explorer hash for vault key derivation.
 * @param {string} explorerHash - hex string from deriveExplorerHash
 * @returns {Uint8Array} 16-byte salt
 */
export function saltFromHash(explorerHash) {
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(explorerHash.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
