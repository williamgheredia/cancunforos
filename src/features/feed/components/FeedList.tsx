'use client'

import { useEffect, useState, useCallback } from 'react'
import { getActiveShoutouts, type ShoutoutRow } from '../actions/feed-actions'
import { getUserReactions } from '../actions/reaction-actions'
import { ShoutoutCard } from './ShoutoutCard'
import { useSessionStore } from '@/shared/stores/session-store'
import { siteConfig } from '@/config/siteConfig'

interface FeedListProps {
  lat: number
  lng: number
}

export function FeedList({ lat, lng }: FeedListProps) {
  const [shoutouts, setShoutouts] = useState<ShoutoutRow[]>([])
  const [reactions, setReactions] = useState<Record<string, 'confirm' | 'doubt'>>({})
  const [loading, setLoading] = useState(true)
  const { sessionId } = useSessionStore()

  const fetchShoutouts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getActiveShoutouts(lat, lng, siteConfig.features.radiusKm)
      setShoutouts(data)

      // Fetch user's reactions for these shoutouts
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

  function handleRefresh() {
    fetchShoutouts()
  }

  if (loading) {
    return (
      <div className="card-brutal p-8 text-center animate-fade-in">
        <span className="text-4xl block mb-2">📡</span>
        <p className="font-bold">Buscando shoutouts cerca de ti...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-foreground-secondary">
          {shoutouts.length} shoutout{shoutouts.length !== 1 ? 's' : ''} en {siteConfig.features.radiusKm}km
        </p>
        <button
          onClick={handleRefresh}
          className="btn-brutal bg-white text-xs px-3 py-1"
        >
          🔄 Actualizar
        </button>
      </div>

      {shoutouts.length === 0 ? (
        <div className="card-brutal p-8 text-center">
          <span className="text-5xl block mb-3">📡</span>
          <p className="font-bold text-xl mb-2">Sin shoutouts por aqui... todavia</p>
          <p className="text-foreground-secondary font-medium">
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
              userReaction={reactions[shoutout.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
