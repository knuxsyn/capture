import { useCallback } from 'react'
import { encryptPayload, decryptPayload, encryptBlob } from '../lib/crypto.js'

/**
 * React hook wrapping crypto operations.
 */
export function useEncryption() {
  const encrypt = useCallback(async (data, passphrase) => {
    return encryptPayload(data, passphrase)
  }, [])

  const decrypt = useCallback(async (encryptedData, passphrase) => {
    return decryptPayload(encryptedData, passphrase)
  }, [])

  const encryptAudio = useCallback(async (blob, passphrase) => {
    return encryptBlob(blob, passphrase)
  }, [])

  return { encrypt, decrypt, encryptAudio }
}
