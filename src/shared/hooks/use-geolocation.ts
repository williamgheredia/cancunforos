'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

const STORAGE_KEY = 'cancunforos-last-location'

interface GeolocationState {
  lat: number | null
  lng: number | null
  loading: boolean
  error: string | null
}

function getCachedLocation(maxAgeMs?: number): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (maxAgeMs && Date.now() - parsed.timestamp > maxAgeMs) return null
    return { lat: parsed.lat, lng: parsed.lng }
  } catch {
    return null
  }
}

function setCachedLocation(lat: number, lng: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng, timestamp: Date.now() }))
  } catch {
    // ignore
  }
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(() => {
    // Initialize with cached location (any age) for instant load
    const cached = typeof window !== 'undefined' ? getCachedLocation() : null
    if (cached) {
      return { lat: cached.lat, lng: cached.lng, loading: false, error: null }
    }
    return { lat: null, lng: null, loading: true, error: null }
  })

  const watchIdRef = useRef<number | null>(null)
  const retriedRef = useRef(false)

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const onSuccess = useCallback((lat: number, lng: number) => {
    setState({ lat, lng, loading: false, error: null })
    setCachedLocation(lat, lng)
    clearWatch()
  }, [clearWatch])

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, loading: false, error: 'Tu navegador no soporta geolocalizacion' }))
      return
    }

    retriedRef.current = false
    setState(prev => ({ ...prev, loading: prev.lat === null, error: null }))

    // Step 1: Fast location (long cache, low accuracy)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        onSuccess(lat, lng)

        // Step 2: Refine with high accuracy in background
        navigator.geolocation.getCurrentPosition(
          (precise) => onSuccess(precise.coords.latitude, precise.coords.longitude),
          () => { /* ignore - already have a location */ },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        )
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState(prev => ({ ...prev, loading: false, error: 'PERMISSION_DENIED' }))
          return
        }

        // If not permission denied: try watchPosition as fallback
        if (!retriedRef.current) {
          retriedRef.current = true
          clearWatch()
          watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
              onSuccess(position.coords.latitude, position.coords.longitude)
            },
            (watchErr) => {
              // Last resort: use any cached location (even old)
              const anyCached = getCachedLocation()
              if (anyCached) {
                setState({ lat: anyCached.lat, lng: anyCached.lng, loading: false, error: null })
              } else {
                setState(prev => ({ ...prev, loading: false, error: 'No pudimos obtener tu ubicacion' }))
              }
              clearWatch()
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 600000 }
          )
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    )
  }, [onSuccess, clearWatch])

  // Auto-request on mount
  useEffect(() => {
    refresh()
    return () => clearWatch()
  }, [refresh, clearWatch])

  return { ...state, refresh }
}
