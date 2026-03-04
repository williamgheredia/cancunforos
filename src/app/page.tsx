'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSessionStore } from '@/shared/stores/session-store'
import { useGeolocation } from '@/shared/hooks/use-geolocation'
import { FeedHeader, FeedList } from '@/features/feed/components'
import { CreateShoutoutModal } from '@/features/shoutout/components'

const MapView = dynamic(
  () => import('@/features/map/components/MapView').then(m => ({ default: m.MapView })),
  { ssr: false, loading: () => (
    <div className="card-brutal p-8 text-center animate-fade-in">
      <span className="text-4xl block mb-2">🗺️</span>
      <p className="font-bold">Cargando mapa...</p>
    </div>
  )}
)

type Tab = 'feed' | 'mapa'

export default function HomePage() {
  const { alias, initSession } = useSessionStore()
  const { lat, lng, loading: geoLoading, error: geoError, refresh: refreshGeo } = useGeolocation()
  const [feedKey, setFeedKey] = useState(0)
  const [tab, setTab] = useState<Tab>('feed')

  useEffect(() => {
    initSession()
  }, [initSession])

  const hasLocation = !geoLoading && !geoError && lat && lng

  return (
    <main className="min-h-screen bg-[#F5F5F0]">
      <div className="max-w-lg mx-auto p-4">
        <FeedHeader alias={alias} />

        {/* Tabs */}
        {hasLocation && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setTab('feed')}
              className={`badge-brutal text-sm font-bold cursor-pointer transition-all ${
                tab === 'feed' ? 'bg-brutal-cyan border-[3px] shadow-brutal' : 'bg-white hover:bg-brutal-cyan/30'
              }`}
            >
              📡 Feed
            </button>
            <button
              onClick={() => setTab('mapa')}
              className={`badge-brutal text-sm font-bold cursor-pointer transition-all ${
                tab === 'mapa' ? 'bg-brutal-yellow border-[3px] shadow-brutal' : 'bg-white hover:bg-brutal-yellow/30'
              }`}
            >
              🗺️ Mapa
            </button>
          </div>
        )}

        <div className="mt-4">
          {geoLoading ? (
            <div className="card-brutal p-8 text-center animate-fade-in">
              <span className="text-4xl block mb-2">📍</span>
              <p className="font-bold text-lg mb-1">Obteniendo tu ubicacion...</p>
              <p className="text-foreground-secondary text-sm font-medium">
                Permite el acceso a tu ubicacion para ver shoutouts cerca de ti
              </p>
            </div>
          ) : geoError ? (
            <div className="card-brutal p-8 text-center">
              <span className="text-5xl block mb-3">🚫</span>
              <p className="font-bold text-xl mb-2">Ubicacion no disponible</p>
              <p className="text-foreground-secondary font-medium mb-4">
                {geoError === 'PERMISSION_DENIED'
                  ? 'Necesitamos tu ubicacion para mostrar shoutouts cercanos. Activa la ubicacion en tu navegador.'
                  : 'No pudimos obtener tu ubicacion. Intenta de nuevo.'}
              </p>
              <button
                onClick={refreshGeo}
                className="btn-brutal bg-brutal-cyan"
              >
                Reintentar
              </button>
            </div>
          ) : tab === 'feed' ? (
            <FeedList
              key={feedKey}
              lat={lat!}
              lng={lng!}
            />
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
