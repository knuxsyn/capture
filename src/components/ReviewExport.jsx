import { useState } from 'react'
import Card from './ui/Card.jsx'
import { SIGNAL_CONTACT } from '../config.js'
import { TIME_OPTIONS } from '../data/time-options.js'
import { EXPERIENCE_FREQUENCY } from '../data/experience-frequency.js'
import { EXPERIENCE_PHASES } from '../data/experience-phases.js'
import { buildArtifact, downloadEncryptedArtifact, downloadEncryptedVoice } from '../lib/export.js'

function formatDuration(seconds) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
}

export default function ReviewExport({ state, recording, vault, onBurn }) {
  const [exporting, setExporting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const { handle, passphrase } = state.vault
  const hasRec = recording.hasRecording
  const keepAudio = state.voice.keepAudio

  const recMeta = {
    hasRecording: hasRec,
    totalDuration: recording.duration,
    keepAudio,
    timeline: recording.getTimeline(),
  }

  async function handleSaveToVault() {
    setExporting(true)
    try {
      const artifact = await buildArtifact(state, recMeta)
      await vault.save(handle, passphrase, artifact)
      setSaved(true)
    } catch (err) {
      console.error(err)
      alert('Save failed.')
    }
    setExporting(false)
  }

  async function handleDownload() {
    setExporting(true)
    try {
      const artifact = await buildArtifact(state, recMeta)
      await downloadEncryptedArtifact(artifact, passphrase, handle)
      if (keepAudio && recording.blob) {
        await downloadEncryptedVoice(recording.blob, passphrase, handle)
      }
      setDownloaded(true)
    } catch (err) {
      console.error(err)
      alert('Encryption failed.')
    }
    setExporting(false)
  }

  const timeLabel = TIME_OPTIONS.find((t) => t.value === state.peak.timePer)?.label
  const freqLabel = EXPERIENCE_FREQUENCY.find((e) => e.value === state.profile.experienceFrequency)?.label
  const phaseLabel = EXPERIENCE_PHASES.find((p) => p.id === state.arc.phase)?.label
  const activeRegions = Object.keys(state.body.regions).filter((k) => state.body.regions[k] > 0)

  return (
    <div className="step-enter">
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title">Review</div>
          <div className="vault-badge">
            <div className="vault-badge-dot" />
            {handle}
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-label">Capture Data</div>
          <div className="summary-grid">
            {[
              ['Voice', hasRec ? formatDuration(recording.duration) : 'None'],
              ['Audio export', keepAudio ? 'Encrypted' : 'Discarded'],
              ['Method(s)', state.context.methods.map((m) => m.name).join(', ').slice(0, 40) || '\u2014'],
              ['Phase', phaseLabel || '\u2014'],
              ['Familiarity', freqLabel || '\u2014'],
              ['Intensity', state.peak.arousal],
              ['Emotional tone', state.peak.valence],
              ['Self dissolution', state.peak.ego],
              ['Noetic quality', state.peak.noetic],
              ['Time', timeLabel],
              ['Challenging', state.peak.challenging.encountered ? 'Yes' : 'No'],
              ['Body regions', activeRegions.length || 'None'],
              ['Self connection', state.connection.self],
              ['Other connection', state.connection.others],
              ['World connection', state.connection.world],
            ].map(([k, v]) => (
              <div key={k} className="summary-row">
                <span className="summary-key">{k}</span>
                <span className="summary-val">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audio toggle — shown prominently if recording exists */}
        {hasRec && (
          <div
            className="summary-card"
            style={{
              background: keepAudio ? 'rgba(13,74,50,0.06)' : 'rgba(232,228,223,0.025)',
              border: keepAudio ? '1px solid rgba(13,74,50,0.15)' : '1px solid var(--border-subtle)',
            }}
          >
            <div className="toggle-row" style={{ padding: 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                  Voice recording
                </div>
                <div className="field-hint" style={{ marginTop: 0 }}>
                  {keepAudio
                    ? 'Your voice will be encrypted and included. It is identifying even when encrypted.'
                    : 'Your voice will not be saved. Only the structured data will be kept.'}
                </div>
              </div>
              <div
                className={`toggle-track ${keepAudio ? 'on' : ''}`}
                onClick={() => dispatch({ type: 'SET_VOICE', payload: { keepAudio: !keepAudio } })}
              >
                <div className="toggle-thumb" />
              </div>
            </div>
          </div>
        )}

        <div
          className="summary-card"
          style={{
            background: 'rgba(13,74,50,0.06)',
            border: '1px solid rgba(13,74,50,0.15)',
          }}
        >
          <div className="summary-card-label" style={{ color: 'var(--phthalo-bright)' }}>
            Encryption
          </div>
          <div className="shield-text" style={{ fontSize: 12, lineHeight: 1.6 }}>
            Encrypted with <strong>AES-256-GCM</strong>. Unreadable without your passphrase.
            {keepAudio && hasRec && ' Voice files are encrypted separately.'}
          </div>
        </div>

        {/* Primary action: save to vault */}
        <button
          className="btn-primary"
          onClick={handleSaveToVault}
          disabled={exporting}
          style={{ marginTop: 16 }}
        >
          {exporting ? 'Encrypting...' : saved ? '\u2713 Saved to vault' : 'Save to vault'}
        </button>

        {/* Secondary action: download file */}
        <button
          className="btn-secondary"
          onClick={handleDownload}
          disabled={exporting}
          style={{ width: '100%', marginTop: 8 }}
        >
          {downloaded ? '\u2713 Downloaded' : 'Download .sensoria.enc'}
        </button>

        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
          Vault saves are encrypted locally. Downloads save encrypted files to your device.
        </p>
      </Card>

      {/* Signal handoff */}
      <Card>
        <div className="card-title">Send it over</div>
        <p className="card-desc" style={{ marginBottom: 12 }}>
          If sharing with Sensoria Research, open Signal and send your files to:
        </p>
        <div
          style={{
            textAlign: 'center',
            padding: 14,
            background: 'rgba(13,74,50,0.06)',
            borderRadius: 12,
            border: '1px solid rgba(13,74,50,0.15)',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--phthalo-bright)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.03em',
            }}
          >
            {SIGNAL_CONTACT}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
            Sensoria Research &middot; Signal
          </div>
        </div>
        <div className="shield-row">
          <span className="shield-icon">1</span>
          <span className="shield-text">
            Attach your <strong>.sensoria.enc</strong> file
            {keepAudio && hasRec ? ' and voice file' : ''} as an attachment
          </span>
        </div>
        <div className="shield-row">
          <span className="shield-icon">2</span>
          <span className="shield-text">
            Share your passphrase <strong>separately</strong> &mdash; different message, or in person
          </span>
        </div>
      </Card>

      {/* Thank you + burn */}
      <Card
        style={{
          background: 'linear-gradient(135deg, rgba(13,74,50,0.08) 0%, rgba(201,168,76,0.06) 100%)',
          border: '1px solid rgba(13,74,50,0.25)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>{'\u25C9'}</div>
          <div className="card-title" style={{ textAlign: 'center', marginBottom: 6 }}>
            Thank you
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 16, maxWidth: 300, margin: '0 auto 16px' }}>
            Every report helps build something that doesn&apos;t exist yet &mdash; a rigorous,
            community-owned map of human consciousness.
          </p>
        </div>
      </Card>

      <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
        <button className="btn-danger-ghost" onClick={onBurn}>
          Burn this vault
        </button>
        <div className="field-hint" style={{ marginTop: 8, textAlign: 'center' }}>
          Clean slate. New handle, new passphrase, no trace.
        </div>
      </div>

      <div className="footer-note">
        Sensoria Research
        <br />
        Encrypted &middot; Pseudonymous &middot; Sovereign
      </div>
    </div>
  )
}
