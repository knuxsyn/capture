const ITERATIONS = 310000

/**
 * Derive an AES-256-GCM key from a passphrase and salt via PBKDF2.
 * @param {string} passphrase
 * @param {Uint8Array} salt - 16-byte salt
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(passphrase, salt) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypt a JSON-serializable object. Returns base64 string.
 * Format: salt (16) + iv (12) + ciphertext
 * @param {object} data
 * @param {string} passphrase
 * @returns {Promise<string>} base64-encoded encrypted payload
 */
export async function encryptPayload(data, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  )
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)
  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt a base64-encoded payload back to an object.
 * @param {string} base64Data
 * @param {string} passphrase
 * @returns {Promise<object>}
 */
export async function decryptPayload(base64Data, passphrase) {
  const combined = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
  const salt = combined.slice(0, 16)
  const iv = combined.slice(16, 28)
  const ciphertext = combined.slice(28)
  const key = await deriveKey(passphrase, salt)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  )
  return JSON.parse(new TextDecoder().decode(plaintext))
}

/**
 * Encrypt a binary blob (e.g., audio). Returns an encrypted Blob.
 * @param {Blob} blob
 * @param {string} passphrase
 * @returns {Promise<Blob>}
 */
export async function encryptBlob(blob, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const buffer = await blob.arrayBuffer()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    buffer,
  )
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length)
  return new Blob([combined], { type: 'application/octet-stream' })
}
