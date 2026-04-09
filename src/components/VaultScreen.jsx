import { useState } from 'react'
import Card from './ui/Card.jsx'
import Chip from './ui/Chip.jsx'
import { PPIA_TYPES } from '../data/ppia-types.js'
import { EXPERIENCE_FREQUENCY } from '../data/experience-frequency.js'

function passphraseStrength(p) {
  if (!p) return { w: 0, c: 'var(--border-subtle)', l: '' }
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 14) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  if (s <= 1) return { w: 20, c: 'var(--red-danger)', l: 'Weak' }
  if (s <= 2) return { w: 40, c: 'var(--text-secondary)', l: 'Fair' }
  if (s <= 3) return { w: 65, c: 'var(--phthalo-bright)', l: 'Good' }
  if (s <= 4) return { w: 85, c: 'var(--phthalo-glow)', l: 'Strong' }
  return { w: 100, c: 'var(--phthalo-glow)', l: 'Excellent' }
}

export default function VaultScreen({ state, dispatch, vault, onUnlock }) {
  const [showPass, setShowPass] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handle = state.vault.handle
  const pass = state.vault.passphrase
  const st = passphraseStrength(pass)
  const canBegin = handle.trim().length >= 1 && pass.length >= 8

  async function handleBegin() {
    setLoading(true)
    setError(null)
    try {
      const result = await onUnlock(handle, pass)
      if (result.isNew) {
        setShowProfile(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Profile setup (shown after vault creation for new explorers)
  if (showProfile) {
    return (
      <div className="step-enter">
        <Card>
          <div className="card-title">A little about you</div>
          <p className="card-desc">
            This is stored in your vault and included with every capture. You only set it once.
          </p>

          <div className="field">
            <label className="field-label">
              What drives your exploration?{' '}
              <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>Select all that apply</span>
            </label>
            <div className="chips">
              {PPIA_TYPES.map((t) => (
                <Chip
                  key={t.code}
                  label={t.label}
                  small
                  active={state.profile.ppiaTypes.includes(t.code)}
                  onClick={() => {
                    const types = state.profile.ppiaTypes.includes(t.code)
                      ? state.profile.ppiaTypes.filter((x) => x !== t.code)
                      : [...state.profile.ppiaTypes, t.code]
                    dispatch({ type: 'SET_PROFILE', payload: { ppiaTypes: types } })
                  }}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">How familiar are you with altered states?</label>
            <div className="chips">
              {EXPERIENCE_FREQUENCY.map((e) => (
                <Chip
                  key={e.value}
                  label={e.label}
                  small
                  active={state.profile.experienceFrequency === e.value}
                  onClick={() =>
                    dispatch({
                      type: 'SET_PROFILE',
                      payload: {
                        experienceFrequency:
                          state.profile.experienceFrequency === e.value ? '' : e.value,
                      },
                    })
                  }
                />
              ))}
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={() => {
              vault.saveProfile(handle, pass, state.profile)
              dispatch({ type: 'UNLOCK_VAULT' })
            }}
            style={{ marginTop: 12 }}
          >
            Begin capture &rarr;
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="step-enter">
      <Card variant="vault">
        <span className="vault-icon">{'\u25C9'}</span>
        <div className="card-title" style={{ textAlign: 'center' }}>Your vault</div>
        <p className="card-desc" style={{ textAlign: 'center' }}>
          Everything you share here gets encrypted on your device before it goes anywhere.
          Pick a handle and a passphrase. That&apos;s it.
        </p>

        <div className="field">
          <label className="field-label">Handle</label>
          <input
            className="field-input"
            placeholder="Any name that isn't your real one"
            value={handle}
            onChange={(e) => dispatch({ type: 'SET_VAULT', payload: { handle: e.target.value } })}
            autoComplete="off"
          />
          <div className="field-hint">Only exists inside your encrypted vault.</div>
        </div>

        <div className="field">
          <label className="field-label">Passphrase</label>
          <div style={{ position: 'relative' }}>
            <input
              className="field-input"
              type={showPass ? 'text' : 'password'}
              placeholder="8+ characters you won't forget"
              value={pass}
              onChange={(e) => dispatch({ type: 'SET_VAULT', payload: { passphrase: e.target.value } })}
              autoComplete="off"
              style={{ paddingRight: 60 }}
            />
            <button
              className="btn-ghost"
              onClick={() => setShowPass(!showPass)}
              style={{
                position: 'absolute',
                right: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '4px 8px',
                fontSize: 11,
              }}
            >
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>
          {pass && (
            <>
              <div className="strength-bar">
                <div
                  className="strength-fill"
                  style={{ width: st.w + '%', background: st.c }}
                />
              </div>
              <div className="field-hint" style={{ color: st.c, marginTop: 6 }}>
                {st.l}
              </div>
            </>
          )}
          <div className="field-hint" style={{ marginTop: 8 }}>
            Encrypts everything locally. We never see it, never store it, and can&apos;t recover it.
          </div>
        </div>

        {error && (
          <div className="field-hint" style={{ color: 'var(--red-danger)', marginBottom: 8 }}>
            {error}
          </div>
        )}

        <button
          className="btn-primary"
          disabled={!canBegin || loading}
          onClick={handleBegin}
          style={{ marginTop: 8 }}
        >
          {loading ? 'Opening vault...' : 'Begin'}
        </button>
      </Card>

      <Card style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          How your data stays yours
        </div>
        <div className="shield-row">
          <span className="shield-icon">{'\u25C6'}</span>
          <span className="shield-text">
            <strong>Runs in your browser.</strong> No server, no database, nothing to breach.
          </span>
        </div>
        <div className="shield-row">
          <span className="shield-icon">{'\u25C6'}</span>
          <span className="shield-text">
            <strong>Encrypted before export.</strong> Without your passphrase, the file is noise.
          </span>
        </div>
        <div className="shield-row">
          <span className="shield-icon">{'\u25C6'}</span>
          <span className="shield-text">
            <strong>Your vault persists locally.</strong> Return with your handle and passphrase to see past captures.
          </span>
        </div>
        <div className="shield-row">
          <span className="shield-icon">{'\u25C6'}</span>
          <span className="shield-text">
            <strong>Burn anytime.</strong> Wipe everything and start fresh whenever you want.
          </span>
        </div>
      </Card>
    </div>
  )
}
