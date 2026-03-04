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
      border-radius: ${isSpot ? '50%' : '8px'};
      box-shadow: 2px 2px 0 #000;
    ">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
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

  if (loading) {
    return (
      <div className="card-brutal p-8 text-center animate-fade-in">
        <span className="text-4xl block mb-2">🗺️</span>
        <p className="font-bold">Cargando mapa...</p>
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
      <div className="card-brutal overflow-hidden" style={{ height: '60vh' }}>
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
            html: '<div style="font-size:20px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:#00D4FF;border:3px solid #000;border-radius:50%;box-shadow:2px 2px 0 #000;">📍</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            className: '',
          })}
        >
          <Popup>
            <strong>Tu ubicacion</strong>
          </Popup>
        </Marker>

        {/* Shoutout markers */}
        {shoutouts.map(s => (
          <Marker
            key={`s-${s.id}`}
            position={[s.lat, s.lng]}
            icon={emojiIcon(s.emoji)}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px' }}>{s.emoji} {s.summary}</p>
                <p style={{ fontSize: '12px', color: '#404040', margin: '0 0 4px' }}>{s.text.slice(0, 80)}{s.text.length > 80 ? '...' : ''}</p>
                <p style={{ fontSize: '11px', color: '#737373', margin: 0 }}>
                  {s.category} · {formatDistance(calculateDistance(lat, lng, s.lat, s.lng))} · {getRelativeTime(s.created_at)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Spot markers (gold circle) */}
        {spots.map(sp => (
          <Marker
            key={`sp-${sp.id}`}
            position={[sp.lat, sp.lng]}
            icon={emojiIcon(sp.emoji, true)}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px' }}>{sp.emoji} {sp.name}</p>
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
