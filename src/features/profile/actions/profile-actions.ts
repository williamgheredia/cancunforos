'use server'

import { randomInt } from 'crypto'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getShoutoutCount(sessionId: string): Promise<number> {
  if (!UUID_RE.test(sessionId)) return 0
  const supabase = await createClient()
  const { count } = await supabase
    .from('shoutouts')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  return count ?? 0
}

export interface ProfileData {
  count: number
  shoutouts: Array<{
    id: string
    session_id: string
    alias: string
    text: string
    summary: string
    category: string
    emoji: string
    source: string
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
  }>
  recoveryCode: string | null
}

/** Single server action that loads all profile data in one round-trip */
export async function getProfileData(sessionId: string): Promise<ProfileData> {
  if (!UUID_RE.test(sessionId)) return { count: 0, shoutouts: [], recoveryCode: null }

  const supabase = await createClient()
  const serviceClient = createServiceClient()

  // Run all queries in parallel with shared clients
  const [countResult, shoutoutsResult, codeResult] = await Promise.all([
    supabase
      .from('shoutouts')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId),
    supabase
      .from('shoutouts')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(50),
    serviceClient
      .from('recovery_codes')
      .select('code_display')
      .eq('session_id', sessionId)
      .single(),
  ])

  const count = countResult.count ?? 0
  const shoutouts = (shoutoutsResult.data ?? []) as ProfileData['shoutouts']
  let recoveryCode: string | null = codeResult.data?.code_display ?? null

  // If no recovery code exists and user is eligible (5+ shoutouts), create one
  if (!recoveryCode && count >= 5) {
    const code = generateCode()
    const { error } = await serviceClient.from('recovery_codes').insert({
      session_id: sessionId,
      code_hash: code.replace('-', '').toUpperCase(),
      code_display: code,
    })
    if (!error) recoveryCode = code
  }

  return { count, shoutouts, recoveryCode }
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let code = ''
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-'
    code += chars[randomInt(chars.length)]
  }
  return code
}

export async function getOrCreateRecoveryCode(sessionId: string): Promise<string | null> {
  if (!UUID_RE.test(sessionId)) return null
  // Use service client to bypass RLS (SELECT on recovery_codes is blocked for anon)
  const supabase = createServiceClient()

  // Check if already has a code
  const { data: existing } = await supabase
    .from('recovery_codes')
    .select('code_display')
    .eq('session_id', sessionId)
    .single()

  if (existing) return existing.code_display

  // Check if eligible (5+ shoutouts)
  const count = await getShoutoutCount(sessionId)
  if (count < 5) return null

  // Generate and store
  const code = generateCode()
  const { error } = await supabase.from('recovery_codes').insert({
    session_id: sessionId,
    code_hash: code.replace('-', '').toUpperCase(),
    code_display: code,
  })

  if (error) {
    console.error('[profile] Failed to create recovery code:', error)
    return null
  }

  return code
}

export interface TopUser {
  session_id: string
  alias: string
  count: number
}

export async function getTopUsers(): Promise<TopUser[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_top_users')

  if (error || !data) return []
  return (data as { session_id: string; alias: string; count: number }[]).map(r => ({
    session_id: r.session_id,
    alias: r.alias,
    count: Number(r.count),
  }))
}

export async function restoreSession(code: string): Promise<{ sessionId: string; alias: string } | null> {
  const hash = code.replace('-', '').replace(/\s/g, '').toUpperCase()
  if (hash.length !== 8) return null

  const supabase = await createClient()

  // Use RPC to find session by code hash (SELECT on recovery_codes is blocked)
  const { data, error } = await supabase.rpc('restore_session_by_code', {
    p_code_hash: hash,
  })

  if (error || !data || data.length === 0) return null

  const sessionId = data[0].session_id

  // Get the latest alias used by this session
  const { data: latestShoutout } = await supabase
    .from('shoutouts')
    .select('alias')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return {
    sessionId,
    alias: latestShoutout?.alias ?? '',
  }
}
