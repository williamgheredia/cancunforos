'use server'

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

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let code = ''
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-'
    code += chars[Math.floor(Math.random() * chars.length)]
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

  // Get all shoutouts, then aggregate client-side (Supabase JS doesn't support GROUP BY)
  const { data } = await supabase
    .from('shoutouts')
    .select('session_id, alias, created_at')
    .order('created_at', { ascending: false })

  if (!data || data.length === 0) return []

  // Group by session_id, count shoutouts, keep latest alias
  const map = new Map<string, { alias: string; count: number }>()
  for (const row of data) {
    const existing = map.get(row.session_id)
    if (existing) {
      existing.count++
    } else {
      map.set(row.session_id, { alias: row.alias, count: 1 })
    }
  }

  return Array.from(map.entries())
    .map(([session_id, { alias, count }]) => ({ session_id, alias, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
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
