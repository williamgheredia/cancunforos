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
  comments_count: number
  is_promo: boolean
  created_at: string
  expires_at: string
}

export type FeedSort = 'newest' | 'oldest' | 'top' | 'promos'

export interface PaginatedShoutouts {
  data: ShoutoutRow[]
  hasMore: boolean
}

export async function getActiveShoutouts(
  lat: number,
  lng: number,
  radiusKm: number,
  sortBy: FeedSort = 'newest',
  limit: number = 12,
  offset: number = 0
): Promise<PaginatedShoutouts> {
  const supabase = await createClient()
  const { latDelta, lngDelta } = getBoundingBox(lat, radiusKm)

  let query = supabase
    .from('shoutouts')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .eq('is_collapsed', false)
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta)

  if (sortBy === 'top') {
    query = query.order('reactions_confirm', { ascending: false }).order('created_at', { ascending: false })
  } else if (sortBy === 'oldest') {
    query = query.order('created_at', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  // Fetch one extra to detect if there are more
  const { data, error } = await query.range(offset, offset + limit)

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as ShoutoutRow[]
  // Supabase range is inclusive, so range(0, 12) returns 13 rows max
  const hasMore = rows.length > limit
  return { data: hasMore ? rows.slice(0, limit) : rows, hasMore }
}

export async function getMyShoutouts(sessionId: string): Promise<ShoutoutRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data ?? []) as ShoutoutRow[]
}

export async function getTopShoutouts(
  lat: number,
  lng: number,
  minKm: number,
  maxKm: number
): Promise<ShoutoutRow[]> {
  const supabase = await createClient()
  const { latDelta: minLatD, lngDelta: minLngD } = getBoundingBox(lat, minKm)
  const { latDelta: maxLatD, lngDelta: maxLngD } = getBoundingBox(lat, maxKm)

  // Get all within maxKm bounding box, then filter out those within minKm client-side
  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .eq('is_collapsed', false)
    .gte('lat', lat - maxLatD)
    .lte('lat', lat + maxLatD)
    .gte('lng', lng - maxLngD)
    .lte('lng', lng + maxLngD)
    .order('reactions_confirm', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)

  // Filter to only include shoutouts in the min-max ring
  const rows = (data ?? []) as ShoutoutRow[]
  if (minKm === 0) return rows

  return rows.filter(s => {
    const dLat = (s.lat - lat) * 111.32
    const dLng = (s.lng - lng) * 111.32 * Math.cos(lat * Math.PI / 180)
    const dist = Math.sqrt(dLat * dLat + dLng * dLng)
    return dist >= minKm
  })
}

export async function getPromoShoutouts(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number = 12,
  offset: number = 0
): Promise<PaginatedShoutouts> {
  const supabase = await createClient()
  const { latDelta, lngDelta } = getBoundingBox(lat, radiusKm)

  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .eq('is_promo', true)
    .eq('is_collapsed', false)
    .gt('expires_at', new Date().toISOString())
    .gte('lat', lat - latDelta)
    .lte('lat', lat + latDelta)
    .gte('lng', lng - lngDelta)
    .lte('lng', lng + lngDelta)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit)

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as ShoutoutRow[]
  const hasMore = rows.length > limit
  return { data: hasMore ? rows.slice(0, limit) : rows, hasMore }
}
