'use client'

import { useEffect, useState, useCallback } from 'react'
import { getActiveShoutouts, getPromoShoutouts, getMyShoutouts, type ShoutoutRow, type FeedSort } from '../actions/feed-actions'
import { getUserReactions } from '../actions/reaction-actions'
import { ShoutoutCard } from './ShoutoutCard'
import { useSessionStore } from '@/shared/stores/session-store'
import { siteConfig } from '@/config/siteConfig'
import { getNearbyPeople, getNearbyPeopleCount, type PersonRow } from '@/features/people/actions/people-actions'
import { calculateDistance, formatDistance } from '@/shared/lib/geo-utils'

interface FeedListProps {
  lat: number
  lng: number
  myShoutoutsMode?: boolean
  onExitMyShoutouts?: () => void
  onViewOnMap?: (shoutout: ShoutoutRow) => void
  onSendInbox?: (sessionId: string, alias: string) => void
}

const SORT_OPTIONS: { key: FeedSort; label: string }[] = [
  { key: 'newest', label: 'NUEVOS' },
  { key: 'top', label: 'TOP' },
  { key: 'oldest', label: 'ANTIGUOS' },
  { key: 'promos', label: '📣 PROMOS' },
]

const RANGE_OPTIONS = [
  { km: 5, label: '5 KM' },
  { km: 10, label: '10 KM' },
  { km: 20, label: '20 KM' },
]

const PAGE_SIZE = 12

