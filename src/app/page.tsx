'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSessionStore } from '@/shared/stores/session-store'
import { useGeolocation } from '@/shared/hooks/use-geolocation'
import { FeedHeader, FeedList, TopShoutouts } from '@/features/feed/components'
import { CreateShoutoutModal } from '@/features/shoutout/components'
import { PeopleList } from '@/features/people/components'
import { upsertPresence } from '@/features/people/actions/people-actions'

const MapView = dynamic(
  () => import('@/features/map/components/MapView').then(m => ({ default: m.MapView })),
  { ssr: false, loading: () => (
    <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
      <span className="text-4xl block mb-2">🗺️</span>
      <p className="font-black uppercase">Cargando mapa...</p>
    </div>
  )}
)

type Tab = 'feed' | 'mapa' | 'shoutouts' | 'personas'

export default function HomePage() {
  const { alias, sessionId, initSession } = useSessionStore()
  const { lat, lng, loading: geoLoading, error: geoError, refresh: refreshGeo } = useGeolocation()
  const [feedKey, setFeedKey] = useState(0)
  const [tab, setTab] = useState<Tab>('feed')

  useEffect(() => {
    initSession()
  }, [initSession])

  // Update presence when location is available
  useEffect(() => {
    if (sessionId && lat && lng) {
      upsertPresence(sessionId, alias, lat, lng)
    }
  }, [sessionId, alias, lat, lng])

  const hasLocation = !geoLoading && !geoError && lat && lng

  const tabStyle = (t: Tab) =>
    `border-2 border-black px-3 py-1 font-black text-sm uppercase transition-all duration-100 ${
      tab === t
        ? 'bg-black text-yellow-300 translate-x-[2px] translate-y-[2px]'
        : 'bg-white shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000]'
    }`

  return (
    <main className="min-h-screen bg-[#f0ede6]">
      <div className="max-w-lg mx-auto p-4">
        <FeedHeader alias={alias} />

        {/* Tabs */}
        {hasLocation && (
          <div className="flex gap-2 mt-4">
            <button onClick={() => setTab('feed')} className={tabStyle('feed')}>
              📡 FEED
            </button>
            <button onClick={() => setTab('shoutouts')} className={tabStyle('shoutouts')}>
              🔥 TOP
            </button>
            <button onClick={() => setTab('personas')} className={tabStyle('personas')}>
              👤 PERSONAS
            </button>
            <button onClick={() => setTab('mapa')} className={tabStyle('mapa')}>
              🗺️ MAPA
            </button>
          </div>
        )}

        <div className="mt-4">
          {geoLoading ? (
            <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
              <span className="text-4xl block mb-2">📍</span>
              <p className="font-black text-lg mb-1 uppercase">Obteniendo tu ubicacion...</p>
              <p className="font-medium text-sm text-gray-600">
                Permite el acceso a tu ubicacion para ver shoutouts cerca de ti
              </p>
            </div>
          ) : geoError ? (
            <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center">
              <span className="text-5xl block mb-3">🚫</span>
              <p className="font-black text-xl mb-2 uppercase">Ubicacion no disponible</p>
              <p className="font-medium text-gray-600 mb-4">
                {geoError === 'PERMISSION_DENIED'
                  ? 'Necesitamos tu ubicacion para mostrar shoutouts cercanos. Activa la ubicacion en tu navegador.'
                  : 'No pudimos obtener tu ubicacion. Intenta de nuevo.'}
              </p>
              <button
                onClick={refreshGeo}
                className="bg-yellow-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-6 py-3 font-black uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
              >
                Reintentar
              </button>
            </div>
          ) : tab === 'feed' ? (
            <FeedList
              key={feedKey}
              lat={lat!}
              lng={lng!}
              onGoToPersonas={() => setTab('personas')}
            />
          ) : tab === 'shoutouts' ? (
            <TopShoutouts lat={lat!} lng={lng!} />
          ) : tab === 'personas' ? (
            <PeopleList lat={lat!} lng={lng!} />
          ) : (
            <MapView lat={lat!} lng={lng!} />
          )}
        </div>

        {/* FAB + Create Shoutout Modal */}
        {lat && lng && (
          <CreateShoutoutModal
            lat={lat}
            lng={lng}
            onCreated={() => {
              setFeedKey(k => k + 1)
              setTab('feed')
            }}
          />
        )}
      </div>
    </main>
  )
}
