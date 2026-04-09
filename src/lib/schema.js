import { SCHEMA_VERSION } from '../config.js'
import { TIME_OPTIONS } from '../data/time-options.js'
import { BODY_REGIONS, INTENSITY_LABELS } from '../data/body-regions.js'

/**
 * Assemble a v0.4 capture artifact from app state + recording metadata.
 * @param {object} state - the useReducer state
 * @param {object} recording - { hasRecording, totalDuration, timeline, keepAudio }
 * @returns {object} the artifact JSON
 */
export function assembleArtifact(state, recording) {
  const timeOption = TIME_OPTIONS.find((t) => t.value === state.peak.timePer)

  const somaticRegions = Object.entries(state.body.regions)
    .filter(([, level]) => level > 0)
    .map(([id, level]) => {
      const region = BODY_REGIONS.find((r) => r.id === id)
      return {
        region: region?.label || id,
        intensity: level,
        intensity_label: INTENSITY_LABELS[level - 1],
      }
    })

  return {
    _schema: SCHEMA_VERSION,
    _encryption: 'AES-256-GCM PBKDF2-310k',
    _instrument_refs: [
      'EDI-8 (Nour et al. 2017)',
      'Watts Connectedness Scale (Watts et al. 2022)',
      'VAS Tier 1',
      '5D-ASC temporal (Dittrich 1998)',
      'PPIA',
    ],
    captured_at: new Date().toISOString(),
    explorer: state.vault.handle || 'anonymous',
    identity: {
      explorer_hash: null, // filled by export.js after hashing
    },

    context: {
      methods: state.context.methods.map((m) => ({
        name: m.name,
        dose: m.dose || null,
        is_primary: m.isPrimary,
      })),
      setting: state.context.setting || null,
      social_context: state.context.socialContext || null,
      intention: state.context.intention || null,
      explorer_typology: state.profile.ppiaTypes.length ? state.profile.ppiaTypes : null,
      experience_frequency: state.profile.experienceFrequency || null,
    },

    voice: {
      has_recording: recording.hasRecording,
      total_duration_seconds: recording.totalDuration,
      has_audio: recording.keepAudio && recording.hasRecording,
      timeline: recording.timeline,
    },

    arc: {
      phase: state.arc.phase,
    },

    tier1: {
      arousal: state.peak.arousal,
      valence: state.peak.valence,
      temporal: {
        value: state.peak.timePer,
        label: timeOption?.label || null,
      },
      somatic: {
        regions: somaticRegions,
        notes: state.body.notes || null,
      },
    },

    tier2: {
      ego_dissolution: state.peak.ego,
      connectedness: {
        self: state.connection.self,
        others: state.connection.others,
        world: state.connection.world,
      },
      noetic_quality: state.peak.noetic,
      challenging: {
        encountered: state.peak.challenging.encountered,
        types: state.peak.challenging.types.length ? state.peak.challenging.types : null,
      },
    },

    physical_state: {
      factors: state.body.physicalFactors.length ? state.body.physicalFactors : null,
      notes: state.body.physicalNotes || null,
    },

    timing: {
      vault_created_at: state.timing.vaultCreatedAt,
      voice_started_at: state.timing.voiceStartedAt,
      export_at: new Date().toISOString(),
    },

    consent: {
      level: 0,
    },
  }
}

/**
 * Basic validation: checks required fields are present.
 * @param {object} artifact
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateArtifact(artifact) {
  const errors = []

  if (!artifact._schema) errors.push('Missing _schema')
  if (!artifact.captured_at) errors.push('Missing captured_at')
  if (!artifact.explorer) errors.push('Missing explorer')
  if (!artifact.context) errors.push('Missing context')
  if (!artifact.tier1) errors.push('Missing tier1')
  if (!artifact.tier2) errors.push('Missing tier2')

  return { valid: errors.length === 0, errors }
}
