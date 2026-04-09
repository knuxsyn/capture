import { openDB } from 'idb'
import { deriveKey, encryptPayload, decryptPayload } from './crypto.js'
import { deriveExplorerHash, saltFromHash } from './identity.js'

const DB_NAME = 'sensoria-vault'
const DB_VERSION = 1

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata')
      }
      if (!db.objectStoreNames.contains('captures')) {
        db.createObjectStore('captures', { keyPath: 'id' })
      }
    },
  })
}

/**
 * Derive the vault encryption key from handle + passphrase.
 * Deterministic: same credentials always produce the same key.
 */
async function getVaultKey(handle, passphrase) {
  const hash = await deriveExplorerHash(handle, passphrase)
  const salt = saltFromHash(hash)
  return deriveKey(passphrase, salt)
}

/**
 * Check if a vault exists for this explorer.
 * @returns {Promise<boolean>}
 */
export async function vaultExists(handle, passphrase) {
  const db = await getDB()
  const hash = await deriveExplorerHash(handle, passphrase)
  const meta = await db.get('metadata', hash)
  return !!meta
}

/**
 * Create a new vault. Stores encrypted metadata.
 * @returns {Promise<{ explorerHash: string, createdAt: string }>}
 */
export async function createVault(handle, passphrase) {
  const db = await getDB()
  const hash = await deriveExplorerHash(handle, passphrase)
  const key = await getVaultKey(handle, passphrase)
  const createdAt = new Date().toISOString()

  const metadata = {
    handle,
    createdAt,
    profile: { ppiaTypes: [], experienceFrequency: '' },
  }

  // Encrypt metadata using the vault key (via passphrase + deterministic salt)
  const encrypted = await encryptPayload(metadata, passphrase)

  await db.put('metadata', { encrypted, hash }, hash)

  return { explorerHash: hash, createdAt }
}

/**
 * Open an existing vault. Returns decrypted metadata or throws on wrong passphrase.
 * @returns {Promise<{ explorerHash: string, createdAt: string, profile: object }>}
 */
export async function openVault(handle, passphrase) {
  const db = await getDB()
  const hash = await deriveExplorerHash(handle, passphrase)
  const record = await db.get('metadata', hash)

  if (!record) {
    throw new Error('No vault found for this handle.')
  }

  try {
    const metadata = await decryptPayload(record.encrypted, passphrase)
    return {
      explorerHash: hash,
      createdAt: metadata.createdAt,
      profile: metadata.profile || { ppiaTypes: [], experienceFrequency: '' },
    }
  } catch {
    throw new Error('Wrong passphrase.')
  }
}

/**
 * Update the vault profile (PPIA types, experience frequency).
 */
export async function updateProfile(handle, passphrase, profile) {
  const db = await getDB()
  const hash = await deriveExplorerHash(handle, passphrase)
  const record = await db.get('metadata', hash)
  if (!record) throw new Error('No vault found.')

  const metadata = await decryptPayload(record.encrypted, passphrase)
  metadata.profile = { ...metadata.profile, ...profile }
  const encrypted = await encryptPayload(metadata, passphrase)
  await db.put('metadata', { encrypted, hash }, hash)
}

/**
 * Save an encrypted capture artifact to the vault.
 * @param {string} handle
 * @param {string} passphrase
 * @param {object} artifact - the unencrypted capture artifact
 * @returns {Promise<string>} capture ID
 */
export async function saveCapture(handle, passphrase, artifact) {
  const db = await getDB()
  const id = `capture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const encrypted = await encryptPayload(artifact, passphrase)

  await db.put('captures', {
    id,
    explorerHash: await deriveExplorerHash(handle, passphrase),
    encrypted,
    savedAt: new Date().toISOString(),
  })

  return id
}

/**
 * List all captures for this explorer (decrypted summaries).
 * @returns {Promise<Array<{ id: string, capturedAt: string, methodSummary: string }>>}
 */
export async function listCaptures(handle, passphrase) {
  const db = await getDB()
  const hash = await deriveExplorerHash(handle, passphrase)
  const all = await db.getAll('captures')

  const mine = all.filter((c) => c.explorerHash === hash)
  const summaries = []

  for (const record of mine) {
    try {
      const artifact = await decryptPayload(record.encrypted, passphrase)
      summaries.push({
        id: record.id,
        capturedAt: artifact.captured_at,
        methodSummary: artifact.context?.methods?.map((m) => m.name).join(', ') || 'No methods',
        savedAt: record.savedAt,
      })
    } catch {
      // Skip corrupted entries
    }
  }

  return summaries.sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))
}

/**
 * Retrieve and decrypt a specific capture.
 * @returns {Promise<object>} the full artifact
 */
export async function getCapture(handle, passphrase, captureId) {
  const db = await getDB()
  const record = await db.get('captures', captureId)
  if (!record) throw new Error('Capture not found.')
  return decryptPayload(record.encrypted, passphrase)
}

/**
 * Delete the entire vault (burn). Removes all data.
 */
export async function deleteVault() {
  const db = await getDB()
  const tx = db.transaction(['metadata', 'captures'], 'readwrite')
  await tx.objectStore('metadata').clear()
  await tx.objectStore('captures').clear()
  await tx.done
}
