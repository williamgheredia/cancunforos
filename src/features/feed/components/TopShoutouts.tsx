'use client'

import { useEffect, useState, useCallback } from 'react'
import { getTopShoutouts, type ShoutoutRow } from '../actions/feed-actions'
import { getUserReactions } from '../actions/reaction-actions'
import { ShoutoutCard } from './ShoutoutCard'
import { useSessionStore } from '@/shared/stores/session-store'

interface TopShoutoutsProps {
  lat: number
  lng: number
}

const RANGES = [
  { label: '5-10 KM', min: 5, max: 10 },
  { label: '10-15 KM', min: 10, max: 15 },
  { label: '15-20 KM', min: 15, max: 20 },
]

export function TopShoutouts({ lat, lng }: TopShoutoutsProps) {
  const [shoutouts, setShoutouts] = useState<ShoutoutRow[]>([])
  const [reactions, setReactions] = useState<Record<string, 'confirm' | 'doubt'>>({})
  const [loading, setLoading] = useState(true)
  const [activeRange, setActiveRange] = useState(0)
  const { sessionId, alias } = useSessionStore()

  const range = RANGES[activeRange]

  const fetchShoutouts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTopShoutouts(lat, lng, range.min, range.max)
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
  }, [lat, lng, range.min, range.max, sessionId])

  useEffect(() => {
    fetchShoutouts()
  }, [fetchShoutouts])

  return (
    <div>
      {/* Distance filter buttons */}
      <div className="flex gap-2 mb-3">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setActiveRange(i)}
            className={`flex-1 border-2 border-black px-3 py-2 font-black text-xs uppercase transition-all duration-100 ${
              activeRange === i
                ? 'bg-black text-yellow-300 translate-x-[2px] translate-y-[2px]'
                : 'bg-white shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000]'
            }`}
          >
            📍 {r.label}
          </button>
        ))}
      </div>

      {/* Status banner */}
      <div className="bg-yellow-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-3 py-2 mb-3 flex items-center justify-between">
        <span className="font-black text-sm uppercase">
          🔥 TOP SHOUTOUTS {range.min}-{range.max}KM
        </span>
        <button
          onClick={() => fetchShoutouts()}
          className="bg-black text-yellow-300 border-2 border-black px-2 py-0.5 font-black text-xs shadow-[2px_2px_0_#333] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#333] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
        >
          ACTUALIZAR
        </button>
      </div>

      {loading ? (
        <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
          <span className="text-4xl block mb-2">🔥</span>
          <p className="font-black uppercase">Buscando top shoutouts...</p>
        </div>
      ) : shoutouts.length === 0 ? (
        <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center">
          <span className="text-5xl block mb-3">📡</span>
          <p className="font-black text-xl mb-2 uppercase">Sin shoutouts en este rango</p>
          <p className="font-medium text-gray-600">
            Prueba con otro rango de distancia
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
