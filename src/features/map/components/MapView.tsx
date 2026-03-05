'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getActiveShoutouts, type ShoutoutRow } from '@/features/feed/actions/feed-actions'
import { getActiveSpots, type SpotRow } from '../actions/map-actions'
import { siteConfig } from '@/config/siteConfig'
import { formatDistance, calculateDistance, getRelativeTime } from '@/shared/lib/geo-utils'
import { CreateSpotModal } from '@/features/spots/components'
import { useSessionStore } from '@/shared/stores/session-store'
import { MapShoutoutDetail } from './MapShoutoutDetail'

interface MapViewProps {
  lat: number
  lng: number
  onSpotCreated?: () => void
}

const CATEGORY_HEX: Record<string, string> = {
  alerta: '#f87171', trafico: '#fb923c', comida: '#a3e635',
  evento: '#67e8f9', clima: '#93c5fd', oferta: '#fde047',
  tip: '#c4b5fd', otro: '#e5e7eb',
}

interface GridCell {
  key: string
  centerLat: number
  centerLng: number
  shoutouts: ShoutoutRow[]
  topEmoji: string
  topCategory: string
}

// ~200m grid cells
const GRID_SIZE_LAT = 0.002
const GRID_SIZE_LNG = 0.0025

function groupByGrid(shoutouts: ShoutoutRow[]): GridCell[] {
  const map = new Map<string, ShoutoutRow[]>()

  for (const s of shoutouts) {
    const gLat = Math.floor(s.lat / GRID_SIZE_LAT)
    const gLng = Math.floor(s.lng / GRID_SIZE_LNG)
    const key = `${gLat}_${gLng}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }

  const cells: GridCell[] = []
  for (const [key, items] of map) {
    const sorted = [...items].sort((a, b) => b.reactions_confirm - a.reactions_confirm)
    const top = sorted[0]
    const [gLatStr, gLngStr] = key.split('_')
    const gLat = parseInt(gLatStr)
    const gLng = parseInt(gLngStr)

    cells.push({
      key,
      centerLat: (gLat + 0.5) * GRID_SIZE_LAT,
      centerLng: (gLng + 0.5) * GRID_SIZE_LNG,
      shoutouts: sorted,
      topEmoji: top.emoji,
      topCategory: top.category,
    })
  }

  return cells
}

function getDotSize(count: number): { size: number; fontSize: number } {
  if (count <= 1) return { size: 32, fontSize: 16 }
  if (count <= 3) return { size: 40, fontSize: 13 }
  if (count <= 6) return { size: 50, fontSize: 15 }
  if (count <= 10) return { size: 60, fontSize: 17 }
  return { size: 70, fontSize: 19 } // CAP
}

function dotIcon(count: number, _emoji: string, category: string): L.DivIcon {
  const bg = CATEGORY_HEX[category.toLowerCase()] ?? '#e5e7eb'
  const { size, fontSize } = getDotSize(count)
  const half = size / 2
  const label = count === 1 ? '📢' : `📢${count}`

  return L.divIcon({
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${bg};
      border: 3px solid #000;
      box-shadow: 3px 3px 0 #000;
      font-family: 'Space Grotesk', system-ui, sans-serif;
      font-weight: 900;
      font-size: ${fontSize}px;
      line-height: 1;
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half - 4],
    className: '',
  })
}

const SPOT_CATEGORY_HEX: Record<string, string> = {
  restaurante: '#f87171', tienda: '#fde047', servicio: '#93c5fd',
  entretenimiento: '#c4b5fd', salud: '#86efac', educacion: '#67e8f9',
  transporte: '#fb923c', otro: '#e5e7eb',
}

function spotIcon(emoji: string, category: string): L.DivIcon {
  const bg = SPOT_CATEGORY_HEX[category.toLowerCase()] ?? '#FFE500'
  return L.divIcon({
    html: `<div style="
      font-size: 18px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${bg};
      border: 3px solid #000;
      box-shadow: 2px 2px 0 #000;
    ">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
    className: '',
  })
}

