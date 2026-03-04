'use client'

import { useState, useCallback, useEffect } from 'react'

interface GeolocationState {
  lat: number | null
  lng: number | null
  loading: boolean
  error: string | null
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    loading: true,
    error: null,
  })

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Tu navegador no soporta geolocalizacion' }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          loading: false,
          error: null,
        })
      },
      (err) => {
        let message = 'No pudimos obtener tu ubicacion'
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Necesitamos tu ubicacion para mostrarte lo que pasa cerca. Activa la ubicacion en tu navegador.'
        }
        setState(prev => ({ ...prev, loading: false, error: message }))
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000, // Cache 1 min
      }
    )
  }, [])

  // Auto-request on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...state, refresh }
}
