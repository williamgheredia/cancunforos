'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useSessionStore } from '@/shared/stores/session-store'
import { useGeolocation } from '@/shared/hooks/use-geolocation'
import { FeedHeader, FeedList, TopShoutouts } from '@/features/feed/components'
import { CreateShoutoutModal } from '@/features/shoutout/components'
import { InboxView } from '@/features/inbox/components'
import { ProfileView } from '@/features/profile/components/ProfileView'
import { upsertPresence } from '@/features/people/actions/people-actions'
import { getShoutoutCount } from '@/features/profile/actions/profile-actions'
import { getRank } from '@/shared/lib/rank-utils'
import { DesktopSidebar } from '@/features/feed/components/DesktopSidebar'
import type { ShoutoutRow } from '@/features/feed/actions/feed-actions'

const MapView = dynamic(
  () => import('@/features/map/components/MapView').then(m => ({ default: m.MapView })),
  { ssr: false, loading: () => (
    <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
      <span className="text-4xl block mb-2">🗺️</span>
      <p className="font-black uppercase">Cargando mapa...</p>
    </div>
  )}
)

type Tab = 'feed' | 'mapa' | 'shoutouts' | 'inbox'

export default function HomePage() {
  const { alias, sessionId, initSession } = useSessionStore()
  const { lat, lng, loading: geoLoading, error: geoError, refresh: refreshGeo } = useGeolocation()
  const [feedKey, setFeedKey] = useState(0)
  const [tab, setTab] = useState<Tab>('feed')
  const [showMyShoutouts, setShowMyShoutouts] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [mapFocusShoutout, setMapFocusShoutout] = useState<ShoutoutRow | null>(null)
  const [inboxTarget, setInboxTarget] = useState<{ sessionId: string; alias: string } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [rankBadge, setRankBadge] = useState('🌱')
  const [forceOpenCreate, setForceOpenCreate] = useState(false)

  useEffect(() => {
    initSession()
  }, [initSession])

  // Update presence when location is available (debounced to avoid duplicate writes)
  const presenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (sessionId && lat && lng) {
      clearTimeout(presenceTimeoutRef.current)
      presenceTimeoutRef.current = setTimeout(() => {
        upsertPresence(sessionId, alias, lat, lng)
      }, 5000)
    }
    return () => clearTimeout(presenceTimeoutRef.current)
  }, [sessionId, alias, lat, lng])

  // Fetch rank badge on mount (cached in sessionStorage for 5 min)
  useEffect(() => {
    if (!sessionId) return
    const cached = sessionStorage.getItem('cancunforos-rank')
    if (cached) {
      try {
        const { badge, ts } = JSON.parse(cached)
        if (Date.now() - ts < 300_000) {
          setRankBadge(badge)
          return
        }
      } catch { /* ignore */ }
    }
    getShoutoutCount(sessionId).then(count => {
      const badge = getRank(count).badge
      setRankBadge(badge)
      sessionStorage.setItem('cancunforos-rank', JSON.stringify({ badge, ts: Date.now() }))
    }).catch(() => {})
  }, [sessionId])

  const hasLocation = !geoLoading && !geoError && lat && lng

  const handleAliasClick = () => {
    setShowProfile(true)
  }

  const handleCloseProfile = () => {
    setShowProfile(false)
  }

  const handleViewOnMap = (shoutout: ShoutoutRow) => {
    setMapFocusShoutout(shoutout)
    setTab('mapa')
  }

  const handleSendInbox = (targetSessionId: string, targetAlias: string) => {
    setInboxTarget({ sessionId: targetSessionId, alias: targetAlias })
    setTab('inbox')
  }

  const switchTab = (t: Tab) => {
    if (t !== 'inbox') setInboxTarget(null)
    if (t !== 'mapa') setMapFocusShoutout(null)
    if (t === 'feed') setShowMyShoutouts(false)
    setShowProfile(false)
    setTab(t)
  }

  const tabStyle = (t: Tab) =>
    `border-2 border-black px-3 py-1 font-black text-sm uppercase transition-all duration-100 ${
      tab === t && !showProfile
        ? 'bg-black text-yellow-300 translate-x-[2px] translate-y-[2px]'
        : 'bg-white shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000]'
    }`

  return (
    <main className="min-h-screen bg-[#f0ede6]">
      <div className="max-w-lg lg:max-w-6xl mx-auto p-4">
        <FeedHeader alias={alias} rankBadge={rankBadge} onAliasClick={handleAliasClick} />

        {/* Tabs: FEED - TOP - MAPA - INBOX */}
        {hasLocation && (
          <div className="flex gap-2 mt-4">
            <button onClick={() => switchTab('feed')} className={tabStyle('feed')}>
              📡 FEED
            </button>
            <button onClick={() => switchTab('shoutouts')} className={tabStyle('shoutouts')}>
              🔥 TOP
            </button>
            <button onClick={() => switchTab('mapa')} className={tabStyle('mapa')}>
              🗺️ MAPA
            </button>
            <button onClick={() => switchTab('inbox')} className={`${tabStyle('inbox')} relative`}>
              📨 INBOX
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 border-2 border-black rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px] font-black">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </span>
              )}
            </button>
          </div>
        )}

        <div className={`mt-4 ${hasLocation && (tab === 'feed' || tab === 'shoutouts') && !showProfile ? 'lg:grid lg:grid-cols-[1fr_320px] lg:gap-6' : ''}`}>
          <div>
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
            ) : showProfile ? (
              <ProfileView
                onClose={handleCloseProfile}
                onCreateShoutout={() => {
                  handleCloseProfile()
                  setForceOpenCreate(true)
                }}
              />
            ) : tab === 'feed' ? (
              <FeedList
                key={showMyShoutouts ? 'my' : feedKey}
                lat={lat!}
                lng={lng!}
                myShoutoutsMode={showMyShoutouts}
                onExitMyShoutouts={() => setShowMyShoutouts(false)}
                onViewOnMap={handleViewOnMap}
                onSendInbox={handleSendInbox}
              />
            ) : tab === 'shoutouts' ? (
              <TopShoutouts lat={lat!} lng={lng!} />
            ) : tab === 'inbox' ? (
              <InboxView lat={lat!} lng={lng!} openChatWith={inboxTarget} onUnreadUpdate={setUnreadCount} />
            ) : (
              <MapView lat={lat!} lng={lng!} focusShoutout={mapFocusShoutout} />
            )}
          </div>

          {/* Desktop sidebar - only visible on lg: when feed or top tabs are active */}
          {hasLocation && (tab === 'feed' || tab === 'shoutouts') && !showProfile && (
            <div className="hidden lg:block">
              <DesktopSidebar
                lat={lat!}
                lng={lng!}
                sessionId={sessionId}
                onSendInbox={handleSendInbox}
              />
            </div>
          )}
        </div>

        {/* FAB + Create Shoutout Modal */}
        {lat && lng && (
          <CreateShoutoutModal
            lat={lat}
            lng={lng}
            forceOpen={forceOpenCreate}
            onForceOpenConsumed={() => setForceOpenCreate(false)}
            onCreated={() => {
              setFeedKey(k => k + 1)
              setShowMyShoutouts(false)
              setShowProfile(false)
              setTab('feed')
              // Refresh rank badge (invalidate cache)
              getShoutoutCount(sessionId).then(count => {
                const badge = getRank(count).badge
                setRankBadge(badge)
                sessionStorage.setItem('cancunforos-rank', JSON.stringify({ badge, ts: Date.now() }))
              }).catch(() => {})
            }}
          />
        )}
      </div>
    </main>
  )
}
