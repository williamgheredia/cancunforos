'use client'

import { useState, useEffect, useTransition } from 'react'
import { useSessionStore } from '@/shared/stores/session-store'
import { createShoutout } from '../actions/create-shoutout'
import { useVoiceRecorder } from '../hooks/use-voice-recorder'
import { siteConfig } from '@/config/siteConfig'

interface CreateShoutoutModalProps {
  lat: number
  lng: number
  onCreated: () => void
  forceOpen?: boolean
  onForceOpenConsumed?: () => void
}

const MAX_CHARS = siteConfig.features.textMaxChars
const MIN_VOICE_SECONDS = siteConfig.features.voiceMinSeconds

type InputMode = 'text' | 'voice'

export function CreateShoutoutModal({ lat, lng, onCreated, forceOpen, onForceOpenConsumed }: CreateShoutoutModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<InputMode>('voice')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { sessionId, alias } = useSessionStore()

  const voice = useVoiceRecorder()

  // Open modal programmatically from outside
  useEffect(() => {
    if (forceOpen && !isOpen) {
      handleOpen()
      onForceOpenConsumed?.()
    }
  }, [forceOpen])

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
      {/* CAMBIO 1: FAB rectangular neobrutalism */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-4 z-40 bg-yellow-300 border-[3px] border-black shadow-[5px_5px_0_#000] px-5 py-3 font-black text-sm uppercase hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#000] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none transition-all duration-100"
        aria-label="Crear shoutout"
      >
        + SHOUTOUT
      </button>

      {/* CAMBIO 6: Modal neobrutalism */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

          <div className="w-full max-w-lg relative animate-slide-up border-[4px] border-black bg-white shadow-[8px_8px_0_#000]">
            {/* Yellow header */}
            <div className="bg-yellow-300 border-b-[3px] border-black px-5 py-3 flex items-center justify-between">
              <h2 className="font-black text-lg uppercase">Nuevo Shoutout</h2>
              <button
                onClick={handleClose}
                className="bg-black text-white font-black text-sm px-2 py-0.5 hover:bg-gray-800 transition-all duration-100"
                disabled={isPending || voice.state === 'recording'}
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              {/* Mode toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setMode('voice'); setText('') }}
                  className={`border-2 border-black px-3 py-1 font-black text-xs uppercase transition-all duration-100 ${
                    mode === 'voice'
                      ? 'bg-black text-yellow-300 translate-x-[2px] translate-y-[2px]'
                      : 'bg-orange-400 shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]'
                  }`}
                >
                  🎙️ VOZ
                </button>
                <button
                  onClick={() => { setMode('text'); voice.reset() }}
                  className={`border-2 border-black px-3 py-1 font-black text-xs uppercase transition-all duration-100 ${
                    mode === 'text'
                      ? 'bg-black text-yellow-300 translate-x-[2px] translate-y-[2px]'
                      : 'bg-cyan-300 shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]'
                  }`}
                >
                  ✏️ TEXTO
                </button>
              </div>

              {/* Alias */}
              <p className="text-xs text-gray-500 font-extrabold mb-1">
                Publicando como <span className="font-black text-black">{alias}</span>
              </p>
              <p className="text-[11px] font-medium text-gray-400 mb-3">
                💡 Promocionas un negocio? Menciona su nombre y detalles para aparecer en el filtro PROMOS
              </p>

              {mode === 'text' ? (
                /* TEXT MODE */
                <>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Que esta pasando cerca de ti?"
                    className="w-full h-32 resize-none p-3 text-sm font-medium border-[2.5px] border-black shadow-[4px_4px_0_#000] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[2px_2px_0_#000] focus:outline-none transition-all duration-100"
                    disabled={isPending}
                    autoFocus
                  />

                  <div className="flex items-center justify-between mt-2 mb-4">
                    <span className={`text-xs font-black ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
                      {charCount}/{MAX_CHARS}
                    </span>
                    {error && <span className="text-xs font-black text-red-500">{error}</span>}
                  </div>

                  <button
                    onClick={() => handleSubmit('text')}
                    disabled={!canSubmitText}
                    className="w-full bg-yellow-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] font-black uppercase px-6 py-3 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? 'CLASIFICANDO CON IA...' : 'PUBLICAR'}
                  </button>
                </>
              ) : (
                /* VOICE MODE */
                <>
                  {!voice.transcription ? (
                    <div className="text-center py-4">
                      {voice.state === 'recording' ? (
                        <>
                          <div className="relative inline-flex items-center justify-center mb-4">
                            <div className="absolute w-24 h-24 bg-red-400/30 rounded-full animate-ping" />
                            <button
                              onClick={() => voice.stopRecording()}
                              className="relative w-20 h-20 bg-red-500 border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center text-white text-3xl z-10 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] transition-all duration-100"
                            >
                              ⏹
                            </button>
                          </div>
                          <p className="font-black text-lg">
                            {voice.seconds}s
                            {voice.seconds < MIN_VOICE_SECONDS && (
                              <span className="text-gray-500 text-sm font-extrabold block">
                                minimo {MIN_VOICE_SECONDS}s
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 font-extrabold mt-1">Toca para detener</p>
                        </>
                      ) : voice.state === 'processing' ? (
                        <>
                          <span className="text-4xl block mb-3">🎙️</span>
                          <p className="font-black uppercase">Transcribiendo...</p>
                          <p className="text-xs text-gray-500 font-extrabold mt-1">Convirtiendo voz a texto</p>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => voice.startRecording()}
                            className="w-20 h-20 bg-orange-400 border-[3px] border-black shadow-[4px_4px_0_#000] flex items-center justify-center text-3xl mx-auto mb-4 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
                          >
                            🎙️
                          </button>
                          <p className="font-black uppercase">Toca para grabar</p>
                          <p className="text-xs text-gray-500 font-extrabold mt-1">
                            Minimo {MIN_VOICE_SECONDS} segundos
                          </p>
                        </>
                      )}

                      {(voice.error || error) && (
                        <p className="text-xs font-black text-red-500 mt-3">{voice.error || error}</p>
                      )}
                    </div>
                  ) : (
                    /* Transcription review */
                    <>
                      <div className="border-[2.5px] border-black bg-orange-400/10 shadow-[4px_4px_0_#000] p-3 mb-3">
                        <p className="text-xs font-black text-gray-500 mb-1 uppercase">🎙️ Transcripcion:</p>
                        <p className="text-sm font-medium">{voice.transcription}</p>
                      </div>

                      {voice.seconds < MIN_VOICE_SECONDS ? (
                        <>
                          <p className="text-xs font-black text-red-500 mb-3">
                            La grabacion fue muy corta (minimo {MIN_VOICE_SECONDS}s). Intenta de nuevo.
                          </p>
                          <button
                            onClick={() => voice.reset()}
                            className="w-full bg-white border-[2.5px] border-black shadow-[4px_4px_0_#000] font-black uppercase px-6 py-3 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] transition-all duration-100"
                          >
                            GRABAR DE NUEVO
                          </button>
                        </>
                      ) : (
                        <>
                          {error && <p className="text-xs font-black text-red-500 mb-3">{error}</p>}

                          <div className="flex gap-2">
                            <button
                              onClick={() => voice.reset()}
                              className="flex-1 bg-white border-[2.5px] border-black shadow-[4px_4px_0_#000] font-black uppercase px-4 py-3 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
                              disabled={isPending}
                            >
                              REGRABAR
                            </button>
                            <button
                              onClick={() => handleSubmit('voice')}
                              disabled={!canSubmitVoice}
                              className="flex-1 bg-yellow-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] font-black uppercase px-4 py-3 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isPending ? 'CLASIFICANDO...' : 'PUBLICAR'}
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
        </div>
      )}
    </>
  )
}