export function FeedList({ lat, lng, myShoutoutsMode, onExitMyShoutouts, onViewOnMap, onSendInbox }: FeedListProps) {
  const [shoutouts, setShoutouts] = useState<ShoutoutRow[]>([])
  const [reactions, setReactions] = useState<Record<string, 'confirm' | 'doubt'>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [sortBy, setSortBy] = useState<FeedSort>('newest')
  const [peopleCount, setPeopleCount] = useState(0)
  const [showPeople, setShowPeople] = useState(false)
  const [people, setPeople] = useState<PersonRow[]>([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleRange, setPeopleRange] = useState(5)
  const { sessionId, alias } = useSessionStore()

  const fetchShoutouts = useCallback(async () => {
    setLoading(true)
    try {
      if (myShoutoutsMode && sessionId) {
        const data = await getMyShoutouts(sessionId)
        setShoutouts(data)
        setHasMore(false)
        if (sessionId && data.length > 0) {
          const ids = data.map(s => s.id)
          const userReactions = await getUserReactions(ids, sessionId)
          setReactions(userReactions)
        }
      } else {
        const result = sortBy === 'promos'
          ? await getPromoShoutouts(lat, lng, siteConfig.features.radiusKm, PAGE_SIZE, 0)
          : await getActiveShoutouts(lat, lng, siteConfig.features.radiusKm, sortBy, PAGE_SIZE, 0)
        setShoutouts(result.data)
        setHasMore(result.hasMore)
        if (sessionId && result.data.length > 0) {
          const ids = result.data.map(s => s.id)
          const userReactions = await getUserReactions(ids, sessionId)
          setReactions(userReactions)
        }
      }
    } catch {
      setShoutouts([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [lat, lng, sessionId, sortBy, myShoutoutsMode])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const result = sortBy === 'promos'
        ? await getPromoShoutouts(lat, lng, siteConfig.features.radiusKm, PAGE_SIZE, shoutouts.length)
        : await getActiveShoutouts(lat, lng, siteConfig.features.radiusKm, sortBy, PAGE_SIZE, shoutouts.length)
      const newShoutouts = [...shoutouts, ...result.data]
      setShoutouts(newShoutouts)
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
  }, [lat, lng, sessionId, sortBy, shoutouts, loadingMore, hasMore])

  useEffect(() => {
    fetchShoutouts()
  }, [fetchShoutouts])

  // Fetch people count for banner
  useEffect(() => {
    if (sessionId && !myShoutoutsMode) {
      getNearbyPeopleCount(lat, lng, siteConfig.features.radiusKm, sessionId)
        .then(setPeopleCount)
        .catch(() => setPeopleCount(0))
    }
  }, [lat, lng, sessionId, myShoutoutsMode])

  // Fetch people list when showing or range changes
  const fetchPeople = useCallback(async () => {
    if (!sessionId) return
    setPeopleLoading(true)
    try {
      const data = await getNearbyPeople(lat, lng, peopleRange, sessionId)
      const sorted = data.sort((a, b) => {
        const distA = calculateDistance(lat, lng, a.lat, a.lng)
        const distB = calculateDistance(lat, lng, b.lat, b.lng)
        return distA - distB
      })
      setPeople(sorted)
    } catch {
      setPeople([])
    } finally {
      setPeopleLoading(false)
    }
  }, [lat, lng, sessionId, peopleRange])

  useEffect(() => {
    if (showPeople) fetchPeople()
  }, [showPeople, fetchPeople])

  if (loading) {
    return (
      <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
        <span className="text-4xl block mb-2">{myShoutoutsMode ? '📢' : '📡'}</span>
        <p className="font-black uppercase">
          {myShoutoutsMode ? 'Cargando tus shoutouts...' : 'Buscando shoutouts cerca de ti...'}
        </p>
      </div>
    )
  }

  // Inline people list view (mobile only - hidden on lg: where sidebar shows people)
  if (showPeople && !myShoutoutsMode) {
    return (
      <div>
        <div className="bg-violet-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-3 py-2 mb-3 flex items-center justify-between">
          <span className="font-black text-sm uppercase">👤 PERSONAS CERCA</span>
          <button
            onClick={() => setShowPeople(false)}
            className="bg-white border-2 border-black px-2 py-0.5 font-black text-xs shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] transition-all duration-100"
          >
            ← VOLVER AL FEED
          </button>
        </div>

        {/* Range filters */}
        <div className="flex gap-2 mb-3">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.km}
              onClick={() => setPeopleRange(opt.km)}
              className={`border-2 border-black px-2 py-0.5 font-black text-xs uppercase transition-all duration-100 ${
                peopleRange === opt.km
                  ? 'bg-black text-yellow-300 translate-x-[1px] translate-y-[1px]'
                  : 'bg-white shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {peopleLoading ? (
          <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
            <span className="text-4xl block mb-2">👤</span>
            <p className="font-black uppercase">Buscando personas...</p>
          </div>
        ) : people.length === 0 ? (
          <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center">
            <span className="text-5xl block mb-3">👤</span>
            <p className="font-black text-xl mb-2 uppercase">Sin personas cerca</p>
            <p className="font-medium text-gray-600">No hay nadie activo en un rango de {peopleRange}km</p>
          </div>
        ) : (
          <div className="space-y-2">
            {people.map(person => {
              const dist = calculateDistance(lat, lng, person.lat, person.lng)
              return (
                <div
                  key={person.id}
                  className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-200 border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center text-lg font-black">
                      👤
                    </div>
                    <div>
                      <p className="font-black text-sm">{person.alias}</p>
                      <p className="text-xs font-extrabold text-gray-400">{formatDistance(dist)}</p>
                    </div>
                  </div>
                  {onSendInbox && (
                    <button
                      onClick={() => onSendInbox(person.session_id, person.alias)}
                      className="bg-orange-300 border-2 border-black px-3 py-1.5 font-black text-xs shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
                    >
                      📨
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* My Shoutouts banner */}
      {myShoutoutsMode ? (
        <div className="bg-yellow-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-3 py-2 mb-3 flex items-center justify-between">
          <span className="font-black text-sm uppercase">
            📢 MIS SHOUTOUTS ({shoutouts.length})
          </span>
          <button
            onClick={onExitMyShoutouts}
            className="bg-white border-2 border-black px-2 py-0.5 font-black text-xs shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
          >
            ← VOLVER
          </button>
        </div>
      ) : (
        <>
          {/* People bar - hidden on desktop where sidebar shows people */}
          <button
            onClick={() => setShowPeople(true)}
            className="w-full lg:hidden bg-violet-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-3 py-2 mb-3 flex items-center justify-between hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
          >
            <span className="font-black text-sm uppercase">
              👤 {peopleCount} PERSONA{peopleCount !== 1 ? 'S' : ''} CERCA DE TI
            </span>
            <span className="font-black text-xs uppercase">
              VER →
            </span>
          </button>

          {/* Shoutouts bar */}
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
        </>
      )}

      {/* Sort filters (only in normal mode) */}
      {!myShoutoutsMode && (
        <div className="flex gap-2 mb-3">
          {SORT_OPTIONS.map(opt => {
            const isActive = sortBy === opt.key
            const isPromo = opt.key === 'promos'
            return (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`border-2 border-black px-2 py-0.5 font-black text-xs uppercase transition-all duration-100 ${
                  isActive
                    ? isPromo
                      ? 'bg-red-500 text-white translate-x-[1px] translate-y-[1px]'
                      : 'bg-black text-yellow-300 translate-x-[1px] translate-y-[1px]'
                    : isPromo
                      ? 'bg-red-100 text-red-700 shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]'
                      : 'bg-white shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}

      {shoutouts.length === 0 ? (
        <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center">
          <span className="text-5xl block mb-3">{myShoutoutsMode ? '📢' : '📡'}</span>
          <p className="font-black text-xl mb-2 uppercase">
            {myShoutoutsMode ? 'No tienes shoutouts aun' : 'Sin shoutouts por aqui'}
          </p>
          <p className="font-medium text-gray-600">
            {myShoutoutsMode ? 'Crea tu primer shoutout!' : 'Se el primero en compartir lo que esta pasando en tu zona'}
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

          {/* Load more button */}
          {hasMore && !myShoutoutsMode && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full mt-4 bg-yellow-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-4 py-3 font-black text-sm uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100 disabled:opacity-50"
            >
              {loadingMore ? 'CARGANDO...' : 'CARGAR MAS'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
