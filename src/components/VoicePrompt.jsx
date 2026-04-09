import Card from './ui/Card.jsx'

function formatDuration(seconds) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
}

export default function VoicePrompt({ recording, onBeginCapture }) {
  const { status, duration, amplitudeRef, start, pause } = recording
  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const hasStarted = status !== 'idle'

  const amp = amplitudeRef.current
  const orbScale = isRecording ? 1 + amp * 0.35 : 1
  const orbGlow = isRecording ? 30 + amp * 50 : 0

  async function handleOrbTap() {
    if (status === 'idle') {
      await start('voice_prompt')
    } else if (isRecording) {
      pause('voice_prompt')
    }
  }

  return (
    <div className="step-enter">
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <p className="card-desc" style={{ marginBottom: 0, maxWidth: 340, margin: '0 auto' }}>
            Describe what happened. Cover what feels important — your mood, sense of
            connectedness, how expansive or contracted you felt, what time was doing,
            what you saw or sensed, where the body lit up.{' '}
            <em>Go as deep as you want.</em>
          </p>
          <p
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              marginTop: 12,
              lineHeight: 1.5,
              maxWidth: 300,
              margin: '12px auto 0',
            }}
          >
            You can keep speaking at any point using the orb in the corner.
            Your voice captures what structured inputs can&apos;t.
          </p>
        </div>

        <div className="orb-container" onClick={handleOrbTap}>
          <div
            className={`orb-ring ${isRecording ? 'recording' : ''}`}
            style={{
              transform: `scale(${orbScale})`,
              background: isRecording
                ? 'radial-gradient(circle, rgba(13,74,50,0.2) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(13,74,50,0.06) 0%, transparent 70%)',
              boxShadow: isRecording ? `0 0 ${orbGlow}px rgba(13,74,50,0.3)` : 'none',
            }}
          >
            <div
              className={`orb-core ${isRecording ? 'recording' : isPaused ? 'paused' : ''}`}
            />
          </div>
        </div>

        <div className="recording-status">
          {isRecording ? (
            <>
              <div className="rec-dot" />
              <span className="rec-label">Listening</span>
              <span className="rec-time">{formatDuration(duration)}</span>
            </>
          ) : isPaused ? (
            <span className="idle-hint">
              Paused &middot; {formatDuration(duration)}
            </span>
          ) : (
            <span className="idle-hint">Tap when you&apos;re ready</span>
          )}
        </div>
      </Card>

      <button
        className="btn-primary"
        onClick={onBeginCapture}
        style={{ marginTop: 4 }}
      >
        {hasStarted ? 'Continue to capture \u2192' : 'Skip voice for now \u2192'}
      </button>
    </div>
  )
}
