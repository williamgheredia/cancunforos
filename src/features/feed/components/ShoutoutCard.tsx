'use client'

import { useState, useTransition } from 'react'
import type { ShoutoutRow } from '../actions/feed-actions'
import { reactToShoutout } from '../actions/reaction-actions'
import { reportShoutout } from '../actions/report-actions'
import { CommentSection } from './CommentSection'
import { calculateDistance, formatDistance, getRelativeTime } from '@/shared/lib/geo-utils'

const REPORT_REASONS = [
  { value: 'spam' as const, label: '🚫 Spam' },
  { value: 'ofensivo' as const, label: '🤬 Ofensivo' },
  { value: 'falso' as const, label: '❌ Info falsa' },
  { value: 'otro' as const, label: '📝 Otro' },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  alerta:  { bg: 'bg-red-400', text: 'text-white' },
  trafico: { bg: 'bg-orange-400', text: 'text-black' },
  comida:  { bg: 'bg-lime-400', text: 'text-black' },
  evento:  { bg: 'bg-cyan-300', text: 'text-black' },
  clima:   { bg: 'bg-blue-300', text: 'text-black' },
  oferta:  { bg: 'bg-yellow-300', text: 'text-black' },
  tip:     { bg: 'bg-violet-300', text: 'text-black' },
  otro:    { bg: 'bg-gray-200', text: 'text-black' },
}

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.otro
}

interface ShoutoutCardProps {
  shoutout: ShoutoutRow
  userLat: number
  userLng: number
  sessionId: string
  alias: string
  userReaction?: 'confirm' | 'doubt' | null
}

export function ShoutoutCard({ shoutout, userLat, userLng, sessionId, alias, userReaction }: ShoutoutCardProps) {
  const distance = calculateDistance(userLat, userLng, shoutout.lat, shoutout.lng)
  const [expanded, setExpanded] = useState(false)
  const [confirm, setConfirm] = useState(shoutout.reactions_confirm)
  const [doubt, setDoubt] = useState(shoutout.reactions_doubt)
  const [commentsCount, setCommentsCount] = useState(shoutout.comments_count)
  const [reaction, setReaction] = useState<'confirm' | 'doubt' | null>(userReaction ?? null)
  const [isPending, startTransition] = useTransition()

  const [showReport, setShowReport] = useState(false)
  const [reported, setReported] = useState(false)
  const [reportPending, startReportTransition] = useTransition()

  const catStyle = getCategoryStyle(shoutout.category)
  const titleAndTextSame = shoutout.summary.toLowerCase() === shoutout.text.toLowerCase()

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
      {/* Category color strip */}
      <div className={`${catStyle.bg} border-b-[2.5px] border-black px-3 py-1 flex items-center justify-between`}>
        <span className={`font-black text-xs flex items-center gap-2 uppercase ${catStyle.text}`}>
          {shoutout.emoji} {shoutout.category}
          <span className="font-medium normal-case">
            {shoutout.source === 'voice' ? '🎙️' : '✏️'}
          </span>
        </span>
        <span className="bg-black text-white font-black text-xs px-2 py-0.5">
          📍 {formatDistance(distance)}
        </span>
      </div>

      {/* Card body */}
      <div
        className="cursor-pointer p-4"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Title + description separated */}
        <p className="font-black text-base leading-tight">{shoutout.summary}</p>

        {!expanded && !titleAndTextSame && (
          <p className="font-medium text-sm text-gray-600 mt-1 line-clamp-1">{shoutout.text}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 font-extrabold">
          <span>👤 {shoutout.alias}</span>
          <span>🕐 {getRelativeTime(shoutout.created_at)}</span>
          <span>💬 {commentsCount}</span>
          <span className="ml-auto text-gray-400">{expanded ? '▲' : '▼'}</span>
        </div>

        {/* Reaction buttons */}
        <div className="flex items-center gap-3 mt-3" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleReact('confirm')}
            disabled={isPending}
            className={`border-2 border-black px-3 py-1 font-black text-xs cursor-pointer transition-all duration-100 ${
              reaction === 'confirm'
                ? 'bg-lime-400 shadow-[3px_3px_0_#000] translate-x-0 translate-y-0'
                : 'bg-lime-400/40 shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]'
            } disabled:opacity-50`}
          >
            ✅ {confirm}
          </button>
          <button
            onClick={() => handleReact('doubt')}
            disabled={isPending}
            className={`border-2 border-black px-3 py-1 font-black text-xs cursor-pointer transition-all duration-100 ${
              reaction === 'doubt'
                ? 'bg-yellow-300 shadow-[3px_3px_0_#000] translate-x-0 translate-y-0'
                : 'bg-yellow-300/40 shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]'
            } disabled:opacity-50`}
          >
            🤔 {doubt}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="border-t-2 border-black/10 pt-3">
            {!titleAndTextSame && (
              <p className="font-medium text-sm text-gray-600 whitespace-pre-wrap">{shoutout.text}</p>
            )}

            {/* Report */}
            <div className="flex justify-end mt-2" onClick={e => e.stopPropagation()}>
              {!reported ? (
                <button
                  onClick={() => setShowReport(!showReport)}
                  disabled={reportPending}
                  className="bg-black/5 border-2 border-black px-2 py-0.5 font-extrabold text-xs hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] shadow-[2px_2px_0_#000] transition-all duration-100 disabled:opacity-50"
                >
                  🚩 REPORTAR
                </button>
              ) : (
                <span className="text-xs font-extrabold text-gray-400">REPORTADO</span>
              )}
            </div>

            {showReport && (
              <div className="mt-2 border-2 border-black bg-white p-3 shadow-[4px_4px_0_#000] animate-fade-in" onClick={e => e.stopPropagation()}>
                <p className="text-xs font-black mb-2 uppercase">Motivo del reporte:</p>
                <div className="flex flex-wrap gap-2">
                  {REPORT_REASONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => handleReport(r.value)}
                      disabled={reportPending}
                      className="bg-red-400/20 border-2 border-black px-2 py-1 font-extrabold text-xs shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] transition-all duration-100 cursor-pointer disabled:opacity-50"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div onClick={e => e.stopPropagation()}>
              <CommentSection
                shoutoutId={shoutout.id}
                sessionId={sessionId}
                alias={alias}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
