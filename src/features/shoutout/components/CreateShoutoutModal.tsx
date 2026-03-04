'use client'

import { useState, useTransition } from 'react'
import { useSessionStore } from '@/shared/stores/session-store'
import { createShoutout } from '../actions/create-shoutout'
import { useVoiceRecorder } from '../hooks/use-voice-recorder'
import { siteConfig } from '@/config/siteConfig'

interface CreateShoutoutModalProps {
  lat: number
  lng: number
  onCreated: () => void
}

const MAX_CHARS = siteConfig.features.textMaxChars
const MIN_VOICE_SECONDS = siteConfig.features.voiceMinSeconds

type InputMode = 'text' | 'voice'

export function CreateShoutoutModal({ lat, lng, onCreated }: CreateShoutoutModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<InputMode>('text')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { sessionId, alias } = useSessionStore()

  const voice = useVoiceRecorder()

  const charCount = text.length
  const isOverLimit = charCount > MAX_CHARS
  const canSubmitText = text.trim().length > 0 && !isOverLimit && !isPending
  const canSubmitVoice = !!voice.transcription && !isPending

  function handleOpen() {
    setIsOpen(true)
    setText('')
    setError(null)
    setMode('voice')
    voice.reset()
  }

  function handleClose() {
    if (!isPending && voice.state !== 'recording') {
      setIsOpen(false)
      setText('')
      setError(null)
      voice.reset()
    }
  }

  function handleSubmit(source: 'text' | 'voice') {
    const submitText = source === 'voice' ? voice.transcription! : text.trim()
    if (!submitText) return

    startTransition(async () => {
      setError(null)
      const result = await createShoutout({
        text: submitText,
        lat,
        lng,
        sessionId,
        alias,
        source,
      })

      if ('error' in result) {
        setError(result.error)
      } else {
        setIsOpen(false)
        setText('')
        voice.reset()
        onCreated()
      }
    })
  }

  return (
    <>
      {/* FAB Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleOpen}
          className="btn-walkie bg-brutal-cyan"
          aria-label="Crear shoutout"
        >
          <span className="text-2xl">+</span>
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          <div className="card-brutal bg-white w-full max-w-lg relative animate-slide-up p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">Nuevo Shoutout</h2>
              <button
                onClick={handleClose}
                className="font-bold text-xl leading-none px-2"
                disabled={isPending || voice.state === 'recording'}
              >
                ✕
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setMode('voice'); setText('') }}
                className={`badge-brutal text-xs font-bold cursor-pointer transition-all ${
                  mode === 'voice' ? 'bg-brutal-orange border-[3px] shadow-brutal' : 'bg-white hover:bg-brutal-orange/30'
                }`}
              >
                🎙️ Voz
              </button>
              <button
                onClick={() => { setMode('text'); voice.reset() }}
                className={`badge-brutal text-xs font-bold cursor-pointer transition-all ${
                  mode === 'text' ? 'bg-brutal-cyan border-[3px] shadow-brutal' : 'bg-white hover:bg-brutal-cyan/30'
                }`}
              >
                ✏️ Texto
              </button>
            </div>

            {/* Alias */}
            <p className="text-xs text-foreground-muted font-medium mb-3">
              Publicando como <span className="font-bold text-foreground">{alias}</span>
            </p>

            {mode === 'text' ? (
              /* TEXT MODE */
              <>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Que esta pasando cerca de ti?"
                  className="input-brutal w-full h-32 resize-none p-3 text-sm"
                  disabled={isPending}
                  autoFocus
                />

                <div className="flex items-center justify-between mt-2 mb-4">
                  <span className={`text-xs font-bold ${isOverLimit ? 'text-red-500' : 'text-foreground-muted'}`}>
                    {charCount}/{MAX_CHARS}
                  </span>
                  {error && <span className="text-xs font-bold text-red-500">{error}</span>}
                </div>

                <button
                  onClick={() => handleSubmit('text')}
                  disabled={!canSubmitText}
                  className="btn-brutal bg-brutal-cyan w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Clasificando con IA...' : 'Publicar'}
                </button>
              </>
            ) : (
              /* VOICE MODE */
              <>
                {!voice.transcription ? (
                  /* Recording UI */
                  <div className="text-center py-4">
                    {voice.state === 'recording' ? (
                      <>
                        {/* Pulsing indicator */}
                        <div className="relative inline-flex items-center justify-center mb-4">
                          <div className="absolute w-24 h-24 bg-red-400/30 rounded-full animate-ping" />
                          <button
                            onClick={() => voice.stopRecording()}
                            className="relative w-20 h-20 bg-red-500 rounded-full border-3 border-black shadow-brutal flex items-center justify-center text-white text-3xl z-10"
                          >
                            ⏹
                          </button>
                        </div>
                        <p className="font-bold text-lg">
                          {voice.seconds}s
                          {voice.seconds < MIN_VOICE_SECONDS && (
                            <span className="text-foreground-muted text-sm font-medium block">
                              minimo {MIN_VOICE_SECONDS}s
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-foreground-muted mt-1">Toca para detener</p>
                      </>
                    ) : voice.state === 'processing' ? (
                      <>
                        <span className="text-4xl block mb-3">🎙️</span>
                        <p className="font-bold">Transcribiendo...</p>
                        <p className="text-xs text-foreground-muted mt-1">Convirtiendo voz a texto</p>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => voice.startRecording()}
                          className="w-20 h-20 bg-brutal-orange rounded-full border-3 border-black shadow-brutal flex items-center justify-center text-3xl mx-auto mb-4 hover:scale-105 transition-transform"
                        >
                          🎙️
                        </button>
                        <p className="font-bold">Toca para grabar</p>
                        <p className="text-xs text-foreground-muted mt-1">
                          Minimo {MIN_VOICE_SECONDS} segundos
                        </p>
                      </>
                    )}

                    {(voice.error || error) && (
                      <p className="text-xs font-bold text-red-500 mt-3">{voice.error || error}</p>
                    )}
                  </div>
                ) : (
                  /* Transcription review */
                  <>
                    <div className="card-brutal bg-brutal-orange/10 p-3 mb-3">
                      <p className="text-xs font-bold text-foreground-muted mb-1">🎙️ Transcripcion:</p>
                      <p className="text-sm">{voice.transcription}</p>
                    </div>

                    {voice.seconds < MIN_VOICE_SECONDS ? (
                      <>
                        <p className="text-xs font-bold text-red-500 mb-3">
                          La grabacion fue muy corta (minimo {MIN_VOICE_SECONDS}s). Intenta de nuevo.
                        </p>
                        <button
                          onClick={() => voice.reset()}
                          className="btn-brutal bg-white w-full"
                        >
                          Grabar de nuevo
                        </button>
                      </>
                    ) : (
                      <>
                        {error && <p className="text-xs font-bold text-red-500 mb-3">{error}</p>}

                        <div className="flex gap-2">
                          <button
                            onClick={() => voice.reset()}
                            className="btn-brutal bg-white flex-1"
                            disabled={isPending}
                          >
                            Regrabar
                          </button>
                          <button
                            onClick={() => handleSubmit('voice')}
                            disabled={!canSubmitVoice}
                            className="btn-brutal bg-brutal-cyan flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isPending ? 'Clasificando...' : 'Publicar'}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
