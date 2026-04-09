/**
 * MediaRecorder wrapper with pause/resume support and amplitude tracking.
 * Produces a single continuous audio blob with a step-tagged timeline.
 */
export function createRecorder() {
  let mediaRecorder = null
  let audioContext = null
  let analyser = null
  let animFrame = null
  let stream = null
  let chunks = []
  let startTime = 0
  let pausedDuration = 0
  let pauseStart = 0

  const state = {
    status: 'idle', // 'idle' | 'recording' | 'paused'
    amplitude: 0,
    timeline: [],
  }

  let onAmplitude = null
  let onStatusChange = null

  function getElapsed() {
    if (state.status === 'idle') return 0
    const now = Date.now()
    const paused = state.status === 'paused' ? now - pauseStart : 0
    return Math.floor((now - startTime - pausedDuration - paused) / 1000)
  }

  function tickAmplitude() {
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(data)
    state.amplitude = data.reduce((a, b) => a + b, 0) / data.length / 255
    if (onAmplitude) onAmplitude(state.amplitude)
    animFrame = requestAnimationFrame(tickAmplitude)
  }

  async function start(currentStep) {
    if (state.status !== 'idle') return

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      throw new Error('Microphone access is needed for voice capture.')
    }

    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    chunks = []
    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    mediaRecorder.start()

    startTime = Date.now()
    pausedDuration = 0
    state.status = 'recording'
    state.timeline = [{ action: 'start', step: currentStep, at_seconds: 0 }]

    tickAmplitude()
    if (onStatusChange) onStatusChange(state.status)
  }

  function pause(currentStep) {
    if (state.status !== 'recording' || !mediaRecorder) return
    mediaRecorder.pause()
    pauseStart = Date.now()
    state.status = 'paused'
    state.amplitude = 0
    if (animFrame) cancelAnimationFrame(animFrame)
    state.timeline.push({ action: 'pause', step: currentStep, at_seconds: getElapsed() })
    if (onAmplitude) onAmplitude(0)
    if (onStatusChange) onStatusChange(state.status)
  }

  function resume(currentStep) {
    if (state.status !== 'paused' || !mediaRecorder) return
    pausedDuration += Date.now() - pauseStart
    mediaRecorder.resume()
    state.status = 'recording'
    state.timeline.push({ action: 'resume', step: currentStep, at_seconds: getElapsed() })
    tickAmplitude()
    if (onStatusChange) onStatusChange(state.status)
  }

  function stop(currentStep) {
    return new Promise((resolve) => {
      if (state.status === 'idle' || !mediaRecorder) {
        resolve(null)
        return
      }

      state.timeline.push({ action: 'stop', step: currentStep, at_seconds: getElapsed() })

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        cleanup()
        state.status = 'idle'
        state.amplitude = 0
        if (onStatusChange) onStatusChange(state.status)
        resolve(blob)
      }

      if (mediaRecorder.state === 'paused') {
        mediaRecorder.resume()
      }
      mediaRecorder.stop()
    })
  }

  function cleanup() {
    if (animFrame) cancelAnimationFrame(animFrame)
    if (audioContext) audioContext.close().catch(() => {})
    if (stream) stream.getTracks().forEach((t) => t.stop())
    mediaRecorder = null
    audioContext = null
    analyser = null
    stream = null
  }

  function discard() {
    cleanup()
    chunks = []
    state.status = 'idle'
    state.amplitude = 0
    state.timeline = []
    if (onStatusChange) onStatusChange(state.status)
  }

  return {
    get status() { return state.status },
    get amplitude() { return state.amplitude },
    get timeline() { return [...state.timeline] },
    getElapsed,
    start,
    pause,
    resume,
    stop,
    discard,
    onAmplitude: (fn) => { onAmplitude = fn },
    onStatusChange: (fn) => { onStatusChange = fn },
  }
}
