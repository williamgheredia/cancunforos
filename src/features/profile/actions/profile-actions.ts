'use server'

import { createClient } from '@/lib/supabase/server'

export async function getShoutoutCount(sessionId: string): Promise<number> {
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
  const supabase = await createClient()

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
  const { data } = await supabase
    .from('recovery_codes')
    .select('session_id')
    .eq('code_hash', hash)
    .single()

  if (!data) return null

  // Get the latest alias used by this session
  const { data: latestShoutout } = await supabase
    .from('shoutouts')
    .select('alias')
    .eq('session_id', data.session_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return {
    sessionId: data.session_id,
    alias: latestShoutout?.alias ?? '',
  }
}
