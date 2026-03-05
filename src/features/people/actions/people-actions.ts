'use server'

import { createClient } from '@/lib/supabase/server'
import { getBoundingBox } from '@/shared/lib/geo-utils'

export interface PersonRow {
  id: string
  session_id: string
  alias: string
  lat: number
  lng: number
  last_seen: string
}

export async function upsertPresence(
  sessionId: string,
  alias: string,
  lat: number,
  lng: number
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('presence')
    .upsert(
      { session_id: sessionId, alias, lat, lng, last_seen: new Date().toISOString() },
      { onConflict: 'session_id' }
    )
}

export async function getNearbyPeople(
  lat: number,
  lng: number,
  radiusKm: number,
  currentSessionId: string
): Promise<PersonRow[]> {
  const supabase = await createClient()
  const { latDelta, lngDelta } = getBoundingBox(lat, radiusKm)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('presence')
    .select('*')
    .eq('is_visible', true)
    .neq('session_id', currentSessionId)
    .gte('last_seen', thirtyMinAgo)
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta)
    .order('last_seen', { ascending: false })
    .limit(50)

  if (error) return []
  return (data ?? []) as PersonRow[]
}

export async function getNearbyPeopleCount(
  lat: number,
  lng: number,
  radiusKm: number,
  currentSessionId: string
): Promise<number> {
  const supabase = await createClient()
  const { latDelta, lngDelta } = getBoundingBox(lat, radiusKm)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('presence')
    .select('*', { count: 'exact', head: true })
    .eq('is_visible', true)
    .neq('session_id', currentSessionId)
    .gte('last_seen', thirtyMinAgo)
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta)

  if (error) return 0
  return count ?? 0
}
