/**
 * STUB — LLM-guided phenomenological interview agent.
 * Requires Anthropic API key (not yet provisioned).
 * When available, implement as a thin proxy through a Cloudflare Worker.
 */
export const DiaryAgent = {
  async startInterview(/* captureArtifact */) {
    throw new Error('Diary Agent not yet implemented.')
  },

  async respondToExplorer(/* message, history */) {
    throw new Error('Diary Agent not yet implemented.')
  },

  async extractDimensions(/* transcript */) {
    throw new Error('Diary Agent not yet implemented.')
  },

  async validateWithExplorer(/* dimensions */) {
    throw new Error('Diary Agent not yet implemented.')
  },
}
