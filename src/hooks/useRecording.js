import { useState, useRef, useCallback, useEffect } from 'react'
import { createRecorder } from '../lib/audio.js'

/**
 * React hook for voice recording with pause/resume and step-tagged timeline.
 * Uses a single MediaRecorder instance — one continuous audio stream.
 */
export function useRecording() {
  const [status, setStatus] = useState('idle') // 'idle' | 'recording' | 'paused'
  const [duration, setDuration] = useState(0)
  const [blob, setBlob] = useState(null)
  const amplitudeRef = useRef(0)
  const recorderRef = useRef(null)
  const timerRef = useRef(null)

  // Initialize recorder on first use
  function getRecorder() {
    if (!recorderRef.current) {
      recorderRef.current = createRecorder()
      recorderRef.current.onAmplitude((amp) => {
        amplitudeRef.current = amp
      })
      recorderRef.current.onStatusChange((s) => {
        setStatus(s)
      })
    }
    return recorderRef.current
  }

  // Timer for elapsed display
  useEffect(() => {
    if (status === 'recording') {
      timerRef.current = setInterval(() => {
        const r = recorderRef.current
        if (r) setDuration(r.getElapsed())
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      // Update duration one last time on pause
      if (status === 'paused' && recorderRef.current) {
        setDuration(recorderRef.current.getElapsed())
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  const start = useCallback(async (currentStep) => {
    const r = getRecorder()
    setBlob(null)
    await r.start(currentStep)
  }, [])

  const pause = useCallback((currentStep) => {
    const r = recorderRef.current
    if (r) r.pause(currentStep)
  }, [])

  const resume = useCallback((currentStep) => {
    const r = recorderRef.current
    if (r) r.resume(currentStep)
  }, [])

  const stop = useCallback(async (currentStep) => {
    const r = recorderRef.current
    if (!r) return null
    const audioBlob = await r.stop(currentStep)
    setBlob(audioBlob)
    setDuration(0)
    return audioBlob
  }, [])

  const discard = useCallback(() => {
    const r = recorderRef.current
    if (r) r.discard()
    setBlob(null)
    setDuration(0)
  }, [])

  const getTimeline = useCallback(() => {
    const r = recorderRef.current
    return r ? r.timeline : []
  }, [])

  return {
    status,
    duration,
    blob,
    amplitudeRef,
    start,
    pause,
    resume,
    stop,
    discard,
    getTimeline,
    hasRecording: blob !== null,
  }
}
