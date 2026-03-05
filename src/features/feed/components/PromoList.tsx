'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPromoShoutouts, type ShoutoutRow } from '../actions/feed-actions'
import { getUserReactions } from '../actions/reaction-actions'
import { ShoutoutCard } from './ShoutoutCard'
import { useSessionStore } from '@/shared/stores/session-store'
import { siteConfig } from '@/config/siteConfig'

interface PromoListProps {
  lat: number
  lng: number
  onViewOnMap?: (shoutout: ShoutoutRow) => void
}

const PAGE_SIZE = 12

export function PromoList({ lat, lng, onViewOnMap }: PromoListProps) {
  const [shoutouts, setShoutouts] = useState<ShoutoutRow[]>([])
  const [reactions, setReactions] = useState<Record<string, 'confirm' | 'doubt'>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const { sessionId, alias } = useSessionStore()

  const fetchShoutouts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getPromoShoutouts(lat, lng, siteConfig.features.radiusKm, PAGE_SIZE, 0)
      setShoutouts(result.data)
      setHasMore(result.hasMore)
      if (sessionId && result.data.length > 0) {
        const ids = result.data.map(s => s.id)
        const userReactions = await getUserReactions(ids, sessionId)
        setReactions(userReactions)
      }
    } catch {
      setShoutouts([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [lat, lng, sessionId])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const result = await getPromoShoutouts(lat, lng, siteConfig.features.radiusKm, PAGE_SIZE, shoutouts.length)
      setShoutouts(prev => [...prev, ...result.data])
      setHasMore(result.hasMore)
      if (sessionId && result.data.length > 0) {
        const ids = result.data.map(s => s.id)
        const userReactions = await getUserReactions(ids, sessionId)
        setReactions(prev => ({ ...prev, ...userReactions }))
      }
    } catch {
      // silent
    } finally {
      setLoadingMore(false)
    }
  }, [lat, lng, sessionId, shoutouts, loadingMore, hasMore])

  useEffect(() => {
    fetchShoutouts()
  }, [fetchShoutouts])

  if (loading) {
    return (
      <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
        <span className="text-4xl block mb-2">📣</span>
        <p className="font-black uppercase">Buscando promociones...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-red-500 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-3 py-2 mb-3 flex items-center justify-between">
        <span className="font-black text-sm uppercase text-white">
          📣 {shoutouts.length} PROMOCION{shoutouts.length !== 1 ? 'ES' : ''} CERCA DE TI
        </span>
        <button
          onClick={() => fetchShoutouts()}
          className="bg-white border-2 border-black px-2 py-0.5 font-black text-xs shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] transition-all duration-100"
        >
          ACTUALIZAR 🔄
        </button>
      </div>

      {shoutouts.length === 0 ? (
        <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center">
          <span className="text-5xl block mb-3">📣</span>
          <p className="font-black text-xl mb-2 uppercase">Sin promociones por aqui</p>
          <p className="font-medium text-gray-600">
            Aun no hay promociones de negocios en tu zona
          </p>
        </div>
      ) : (
        <>
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
                onViewOnMap={onViewOnMap}
              />
            ))}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full mt-4 bg-red-400 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-4 py-3 font-black text-sm uppercase text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100 disabled:opacity-50"
            >
              {loadingMore ? 'CARGANDO...' : 'CARGAR MAS PROMOS'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
