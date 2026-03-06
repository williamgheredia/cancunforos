'use client'

import { useState, useEffect, useRef } from 'react'
import { createPin, verifyPin, hasPin } from '../actions/pin-actions'
import { useSessionStore } from '@/shared/stores/session-store'

const PIN_STORAGE_KEY = 'cancunforos-inbox-pin'

interface PinGateProps {
  children: React.ReactNode
  onPinReady: (pin: string) => void
}

export function usePinStore() {
  const getPin = () => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem(PIN_STORAGE_KEY)
  }

  const setPin = (pin: string) => {
    sessionStorage.setItem(PIN_STORAGE_KEY, pin)
  }

  const clearPin = () => {
    sessionStorage.removeItem(PIN_STORAGE_KEY)
  }

  return { getPin, setPin, clearPin }
}

type GateState = 'loading' | 'create' | 'enter' | 'unlocked'

export function PinGate({ children, onPinReady }: PinGateProps) {
  const { sessionId } = useSessionStore()
  const { getPin, setPin } = usePinStore()
  const [state, setState] = useState<GateState>('loading')
  const [pin, setPinValue] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!sessionId) return

    async function check() {
      const storedPin = getPin()
      const userHasPin = await hasPin(sessionId)

      if (userHasPin && storedPin) {
        const valid = await verifyPin(sessionId, storedPin)
        if (valid) {
          setState('unlocked')
          onPinReady(storedPin)
          return
        }
      }

      setState(userHasPin ? 'enter' : 'create')
    }
    check()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  useEffect(() => {
    if (state === 'create' || state === 'enter') {
      inputRef.current?.focus()
    }
  }, [state])

  async function handleCreate() {
    setError('')
    if (!/^\d{4}$/.test(pin)) {
      setError('El PIN debe ser de 4 digitos')
      return
    }
    if (pin !== confirmPin) {
      setError('Los PINs no coinciden')
      return
    }

    setIsSubmitting(true)
    const result = await createPin(sessionId, pin)
    setIsSubmitting(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    setPin(pin)
    setState('unlocked')
    onPinReady(pin)
  }

  async function handleVerify() {
    setError('')
    if (!/^\d{4}$/.test(pin)) {
      setError('El PIN debe ser de 4 digitos')
      return
    }

    setIsSubmitting(true)
    const valid = await verifyPin(sessionId, pin)
    setIsSubmitting(false)

    if (!valid) {
      setError('PIN incorrecto')
      setPinValue('')
      inputRef.current?.focus()
      return
    }

    setPin(pin)
    setState('unlocked')
    onPinReady(pin)
  }

  if (state === 'loading') {
    return (
      <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
        <span className="text-4xl block mb-2">🔐</span>
        <p className="font-black uppercase">Verificando acceso...</p>
      </div>
    )
  }

  if (state === 'unlocked') {
    return <>{children}</>
  }

  const isCreating = state === 'create'

  return (
    <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-6 text-center animate-fade-in">
      <span className="text-5xl block mb-3">🔐</span>
      <h2 className="font-black text-xl mb-1 uppercase">
        {isCreating ? 'Protege tu Inbox' : 'Ingresa tu PIN'}
      </h2>
      <p className="font-medium text-sm text-gray-600 mb-4">
        {isCreating
          ? 'Crea un PIN de 4 digitos para proteger tus mensajes'
          : 'Ingresa tu PIN de 4 digitos para ver tus mensajes'}
      </p>

      <div className="max-w-[200px] mx-auto space-y-3">
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={e => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (isCreating && pin.length === 4 && !confirmPin) {
                // Focus confirm input - handled by tab
              } else if (!isCreating) {
                handleVerify()
              }
            }
          }}
          placeholder="----"
          className="w-full text-center text-2xl tracking-[0.5em] font-black border-[2.5px] border-black px-3 py-2 shadow-[3px_3px_0_#000] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[1px_1px_0_#000] focus:outline-none transition-all duration-100"
          disabled={isSubmitting}
        />

        {isCreating && (
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Confirma"
            className="w-full text-center text-2xl tracking-[0.5em] font-black border-[2.5px] border-black px-3 py-2 shadow-[3px_3px_0_#000] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[1px_1px_0_#000] focus:outline-none transition-all duration-100"
            disabled={isSubmitting}
          />
        )}

        {error && (
          <p className="text-red-600 font-black text-sm">{error}</p>
        )}

        <button
          onClick={isCreating ? handleCreate : handleVerify}
          disabled={isSubmitting || pin.length !== 4 || (isCreating && confirmPin.length !== 4)}
          className="w-full bg-yellow-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-4 py-2 font-black uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100 disabled:opacity-50"
        >
          {isSubmitting ? '...' : isCreating ? 'CREAR PIN' : 'ENTRAR'}
        </button>
      </div>
    </div>
  )
}