// Close all popups when a shoutout is selected for overlay
function ClosePopups({ trigger }: { trigger: unknown }) {
  const map = useMap()
  useEffect(() => {
    if (trigger) map.closePopup()
  }, [trigger, map])
  return null
}

// Grid cell marker - popups only show list, clicks bubble up to parent
function GridCellMarker({
  cell,
  userLat,
  userLng,
  onSelectShoutout,
}: {
  cell: GridCell
  userLat: number
  userLng: number
  onSelectShoutout: (s: ShoutoutRow) => void
}) {
  const count = cell.shoutouts.length
  const isSingle = count === 1

  const position: [number, number] = isSingle
    ? [cell.shoutouts[0].lat, cell.shoutouts[0].lng]
    : [cell.centerLat, cell.centerLng]

  return (
    <Marker
      position={position}
      icon={dotIcon(count, cell.topEmoji, cell.topCategory)}
    >
      <Popup>
        {isSingle ? (
          <SingleShoutoutPopup
            shoutout={cell.shoutouts[0]}
            userLat={userLat}
            userLng={userLng}
            onSelect={() => onSelectShoutout(cell.shoutouts[0])}
          />
        ) : (
          <ShoutoutListPopup
            shoutouts={cell.shoutouts}
            userLat={userLat}
            userLng={userLng}
            onSelect={onSelectShoutout}
          />
        )}
      </Popup>
    </Marker>
  )
}

