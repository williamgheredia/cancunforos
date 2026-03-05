'use client'

import { useEffect, useState, useCallback } from 'react'
import { getNearbyPeople, upsertPresence, type PersonRow } from '../actions/people-actions'
import { useSessionStore } from '@/shared/stores/session-store'
import { siteConfig } from '@/config/siteConfig'
import { formatDistance, calculateDistance, getRelativeTime } from '@/shared/lib/geo-utils'

interface PeopleListProps {
  lat: number
  lng: number
}

export function PeopleList({ lat, lng }: PeopleListProps) {
  const [people, setPeople] = useState<PersonRow[]>([])
  const [loading, setLoading] = useState(true)
  const { sessionId, alias } = useSessionStore()

  const fetchPeople = useCallback(async () => {
    setLoading(true)
    try {
      // Update own presence
      if (sessionId) {
        await upsertPresence(sessionId, alias, lat, lng)
      }
      const data = await getNearbyPeople(lat, lng, siteConfig.features.radiusKm, sessionId)
      setPeople(data)
    } catch {
      setPeople([])
    } finally {
      setLoading(false)
    }
  }, [lat, lng, sessionId, alias])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  if (loading) {
    return (
      <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
        <span className="text-4xl block mb-2">👤</span>
        <p className="font-black uppercase">Buscando personas cerca...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Status banner */}
      <div className="bg-violet-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-3 py-2 mb-3 flex items-center justify-between">
        <span className="font-black text-sm uppercase">
          👤 {people.length} PERSONA{people.length !== 1 ? 'S' : ''} CERCA DE TI
        </span>
        <button
          onClick={() => fetchPeople()}
          className="bg-lime-400 border-2 border-black px-2 py-0.5 font-black text-xs shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
        >
          ACTUALIZAR
        </button>
      </div>

      {people.length === 0 ? (
        <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center">
          <span className="text-5xl block mb-3">👤</span>
          <p className="font-black text-xl mb-2 uppercase">Sin personas cerca</p>
          <p className="font-medium text-gray-600">
            No hay nadie activo en tu zona en este momento
          </p>
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
                  <div className="w-10 h-10 bg-violet-200 border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-content text-lg font-black flex items-center justify-center">
                    👤
                  </div>
                  <div>
                    <p className="font-black text-sm">{person.alias}</p>
                    <p className="text-xs text-gray-500 font-extrabold">
                      {getRelativeTime(person.last_seen)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm">{formatDistance(dist)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
