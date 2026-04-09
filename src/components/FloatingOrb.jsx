function formatDuration(seconds) {
  return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
}

export default function FloatingOrb({ recording, currentStep }) {
  const { status, duration, start, pause, resume } = recording
  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const isIdle = status === 'idle'

  async function handleTap() {
    if (isIdle) {
      await start(currentStep)
    } else if (isRecording) {
      pause(currentStep)
    } else if (isPaused) {
      resume(currentStep)
    }
  }

  const label = isRecording
    ? 'Tap to pause'
    : isPaused
      ? 'Tap to resume'
      : 'Tap to speak'

  return (
    <div className="floating-orb" onClick={handleTap} role="button" tabIndex={0}>
      <div
        className={`floating-orb-core ${
          isRecording ? 'recording' : isPaused ? 'paused' : ''
        }`}
      >
        <div className="floating-orb-dot" />
      </div>
      <div className="floating-orb-meta">
        {(isRecording || isPaused) && (
          <span className="floating-orb-timer">{formatDuration(duration)}</span>
        )}
        <span className="floating-orb-label">{label}</span>
      </div>
    </div>
  )
}
