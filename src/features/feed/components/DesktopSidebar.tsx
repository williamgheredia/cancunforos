'use client'

import { useEffect, useState, useCallback } from 'react'
import { getNearbyPeople, type PersonRow } from '@/features/people/actions/people-actions'
import { calculateDistance, formatDistance } from '@/shared/lib/geo-utils'
import { AdBanner } from './AdBanner'

interface DesktopSidebarProps {
  lat: number
  lng: number
  sessionId: string
  onSendInbox?: (sessionId: string, alias: string) => void
}

const PAGE_SIZE = 10
const MAX_PEOPLE = 30

export function DesktopSidebar({ lat, lng, sessionId, onSendInbox }: DesktopSidebarProps) {
  const [people, setPeople] = useState<PersonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const fetchPeople = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const data = await getNearbyPeople(lat, lng, 10, sessionId)
      const sorted = data.sort((a, b) => {
        const distA = calculateDistance(lat, lng, a.lat, a.lng)
        const distB = calculateDistance(lat, lng, b.lat, b.lng)
        return distA - distB
      })
      setPeople(sorted.slice(0, MAX_PEOPLE))
    } catch {
      setPeople([])
    } finally {
      setLoading(false)
    }
  }, [lat, lng, sessionId])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  const visiblePeople = people.slice(0, visibleCount)
  const hasMorePeople = visibleCount < people.length

  return (
    <div className="space-y-4 sticky top-4">
      {/* Ad banner - top of sidebar */}
      <AdBanner position="sidebar" />

      {/* People nearby */}
      <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000]">
        <div className="bg-violet-300 border-b-[2.5px] border-black px-3 py-2">
          <span className="font-black text-xs uppercase">
            👤 PERSONAS CERCA ({people.length})
          </span>
        </div>

        {loading ? (
          <div className="p-4 text-center">
            <p className="font-black text-xs uppercase animate-pulse">Buscando...</p>
          </div>
        ) : people.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-2xl mb-1">👤</p>
            <p className="font-black text-xs">Sin personas cerca</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {visiblePeople.map(person => {
                const dist = calculateDistance(lat, lng, person.lat, person.lng)
                return (
                  <div
                    key={person.id}
                    className="px-3 py-2 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 bg-violet-200 border-2 border-black flex items-center justify-center text-xs font-black shrink-0">
                        👤
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs truncate">{person.alias}</p>
                        <p className="text-[10px] font-extrabold text-gray-400">{formatDistance(dist)}</p>
                      </div>
                    </div>
                    {onSendInbox && (
                      <button
                        onClick={() => onSendInbox(person.session_id, person.alias)}
                        className="bg-orange-300 border-2 border-black px-2 py-1 font-black text-[10px] shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] transition-all duration-100 shrink-0"
                      >
                        📨
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {hasMorePeople && (
              <button
                onClick={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, MAX_PEOPLE))}
                className="w-full border-t-2 border-black px-3 py-2 font-black text-xs uppercase text-center hover:bg-gray-50 transition-all duration-100"
              >
                VER MAS ({people.length - visibleCount} restantes)
              </button>
            )}
          </>
        )}
      </div>

    </div>
  )
}
