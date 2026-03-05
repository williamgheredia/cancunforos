'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

type RecorderState = 'idle' | 'recording' | 'processing'

interface UseVoiceRecorderReturn {
  state: RecorderState
  seconds: number
  error: string | null
  transcription: string | null
  startRecording: () => void
  stopRecording: () => void
  reset: () => void
}

const MAX_SECONDS = 60

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [transcription, setTranscription] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const startRecording = useCallback(async () => {
    setError(null)
    setTranscription(null)
    chunksRef.current = []
    setSeconds(0)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.start(1000) // collect data every second
      setState('recording')

      // Timer
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          const next = prev + 1
          if (next >= MAX_SECONDS) {
            // Auto-stop at max
            mediaRecorder.stop()
          }
          return next
        })
      }, 1000)
    } catch {
      setError('No se pudo acceder al microfono. Permite el acceso.')
      setState('idle')
    }
  }, [])

  const stopRecording = useCallback(async () => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        // Stop mic stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop())
          streamRef.current = null
        }

        setState('processing')

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        chunksRef.current = []

        // Reject tiny blobs (likely silence)
        if (blob.size < 5000) {
          setError('No se detecto voz. Habla mas fuerte e intenta de nuevo.')
          setState('idle')
          resolve()
          return
        }

        // Send to transcription API
        try {
          const formData = new FormData()
          formData.append('audio', blob, 'recording.webm')

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })

          const data = await res.json()

          if (data.error) {
            setError(data.error)
            setState('idle')
          } else {
            setTranscription(data.text)
            setState('idle')
          }
        } catch {
          setError('Error al transcribir. Intenta de nuevo.')
          setState('idle')
        }

        resolve()
      }

      mediaRecorder.stop()
    })
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setState('idle')
    setSeconds(0)
    setError(null)
    setTranscription(null)
  }, [cleanup])

  return { state, seconds, error, transcription, startRecording, stopRecording, reset }
}
