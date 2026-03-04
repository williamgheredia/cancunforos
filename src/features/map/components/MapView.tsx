'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getActiveShoutouts, type ShoutoutRow } from '@/features/feed/actions/feed-actions'
import { getActiveSpots, type SpotRow } from '../actions/map-actions'
import { siteConfig } from '@/config/siteConfig'
import { formatDistance, calculateDistance, getRelativeTime } from '@/shared/lib/geo-utils'
import { CreateSpotModal } from '@/features/spots/components'

interface MapViewProps {
  lat: number
  lng: number
  onSpotCreated?: () => void
}

const CATEGORY_BG: Record<string, string> = {
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
    // Sort by confirms desc to find "top" shoutout
    const sorted = [...items].sort((a, b) => b.reactions_confirm - a.reactions_confirm)
    const top = sorted[0]

    // Center of the grid cell
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

function emojiIcon(emoji: string, isSpot = false): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      font-size: 24px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${isSpot ? '#FFE500' : '#fff'};
      border: 3px solid #000;
      box-shadow: 2px 2px 0 #000;
    ">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
    className: '',
  })
}

function bubbleIcon(count: number, emoji: string, category: string): L.DivIcon {
  const bg = CATEGORY_BG[category.toLowerCase()] ?? '#e5e7eb'
  return L.divIcon({
    html: `<div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: ${bg};
      border: 3px solid #000;
      box-shadow: 3px 3px 0 #000;
      padding: 4px 10px;
      font-family: 'Space Grotesk', system-ui, sans-serif;
      line-height: 1.2;
      min-width: 52px;
    ">
      <span style="font-size:14px;font-weight:900;">${emoji} ${count}</span>
      <span style="font-size:9px;font-weight:800;text-transform:uppercase;opacity:0.7;">${category}</span>
    </div>`,
    iconSize: [60, 44],
    iconAnchor: [30, 22],
    popupAnchor: [0, -26],
    className: '',
  })
}

export function MapView({ lat, lng, onSpotCreated }: MapViewProps) {
  const [shoutouts, setShoutouts] = useState<ShoutoutRow[]>([])
  const [spots, setSpots] = useState<SpotRow[]>([])
  const [loading, setLoading] = useState(true)

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
      <div className="border-[2.5px] border-black shadow-[4px_4px_0_#000] overflow-hidden" style={{ height: '60vh' }}>
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

        {/* User position */}
        <Marker
          position={[lat, lng]}
          icon={L.divIcon({
            html: '<div style="font-size:20px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#facc15;border:3px solid #000;box-shadow:2px 2px 0 #000;">📍</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            className: '',
          })}
        >
          <Popup>
            <strong>Tu ubicacion</strong>
          </Popup>
        </Marker>

        {/* Shoutout grid cells */}
        {gridCells.map(cell => {
          if (cell.shoutouts.length === 1) {
            // Single shoutout: show emoji pin
            const s = cell.shoutouts[0]
            return (
              <Marker
                key={`s-${s.id}`}
                position={[s.lat, s.lng]}
                icon={emojiIcon(s.emoji)}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <p style={{ fontWeight: 900, margin: '0 0 4px' }}>{s.emoji} {s.summary}</p>
                    <p style={{ fontSize: '12px', color: '#404040', margin: '0 0 4px' }}>{s.text.slice(0, 80)}{s.text.length > 80 ? '...' : ''}</p>
                    <p style={{ fontSize: '11px', color: '#737373', margin: 0 }}>
                      {s.category} · {formatDistance(calculateDistance(lat, lng, s.lat, s.lng))} · {getRelativeTime(s.created_at)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )
          }

          // Multiple shoutouts: show bubble with count
          return (
            <Marker
              key={`grid-${cell.key}`}
              position={[cell.centerLat, cell.centerLng]}
              icon={bubbleIcon(cell.shoutouts.length, cell.topEmoji, cell.topCategory)}
            >
              <Popup>
                <div style={{ minWidth: 200, maxHeight: 200, overflowY: 'auto' }}>
                  <p style={{ fontWeight: 900, margin: '0 0 6px', fontSize: '13px', textTransform: 'uppercase' }}>
                    {cell.shoutouts.length} shoutouts
                  </p>
                  {cell.shoutouts.map(s => (
                    <div key={s.id} style={{ borderBottom: '1px solid #e5e7eb', padding: '4px 0' }}>
                      <p style={{ fontWeight: 800, fontSize: '12px', margin: 0 }}>
                        {s.emoji} {s.summary}
                      </p>
                      <p style={{ fontSize: '10px', color: '#737373', margin: '2px 0 0' }}>
                        {s.category} · {formatDistance(calculateDistance(lat, lng, s.lat, s.lng))} · ✅{s.reactions_confirm}
                      </p>
                    </div>
                  ))}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Spot markers (gold, NOT grouped) */}
        {spots.map(sp => (
          <Marker
            key={`sp-${sp.id}`}
            position={[sp.lat, sp.lng]}
            icon={emojiIcon(sp.emoji, true)}
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
      </div>
    </div>
  )
}
