'use client'

import { useState, useTransition } from 'react'
import type { ShoutoutRow } from '../actions/feed-actions'
import { reactToShoutout } from '../actions/reaction-actions'
import { reportShoutout } from '../actions/report-actions'
import { calculateDistance, formatDistance, getRelativeTime } from '@/shared/lib/geo-utils'

const REPORT_REASONS = [
  { value: 'spam' as const, label: '🚫 Spam' },
  { value: 'ofensivo' as const, label: '🤬 Ofensivo' },
  { value: 'falso' as const, label: '❌ Informacion falsa' },
  { value: 'otro' as const, label: '📝 Otro' },
]

interface ShoutoutCardProps {
  shoutout: ShoutoutRow
  userLat: number
  userLng: number
  sessionId: string
  userReaction?: 'confirm' | 'doubt' | null
}

export function ShoutoutCard({ shoutout, userLat, userLng, sessionId, userReaction }: ShoutoutCardProps) {
  const distance = calculateDistance(userLat, userLng, shoutout.lat, shoutout.lng)
  const [confirm, setConfirm] = useState(shoutout.reactions_confirm)
  const [doubt, setDoubt] = useState(shoutout.reactions_doubt)
  const [reaction, setReaction] = useState<'confirm' | 'doubt' | null>(userReaction ?? null)
  const [isPending, startTransition] = useTransition()

  // Report state
  const [showReport, setShowReport] = useState(false)
  const [reported, setReported] = useState(false)
  const [reportPending, startReportTransition] = useTransition()

  function handleReact(type: 'confirm' | 'doubt') {
    if (isPending || reaction === type) return

    const prevReaction = reaction
    const prevConfirm = confirm
    const prevDoubt = doubt

    if (prevReaction) {
      setConfirm(c => c + (type === 'confirm' ? 1 : -1))
      setDoubt(d => d + (type === 'doubt' ? 1 : -1))
    } else {
      if (type === 'confirm') setConfirm(c => c + 1)
      else setDoubt(d => d + 1)
    }
    setReaction(type)

    startTransition(async () => {
      const result = await reactToShoutout(shoutout.id, sessionId, type)
      if ('error' in result) {
        setConfirm(prevConfirm)
        setDoubt(prevDoubt)
        setReaction(prevReaction)
      } else {
        setConfirm(result.confirm)
        setDoubt(result.doubt)
        setReaction(result.userReaction)
      }
    })
  }

  function handleReport(reason: 'spam' | 'ofensivo' | 'falso' | 'otro') {
    startReportTransition(async () => {
      const result = await reportShoutout(shoutout.id, sessionId, reason)
      if ('success' in result) {
        setReported(true)
      }
      setShowReport(false)
    })
  }

  return (
    <div className="shoutout-card animate-slide-up relative">
      <div className="flex items-start gap-3">
        <span className="text-3xl">{shoutout.emoji}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="badge-brutal bg-brutal-cyan text-xs">
                {shoutout.category}
              </span>
              <span className="text-xs text-foreground-muted font-medium">
                {shoutout.source === 'voice' ? '🎙️' : '✏️'}
              </span>
            </div>

            {/* Report button */}
            {!reported ? (
              <button
                onClick={() => setShowReport(!showReport)}
                disabled={reportPending}
                className="text-foreground-muted hover:text-foreground text-xs px-1 disabled:opacity-50"
                aria-label="Reportar"
              >
                🚩
              </button>
            ) : (
              <span className="text-xs text-foreground-muted">Reportado</span>
            )}
          </div>

          <p className="font-bold text-sm mb-1">{shoutout.summary}</p>
          <p className="text-sm text-foreground-secondary line-clamp-2">{shoutout.text}</p>

          <div className="flex items-center gap-3 mt-2 text-xs text-foreground-muted font-medium">
            <span>👤 {shoutout.alias}</span>
            <span>📍 {formatDistance(distance)}</span>
            <span>🕐 {getRelativeTime(shoutout.created_at)}</span>
          </div>

          {/* Reaction buttons */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => handleReact('confirm')}
              disabled={isPending}
              className={`badge-brutal text-xs cursor-pointer transition-all ${
                reaction === 'confirm'
                  ? 'bg-brutal-lime border-[3px] shadow-brutal'
                  : 'bg-brutal-lime/50 hover:bg-brutal-lime'
              } disabled:opacity-50`}
            >
              ✅ {confirm}
            </button>
            <button
              onClick={() => handleReact('doubt')}
              disabled={isPending}
              className={`badge-brutal text-xs cursor-pointer transition-all ${
                reaction === 'doubt'
                  ? 'bg-brutal-yellow border-[3px] shadow-brutal'
                  : 'bg-brutal-yellow/50 hover:bg-brutal-yellow'
              } disabled:opacity-50`}
            >
              🤔 {doubt}
            </button>
          </div>

          {/* Report popover */}
          {showReport && (
            <div className="mt-2 card-brutal bg-white p-3 animate-fade-in">
              <p className="text-xs font-bold mb-2">Motivo del reporte:</p>
              <div className="flex flex-wrap gap-2">
                {REPORT_REASONS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => handleReport(r.value)}
                    disabled={reportPending}
                    className="badge-brutal bg-brutal-pink/30 hover:bg-brutal-pink text-xs cursor-pointer disabled:opacity-50"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