function SingleShoutoutPopup({
  shoutout,
  userLat,
  userLng,
  onSelect,
}: {
  shoutout: ShoutoutRow
  userLat: number
  userLng: number
  onSelect: () => void
}) {
  const s = shoutout
  return (
    <div
      style={{ minWidth: 200, cursor: 'pointer' }}
      onClick={onSelect}
    >
      <p style={{ fontWeight: 900, margin: '0 0 4px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
        {s.emoji} {s.summary}
      </p>
      <p style={{ fontSize: '12px', color: '#404040', margin: '0 0 4px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
        {s.text.slice(0, 80)}{s.text.length > 80 ? '...' : ''}
      </p>
      <p style={{ fontSize: '11px', color: '#737373', margin: '0 0 4px', fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700 }}>
        {s.category} · {formatDistance(calculateDistance(userLat, userLng, s.lat, s.lng))} · {getRelativeTime(s.created_at)}
      </p>
      <p style={{ fontSize: '10px', color: '#000', fontWeight: 900, margin: 0, fontFamily: "'Space Grotesk', system-ui, sans-serif", textTransform: 'uppercase' }}>
        Tap para abrir →
      </p>
    </div>
  )
}

function ShoutoutListPopup({
  shoutouts,
  userLat,
  userLng,
  onSelect,
}: {
  shoutouts: ShoutoutRow[]
  userLat: number
  userLng: number
  onSelect: (s: ShoutoutRow) => void
}) {
  return (
    <div style={{ minWidth: 220, maxHeight: 240, overflowY: 'auto' }}>
      <p style={{ fontWeight: 900, margin: '0 0 6px', fontSize: '13px', textTransform: 'uppercase', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
        {shoutouts.length} shoutouts
      </p>
      {shoutouts.map(s => (
        <div
          key={s.id}
          onClick={() => onSelect(s)}
          style={{
            borderBottom: '1px solid #e5e7eb',
            padding: '6px 0',
            cursor: 'pointer',
          }}
        >
          <p style={{ fontWeight: 800, fontSize: '12px', margin: 0, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            {s.emoji} {s.summary}
          </p>
          <p style={{ fontSize: '10px', color: '#737373', margin: '2px 0 0', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
            {s.category} · {formatDistance(calculateDistance(userLat, userLng, s.lat, s.lng))} · ✅{s.reactions_confirm}
          </p>
        </div>
      ))}
    </div>
  )
}

export function MapView({ lat, lng, onSpotCreated }: MapViewProps) {
  const [shoutouts, setShoutouts] = useState<ShoutoutRow[]>([])
  const [spots, setSpots] = useState<SpotRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShoutout, setSelectedShoutout] = useState<ShoutoutRow | null>(null)
  const { sessionId, alias } = useSessionStore()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [shoutoutData, spotData] = await Promise.all([
          getActiveShoutouts(lat, lng, siteConfig.features.radiusKm),
          getActiveSpots(lat, lng, siteConfig.features.radiusKm),
        ])
        setShoutouts(shoutoutData)
        setSpots(spotData)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [lat, lng])

  function refetch() {
    async function fetchData() {
      try {
        const [shoutoutData, spotData] = await Promise.all([
          getActiveShoutouts(lat, lng, siteConfig.features.radiusKm),
          getActiveSpots(lat, lng, siteConfig.features.radiusKm),
        ])
        setShoutouts(shoutoutData)
        setSpots(spotData)
      } catch {
        // silently fail
      }
    }
    fetchData()
  }

  const gridCells = groupByGrid(shoutouts)

  if (loading) {
    return (
      <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
        <span className="text-4xl block mb-2">🗺️</span>
        <p className="font-black uppercase">Cargando mapa...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <CreateSpotModal
          lat={lat}
          lng={lng}
          onCreated={() => {
            refetch()
            onSpotCreated?.()
          }}
        />
      </div>
      <div className="relative border-[2.5px] border-black shadow-[4px_4px_0_#000] overflow-hidden" style={{ height: '60vh' }}>
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Close popups when overlay opens */}
          <ClosePopups trigger={selectedShoutout} />

          {/* User radius circle */}
          <Circle
            center={[lat, lng]}
            radius={siteConfig.features.radiusKm * 1000}
            pathOptions={{
              color: '#000',
              weight: 2,
              fillColor: '#00D4FF',
              fillOpacity: 0.08,
            }}
          />

          {/* User position - small cyan smiley, always on top */}
          <Marker
            position={[lat, lng]}
            zIndexOffset={1000}
            icon={L.divIcon({
              html: '<div style="font-size:10px;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#00D4FF;border:2px solid #000;box-shadow:2px 2px 0 #000;animation:pulse 2s infinite;">😊</div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10],
              className: '',
            })}
          >
            <Popup>
              <strong>Tu ubicacion</strong>
            </Popup>
          </Marker>

          {/* Shoutout grid cells as scaled dots */}
          {gridCells.map(cell => (
            <GridCellMarker
              key={`grid-${cell.key}`}
              cell={cell}
              userLat={lat}
              userLng={lng}
              onSelectShoutout={setSelectedShoutout}
            />
          ))}

          {/* Spot markers (gold circles, fixed size) */}
          {spots.map(sp => (
            <Marker
              key={`sp-${sp.id}`}
              position={[sp.lat, sp.lng]}
              icon={spotIcon(sp.emoji, sp.category)}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <p style={{ fontWeight: 900, margin: '0 0 4px' }}>{sp.emoji} {sp.name}</p>
                  {sp.description && <p style={{ fontSize: '12px', color: '#404040', margin: '0 0 4px' }}>{sp.description.slice(0, 80)}{sp.description.length > 80 ? '...' : ''}</p>}
                  <p style={{ fontSize: '11px', color: '#737373', margin: 0 }}>
                    {sp.category} · {formatDistance(calculateDistance(lat, lng, sp.lat, sp.lng))}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Overlay panel for shoutout detail - renders OUTSIDE Leaflet */}
        {selectedShoutout && (
          <div
            className="absolute inset-0 z-[1000] bg-white/95 overflow-y-auto animate-fade-in"
            style={{ backdropFilter: 'blur(2px)' }}
          >
            <div className="p-4">
              <MapShoutoutDetail
                shoutout={selectedShoutout}
                userLat={lat}
                userLng={lng}
                sessionId={sessionId}
                alias={alias}
                onBack={() => setSelectedShoutout(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
