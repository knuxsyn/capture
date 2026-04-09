import { useState, useCallback } from 'react'
import {
  vaultExists,
  createVault,
  openVault,
  updateProfile,
  saveCapture,
  listCaptures,
  deleteVault,
} from '../lib/vault.js'

/**
 * React hook for vault CRUD operations.
 */
export function useVault() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [captures, setCaptures] = useState([])
  const [vaultMeta, setVaultMeta] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const unlock = useCallback(async (handle, passphrase) => {
    setLoading(true)
    setError(null)
    try {
      const exists = await vaultExists(handle, passphrase)
      let meta
      if (exists) {
        meta = await openVault(handle, passphrase)
      } else {
        meta = await createVault(handle, passphrase)
        meta.profile = { ppiaTypes: [], experienceFrequency: '' }
      }
      setVaultMeta(meta)
      setIsUnlocked(true)

      // Load captures
      const list = await listCaptures(handle, passphrase)
      setCaptures(list)

      return { isNew: !exists, ...meta }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async (handle, passphrase, artifact) => {
    setError(null)
    try {
      const id = await saveCapture(handle, passphrase, artifact)
      const list = await listCaptures(handle, passphrase)
      setCaptures(list)
      return id
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [])

  const saveProfile = useCallback(async (handle, passphrase, profile) => {
    try {
      await updateProfile(handle, passphrase, profile)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const burn = useCallback(async () => {
    await deleteVault()
    setIsUnlocked(false)
    setCaptures([])
    setVaultMeta(null)
    setError(null)
  }, [])

  return {
    isUnlocked,
    captures,
    vaultMeta,
    error,
    loading,
    unlock,
    save,
    saveProfile,
    burn,
  }
}
