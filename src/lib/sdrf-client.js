/**
 * STUB — Sovereign Data Research Fabric client.
 * Patrick Deegan's vault API. Not yet available.
 * When the API is ready, implement these methods.
 */
export const SDRFClient = {
  async connect(/* vaultId, credentials */) {
    console.warn('SDRF not yet available.')
    return null
  },

  async syncArtifact(/* artifact */) {
    console.warn('SDRF not yet available.')
    return null
  },

  async listArtifacts(/* vaultId */) {
    console.warn('SDRF not yet available.')
    return []
  },

  async getArtifact(/* vaultId, artifactId */) {
    console.warn('SDRF not yet available.')
    return null
  },

  async revokeConsent(/* artifactId */) {
    console.warn('SDRF not yet available.')
  },

  async extractFeatures(/* artifact, consentLevel */) {
    console.warn('SDRF not yet available.')
    return null
  },
}
