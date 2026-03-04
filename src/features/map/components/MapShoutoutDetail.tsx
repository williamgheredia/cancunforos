'use client'

import { useState, useTransition } from 'react'
import { type ShoutoutRow } from '@/features/feed/actions/feed-actions'
import { reactToShoutout } from '@/features/feed/actions/reaction-actions'
import { CommentSection } from '@/features/feed/components/CommentSection'
import { formatDistance, calculateDistance, getRelativeTime } from '@/shared/lib/geo-utils'

const CATEGORY_BG: Record<string, string> = {
  alerta: 'bg-red-400', trafico: 'bg-orange-400', comida: 'bg-lime-400',
  evento: 'bg-cyan-300', clima: 'bg-blue-300', oferta: 'bg-yellow-300',
  tip: 'bg-violet-300', otro: 'bg-gray-200',
}

interface MapShoutoutDetailProps {
  shoutout: ShoutoutRow
  userLat: number
  userLng: number
  sessionId: string
  alias: string
  onBack: () => void
}

export function MapShoutoutDetail({
  shoutout,
  userLat,
  userLng,
  sessionId,
  alias,
  onBack,
}: MapShoutoutDetailProps) {
  const [confirm, setConfirm] = useState(shoutout.reactions_confirm)
  const [doubt, setDoubt] = useState(shoutout.reactions_doubt)
  const [reaction, setReaction] = useState<'confirm' | 'doubt' | null>(null)
  const [isPending, startTransition] = useTransition()

  const dist = calculateDistance(userLat, userLng, shoutout.lat, shoutout.lng)
  const catBg = CATEGORY_BG[shoutout.category.toLowerCase()] ?? 'bg-gray-200'

  function handleReaction(type: 'confirm' | 'doubt') {
    if (isPending || !sessionId) return
    startTransition(async () => {
      const result = await reactToShoutout(shoutout.id, sessionId, type)
      if ('error' in result) return
      setConfirm(result.confirm)
      setDoubt(result.doubt)
      setReaction(result.userReaction)
    })
  }

  return (
    <div style={{ minWidth: 260, maxWidth: 300, maxHeight: 360, overflowY: 'auto' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontWeight: 900,
          fontSize: '11px',
          textTransform: 'uppercase',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 0 6px',
          color: '#404040',
        }}
      >
        ← VOLVER
      </button>

      {/* Category strip */}
      <div
        className={catBg}
        style={{
          padding: '4px 8px',
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          fontWeight: 800,
          fontSize: '10px',
          textTransform: 'uppercase',
          borderBottom: '2px solid #000',
          marginBottom: '6px',
        }}
      >
        {shoutout.emoji} {shoutout.category} · {formatDistance(dist)}
      </div>

      {/* Title */}
      <p style={{
        fontWeight: 900,
        fontSize: '14px',
        margin: '0 0 4px',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}>
        {shoutout.summary}
      </p>

      {/* Full text */}
      <p style={{
        fontSize: '12px',
        color: '#404040',
        margin: '0 0 6px',
        whiteSpace: 'pre-wrap',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}>
        {shoutout.text}
      </p>

      {/* Meta */}
      <p style={{
        fontSize: '10px',
        color: '#737373',
        margin: '0 0 8px',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        fontWeight: 700,
      }}>
        👤 {shoutout.alias} · {getRelativeTime(shoutout.created_at)}
      </p>

      {/* Reactions */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
        <button
          onClick={() => handleReaction('confirm')}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 900,
            fontSize: '12px',
            border: '2px solid #000',
            background: reaction === 'confirm' ? '#a3e635' : '#fff',
            boxShadow: '2px 2px 0 #000',
            cursor: 'pointer',
            opacity: reaction === 'doubt' ? 0.4 : 1,
          }}
        >
          ✅ {confirm}
        </button>
        <button
          onClick={() => handleReaction('doubt')}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 900,
            fontSize: '12px',
            border: '2px solid #000',
            background: reaction === 'doubt' ? '#fde047' : '#fff',
            boxShadow: '2px 2px 0 #000',
            cursor: 'pointer',
            opacity: reaction === 'confirm' ? 0.4 : 1,
          }}
        >
          🤔 {doubt}
        </button>
      </div>

      {/* Comments */}
      <CommentSection
        shoutoutId={shoutout.id}
        sessionId={sessionId}
        alias={alias}
      />
    </div>
  )
}
