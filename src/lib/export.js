import { encryptPayload, encryptBlob } from './crypto.js'
import { deriveExplorerHash } from './identity.js'
import { assembleArtifact } from './schema.js'

/**
 * Build the full artifact, fill identity hash, return it.
 * @param {object} state - useReducer state
 * @param {object} recording - recording metadata
 * @returns {Promise<object>} the complete artifact
 */
export async function buildArtifact(state, recording) {
  const artifact = assembleArtifact(state, recording)

  // Fill identity hash
  artifact.identity.explorer_hash = await deriveExplorerHash(
    state.vault.handle,
    state.vault.passphrase,
  )

  return artifact
}

/**
 * Encrypt the artifact and trigger a file download.
 * @param {object} artifact - the unencrypted artifact
 * @param {string} passphrase
 * @param {string} handle
 */
export async function downloadEncryptedArtifact(artifact, passphrase, handle) {
  const encrypted = await encryptPayload(artifact, passphrase)
  const blob = new Blob([encrypted], { type: 'application/octet-stream' })
  triggerDownload(blob, `${handle || 'anon'}-${Date.now()}.sensoria.enc`)
}

/**
 * Encrypt a voice blob and trigger download.
 * @param {Blob} audioBlob
 * @param {string} passphrase
 * @param {string} handle
 */
export async function downloadEncryptedVoice(audioBlob, passphrase, handle) {
  const encrypted = await encryptBlob(audioBlob, passphrase)
  triggerDownload(encrypted, `${handle || 'anon'}-voice-${Date.now()}.sensoria.enc`)
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
