'use server'

import { createClient } from '@/lib/supabase/server'
import { getBoundingBox } from '@/shared/lib/geo-utils'

export interface ShoutoutRow {
  id: string
  session_id: string
  alias: string
  text: string
  summary: string
  category: string
  emoji: string
  source: 'voice' | 'text'
  lat: number
  lng: number
  reactions_confirm: number
  reactions_doubt: number
  reports_count: number
  is_collapsed: boolean
  created_at: string
  expires_at: string
}

export async function getActiveShoutouts(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<ShoutoutRow[]> {
  const supabase = await createClient()
  const { latDelta, lngDelta } = getBoundingBox(lat, radiusKm)

  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .eq('is_collapsed', false)
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data ?? []) as ShoutoutRow[]
}
