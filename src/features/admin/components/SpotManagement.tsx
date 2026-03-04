'use client'

import { useTransition } from 'react'
import { toggleSpotActive, deleteSpot } from '../actions/moderation'
import type { Spot } from '../types'

interface SpotManagementProps {
  spots: Spot[]
}

export function SpotManagement({ spots }: SpotManagementProps) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(id: string, isActive: boolean) {
    startTransition(() => toggleSpotActive(id, isActive))
  }

  function handleDelete(id: string) {
    startTransition(() => deleteSpot(id))
  }

  if (spots.length === 0) {
    return (
      <div className="card-brutal p-8 text-center">
        <span className="text-4xl block mb-2">📍</span>
        <p className="font-bold text-lg">Sin spots registrados</p>
        <p className="text-foreground-secondary">Los negocios apareceran aqui</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {spots.map(spot => (
        <div
          key={spot.id}
          className={`card-brutal p-4 ${!spot.is_active ? 'opacity-60' : ''}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{spot.emoji}</span>
                <span className="font-bold text-lg">{spot.name}</span>
                <span className="badge-brutal bg-brutal-cyan text-xs">
                  {spot.category}
                </span>
                <span className={`badge-brutal text-xs ${spot.is_active ? 'bg-brutal-lime' : 'bg-foreground-muted text-white'}`}>
                  {spot.is_active ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>

              {spot.description && (
                <p className="text-sm text-foreground-secondary mb-2">{spot.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-foreground-muted">
                <span>Ultima actividad: {new Date(spot.last_activity).toLocaleDateString('es-MX')}</span>
                <span>Creado: {new Date(spot.created_at).toLocaleDateString('es-MX')}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleToggle(spot.id, spot.is_active)}
                disabled={isPending}
                className={`btn-brutal text-xs px-3 py-1 disabled:opacity-50 ${
                  spot.is_active ? 'bg-brutal-orange' : 'bg-brutal-lime'
                }`}
              >
                {spot.is_active ? 'Desactivar' : 'Activar'}
              </button>
              <button
                onClick={() => handleDelete(spot.id)}
                disabled={isPending}
                className="btn-brutal bg-brutal-pink text-xs px-3 py-1 disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
