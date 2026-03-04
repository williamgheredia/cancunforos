'use client'

import { useState, useTransition } from 'react'
import { useSessionStore } from '@/shared/stores/session-store'
import { createSpot } from '../actions/create-spot'

interface CreateSpotModalProps {
  lat: number
  lng: number
  onCreated: () => void
}

export function CreateSpotModal({ lat, lng, onCreated }: CreateSpotModalProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const sessionId = useSessionStore(s => s.sessionId)

  function handleSubmit() {
    if (!name.trim() || !sessionId) return
    setError(null)

    startTransition(async () => {
      const result = await createSpot({
        name: name.trim(),
        description: description.trim() || undefined,
        lat,
        lng,
        sessionId,
      })

      if ('error' in result) {
        setError(result.error)
      } else {
        setName('')
        setDescription('')
        setOpen(false)
        onCreated()
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-brutal bg-brutal-yellow text-sm"
      >
        📌 Agregar Spot
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setOpen(false)}
          />

          <div className="relative w-full max-w-lg mx-4 mb-4 card-brutal bg-white p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black">📌 Nuevo Spot</h2>
              <button
                onClick={() => !isPending && setOpen(false)}
                className="text-foreground-muted hover:text-foreground font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-foreground-muted font-medium mb-3">
              Marca un negocio o lugar permanente en el mapa
            </p>

            {/* Name input */}
            <div className="mb-3">
              <label className="block text-sm font-bold mb-1">Nombre *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Tacos Don Pepe"
                maxLength={80}
                className="w-full border-3 border-black rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brutal-cyan"
                disabled={isPending}
              />
              <span className="text-xs text-foreground-muted font-medium">
                {name.length}/80
              </span>
            </div>

            {/* Description input */}
            <div className="mb-3">
              <label className="block text-sm font-bold mb-1">Descripcion</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ej: Los mejores tacos al pastor de la zona hotelera"
                maxLength={280}
                rows={2}
                className="w-full border-3 border-black rounded-xl px-3 py-2 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-brutal-cyan"
                disabled={isPending}
              />
              <span className="text-xs text-foreground-muted font-medium">
                {description.length}/280
              </span>
            </div>

            {error && (
              <p className="text-sm text-red-600 font-bold mb-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isPending || !name.trim()}
              className="w-full btn-brutal bg-brutal-yellow disabled:opacity-50"
            >
              {isPending ? '📡 Clasificando y guardando...' : '📌 Crear Spot'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
