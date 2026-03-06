'use server'

import { createClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  if (!UUID_RE.test(sessionId)) return
  if (!alias || alias.length > 30) return
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return

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

  const { data, error } = await supabase.rpc('get_nearby_people', {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
    p_current_session_id: currentSessionId,
  })

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

  const { data, error } = await supabase.rpc('get_nearby_people_count', {
    p_lat: lat,
    p_lng: lng,
    p_radius_km: radiusKm,
    p_current_session_id: currentSessionId,
  })

  if (error) return 0
  return data ?? 0
}
