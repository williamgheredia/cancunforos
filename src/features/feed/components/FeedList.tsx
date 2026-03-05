'use client'

import { useEffect, useState, useCallback } from 'react'
import { getActiveShoutouts, type ShoutoutRow } from '../actions/feed-actions'
import { getUserReactions } from '../actions/reaction-actions'
import { ShoutoutCard } from './ShoutoutCard'
import { useSessionStore } from '@/shared/stores/session-store'
import { siteConfig } from '@/config/siteConfig'
import { getNearbyPeopleCount } from '@/features/people/actions/people-actions'

interface FeedListProps {
  lat: number
  lng: number
  onGoToPersonas?: () => void
}

export function FeedList({ lat, lng, onGoToPersonas }: FeedListProps) {
  const [shoutouts, setShoutouts] = useState<ShoutoutRow[]>([])
  const [reactions, setReactions] = useState<Record<string, 'confirm' | 'doubt'>>({})
  const [loading, setLoading] = useState(true)
  const [peopleCount, setPeopleCount] = useState(0)
  const { sessionId, alias } = useSessionStore()

  const fetchShoutouts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getActiveShoutouts(lat, lng, siteConfig.features.radiusKm)
      setShoutouts(data)

      if (sessionId && data.length > 0) {
        const ids = data.map(s => s.id)
        const userReactions = await getUserReactions(ids, sessionId)
        setReactions(userReactions)
      }
    } catch {
      setShoutouts([])
    } finally {
      setLoading(false)
    }
  }, [lat, lng, sessionId])

  useEffect(() => {
    fetchShoutouts()
  }, [fetchShoutouts])

  // Fetch people count
  useEffect(() => {
    if (sessionId) {
      getNearbyPeopleCount(lat, lng, siteConfig.features.radiusKm, sessionId)
        .then(setPeopleCount)
        .catch(() => setPeopleCount(0))
    }
  }, [lat, lng, sessionId])

  if (loading) {
    return (
      <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
        <span className="text-4xl block mb-2">📡</span>
        <p className="font-black uppercase">Buscando shoutouts cerca de ti...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Shoutouts status banner */}
      <div className="bg-cyan-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-3 py-2 mb-3 flex items-center justify-between">
        <span className="font-black text-sm uppercase">
          📡 {shoutouts.length} SHOUTOUT{shoutouts.length !== 1 ? 'S' : ''} CERCA DE TI
        </span>
        <button
          onClick={() => fetchShoutouts()}
          className="bg-lime-400 border-2 border-black px-2 py-0.5 font-black text-xs shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
        >
          EN VIVO 🟢
        </button>
      </div>

      {/* People banner */}
      {onGoToPersonas && (
        <button
          onClick={onGoToPersonas}
          className="w-full bg-violet-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-3 py-2 mb-3 flex items-center justify-between hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
        >
          <span className="font-black text-sm uppercase">
            👤 {peopleCount} PERSONA{peopleCount !== 1 ? 'S' : ''} CERCA DE TI
          </span>
          <span className="font-black text-xs uppercase">
            VER →
          </span>
        </button>
      )}

      {shoutouts.length === 0 ? (
        <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center">
          <span className="text-5xl block mb-3">📡</span>
          <p className="font-black text-xl mb-2 uppercase">Sin shoutouts por aqui</p>
          <p className="font-medium text-gray-600">
            Se el primero en compartir lo que esta pasando en tu zona
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shoutouts.map(shoutout => (
            <ShoutoutCard
              key={shoutout.id}
              shoutout={shoutout}
              userLat={lat}
              userLng={lng}
              sessionId={sessionId}
              alias={alias}
              userReaction={reactions[shoutout.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
