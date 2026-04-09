import { useReducer, useCallback } from 'react'
import { STEP_LABELS } from './config.js'
import { useRecording } from './hooks/useRecording.js'
import { useVault } from './hooks/useVault.js'
import ProgressBar from './components/ui/ProgressBar.jsx'
import VaultScreen from './components/VaultScreen.jsx'
import VoicePrompt from './components/VoicePrompt.jsx'
import FloatingOrb from './components/FloatingOrb.jsx'
import ContextForm from './components/ContextForm.jsx'
import ArcSelector from './components/ArcSelector.jsx'
import PeakCapture from './components/PeakCapture.jsx'
import BodyCapture from './components/BodyCapture.jsx'
import Connectedness from './components/Connectedness.jsx'
import ReviewExport from './components/ReviewExport.jsx'

// Steps: -1 = vault, 0 = voice prompt, 1-7 = structured steps
// Structured step labels (indices 1-7): Context, Arc, Peak, Body, Connection, Review
const STRUCTURED_LABELS = STEP_LABELS.slice(1)

const initialState = {
  vault: { handle: '', passphrase: '', isUnlocked: false, createdAt: null },
  profile: { ppiaTypes: [], experienceFrequency: '' },
  voice: { keepAudio: false },
  context: { methods: [], setting: '', socialContext: '', intention: '' },
  arc: { phase: null },
  peak: {
    arousal: 50,
    valence: 50,
    ego: 0,
    timePer: 0,
    noetic: 0,
    challenging: { encountered: false, types: [] },
  },
  body: { regions: {}, notes: '', physicalFactors: [], physicalNotes: '' },
  connection: { self: 50, others: 50, world: 50 },
  step: -1,
  timing: { vaultCreatedAt: null, voiceStartedAt: null },
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VAULT':
      return { ...state, vault: { ...state.vault, ...action.payload } }
    case 'SET_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } }
    case 'SET_VOICE':
      return { ...state, voice: { ...state.voice, ...action.payload } }
    case 'SET_CONTEXT':
      return { ...state, context: { ...state.context, ...action.payload } }
    case 'SET_ARC':
      return { ...state, arc: { ...state.arc, ...action.payload } }
    case 'SET_PEAK':
      return { ...state, peak: { ...state.peak, ...action.payload } }
    case 'SET_PEAK_CHALLENGING':
      return {
        ...state,
        peak: {
          ...state.peak,
          challenging: { ...state.peak.challenging, ...action.payload },
        },
      }
    case 'SET_BODY':
      return { ...state, body: { ...state.body, ...action.payload } }
    case 'TOGGLE_BODY_REGION': {
      const id = action.payload
      const cur = state.body.regions[id] || 0
      const next = cur >= 3 ? 0 : cur + 1
      const regions = { ...state.body.regions }
      if (next === 0) delete regions[id]
      else regions[id] = next
      return { ...state, body: { ...state.body, regions } }
    }
    case 'SET_CONNECTION':
      return { ...state, connection: { ...state.connection, ...action.payload } }
    case 'SET_STEP':
      return { ...state, step: action.payload }
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 }
    case 'PREV_STEP':
      return { ...state, step: Math.max(-1, state.step - 1) }
    case 'SET_TIMING':
      return { ...state, timing: { ...state.timing, ...action.payload } }
    case 'UNLOCK_VAULT':
      return {
        ...state,
        vault: {
          ...state.vault,
          isUnlocked: true,
          createdAt: action.payload?.createdAt || new Date().toISOString(),
        },
        profile: action.payload?.profile || state.profile,
        step: 0,
        timing: {
          ...state.timing,
          vaultCreatedAt: action.payload?.createdAt || new Date().toISOString(),
        },
      }
    case 'BURN':
      return { ...initialState }
    default:
      return state
  }
}

// Map structured step indices (1-6) to step names for the voice timeline
const STEP_NAMES = ['voice_prompt', 'context', 'arc', 'peak', 'body', 'connection', 'review']

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const recording = useRecording()
  const vault = useVault()

  const currentStepName = STEP_NAMES[state.step] || 'vault'

  const handleUnlock = useCallback(
    async (handle, passphrase) => {
      const result = await vault.unlock(handle, passphrase)
      if (!result.isNew) {
        // Returning explorer — unlock immediately
        dispatch({
          type: 'UNLOCK_VAULT',
          payload: { createdAt: result.createdAt, profile: result.profile },
        })
      }
      return result
    },
    [vault],
  )

  const handleBurn = useCallback(async () => {
    if (confirm('This clears everything. New handle, new passphrase, fresh start.')) {
      // Stop recording if active
      if (recording.status !== 'idle') {
        await recording.stop('review')
      }
      recording.discard()
      await vault.burn()
      dispatch({ type: 'BURN' })
    }
  }, [recording, vault])

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="header-lab">Sensoria Research</div>
        <div className="header-title">Experience Capture</div>
        <div className="header-sub">
          {state.vault.isUnlocked ? (
            <span>
              Capturing as{' '}
              <strong style={{ color: 'var(--phthalo-bright)' }}>
                {state.vault.handle}
              </strong>{' '}
              &middot;{' '}
              <span className="enc-badge">{'\u25C6'} encrypted</span>
            </span>
          ) : (
            'Map your experience. Own your data.'
          )}
        </div>
      </div>

      {/* Progress bar (structured steps 1-6) */}
      {state.vault.isUnlocked && state.step >= 1 && (
        <ProgressBar step={state.step - 1} labels={STRUCTURED_LABELS} />
      )}

      {/* Step content */}
      {state.step === -1 && (
        <VaultScreen
          state={state}
          dispatch={dispatch}
          vault={vault}
          onUnlock={handleUnlock}
        />
      )}

      {state.step === 0 && (
        <VoicePrompt
          recording={recording}
          onBeginCapture={() => {
            if (recording.status === 'recording') {
              recording.pause('voice_prompt')
            }
            dispatch({ type: 'SET_TIMING', payload: { voiceStartedAt: recording.hasRecording ? new Date().toISOString() : null } })
            dispatch({ type: 'NEXT_STEP' })
          }}
        />
      )}

      {state.step === 1 && <ContextForm state={state} dispatch={dispatch} />}
      {state.step === 2 && <ArcSelector state={state} dispatch={dispatch} />}
      {state.step === 3 && <PeakCapture state={state} dispatch={dispatch} />}
      {state.step === 4 && <BodyCapture state={state} dispatch={dispatch} />}
      {state.step === 5 && <Connectedness state={state} dispatch={dispatch} />}
      {state.step === 6 && (
        <ReviewExport
          state={state}
          dispatch={dispatch}
          recording={recording}
          vault={vault}
          onBurn={handleBurn}
        />
      )}

      {/* Floating orb (persistent during structured steps) */}
      {state.vault.isUnlocked && state.step >= 1 && state.step <= 5 && (
        <FloatingOrb recording={recording} currentStep={currentStepName} />
      )}

      {/* Navigation footer */}
      {state.vault.isUnlocked && state.step >= 1 && state.step <= 5 && (
        <div className="nav-footer">
          <button
            className="btn-secondary"
            onClick={() => dispatch({ type: 'PREV_STEP' })}
          >
            Back
          </button>
          <button
            className="btn-primary nav-continue"
            onClick={() => dispatch({ type: 'NEXT_STEP' })}
          >
            Continue &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
