'use server'

import { createClient } from '@/lib/supabase/server'
import { getBoundingBox } from '@/shared/lib/geo-utils'

export interface SpotRow {
  id: string
  session_id: string
  name: string
  description: string | null
  category: string
  emoji: string
  lat: number
  lng: number
  last_activity: string
  is_active: boolean
  created_at: string
}

export async function getActiveSpots(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<SpotRow[]> {
  const supabase = await createClient()
  const { latDelta, lngDelta } = getBoundingBox(lat, radiusKm)

  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .eq('is_active', true)
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta)
    .order('last_activity', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data ?? []) as SpotRow[]
}
