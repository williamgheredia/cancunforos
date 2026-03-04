'use client'

import { useTransition } from 'react'
import { deleteShoutout, collapseShoutout } from '../actions/moderation'
import type { ReportedShoutout } from '../types'

interface ShoutoutModerationListProps {
  shoutouts: ReportedShoutout[]
}

export function ShoutoutModerationList({ shoutouts }: ShoutoutModerationListProps) {
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    startTransition(() => deleteShoutout(id))
  }

  function handleCollapse(id: string) {
    startTransition(() => collapseShoutout(id))
  }

  if (shoutouts.length === 0) {
    return (
      <div className="card-brutal p-8 text-center">
        <span className="text-4xl block mb-2">✅</span>
        <p className="font-bold text-lg">Sin shoutouts reportados</p>
        <p className="text-foreground-secondary">Todo limpio por ahora</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {shoutouts.map(shoutout => (
        <div
          key={shoutout.id}
          className={`card-brutal p-4 ${shoutout.is_collapsed ? 'opacity-60' : ''}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{shoutout.emoji}</span>
                <span className="badge-brutal bg-brutal-orange text-xs">
                  {shoutout.category}
                </span>
                <span className="badge-brutal bg-brutal-pink text-xs">
                  🚩 {shoutout.reports_count} reportes
                </span>
                {shoutout.is_collapsed && (
                  <span className="badge-brutal bg-foreground text-white text-xs">
                    COLAPSADO
                  </span>
                )}
              </div>

              <p className="font-bold mb-1">{shoutout.summary}</p>
              <p className="text-sm text-foreground-secondary mb-2">{shoutout.text}</p>

              <div className="flex items-center gap-4 text-xs text-foreground-muted">
                <span>👤 {shoutout.alias}</span>
                <span>📡 {shoutout.source}</span>
                <span>✅ {shoutout.reactions_confirm} · 🤔 {shoutout.reactions_doubt}</span>
                <span>{new Date(shoutout.created_at).toLocaleString('es-MX')}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {!shoutout.is_collapsed && (
                <button
                  onClick={() => handleCollapse(shoutout.id)}
                  disabled={isPending}
                  className="btn-brutal bg-brutal-yellow text-xs px-3 py-1 disabled:opacity-50"
                >
                  Colapsar
                </button>
              )}
              <button
                onClick={() => handleDelete(shoutout.id)}
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
