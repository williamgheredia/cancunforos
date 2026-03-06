'use server'

import { createClient } from '@/lib/supabase/server'
import { siteConfig } from '@/config/siteConfig'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ReactionType = 'confirm' | 'doubt'

interface ReactionResult {
  confirm: number
  doubt: number
  userReaction: ReactionType
}

export async function reactToShoutout(
  shoutoutId: string,
  sessionId: string,
  type: ReactionType
): Promise<ReactionResult | { error: string }> {
  if (!UUID_RE.test(shoutoutId) || !UUID_RE.test(sessionId)) return { error: 'ID invalido' }
  const supabase = await createClient()

  // Check if user already reacted
  const { data: existing } = await supabase
    .from('reactions')
    .select('id, type')
    .eq('shoutout_id', shoutoutId)
    .eq('session_id', sessionId)
    .single()

  if (existing) {
    if (existing.type === type) {
      // Same reaction, no change needed
      const { data: shoutout } = await supabase
        .from('shoutouts')
        .select('reactions_confirm, reactions_doubt')
        .eq('id', shoutoutId)
        .single()

      return {
        confirm: shoutout?.reactions_confirm ?? 0,
        doubt: shoutout?.reactions_doubt ?? 0,
        userReaction: type,
      }
    }

    // Change reaction type
    const { error: updateError } = await supabase
      .from('reactions')
      .update({ type })
      .eq('id', existing.id)

    if (updateError) return { error: 'Error al cambiar reaccion' }

    // Atomic adjust: +1 new type, -1 old type
    const addCol = type === 'confirm' ? 'reactions_confirm' : 'reactions_doubt'
    const subCol = type === 'confirm' ? 'reactions_doubt' : 'reactions_confirm'
    await Promise.all([
      supabase.rpc('increment_counter', { row_id: shoutoutId, table_name: 'shoutouts', column_name: addCol, amount: 1 }),
      supabase.rpc('increment_counter', { row_id: shoutoutId, table_name: 'shoutouts', column_name: subCol, amount: -1 }),
    ])

    // Re-read for collapse check
    const { data: shoutout } = await supabase
      .from('shoutouts')
      .select('reactions_confirm, reactions_doubt')
      .eq('id', shoutoutId)
      .single()

    if (!shoutout) return { error: 'Shoutout no encontrado' }

    const total = shoutout.reactions_confirm + shoutout.reactions_doubt
    const shouldCollapse = total > 0 && shoutout.reactions_doubt / total >= siteConfig.features.collapseDoubtThreshold
    await supabase.rpc('set_shoutout_collapsed', { p_shoutout_id: shoutoutId, p_collapsed: shouldCollapse })

    return { confirm: shoutout.reactions_confirm, doubt: shoutout.reactions_doubt, userReaction: type }
  }

  // New reaction
  const { error: insertError } = await supabase
    .from('reactions')
    .insert({ shoutout_id: shoutoutId, session_id: sessionId, type })

  if (insertError) return { error: 'Error al reaccionar' }

  // Atomic increment the appropriate counter
  const col = type === 'confirm' ? 'reactions_confirm' : 'reactions_doubt'
  await supabase.rpc('increment_counter', {
    row_id: shoutoutId,
    table_name: 'shoutouts',
    column_name: col,
  })

  // Re-read to get accurate totals for collapse check
  const { data: shoutout } = await supabase
    .from('shoutouts')
    .select('reactions_confirm, reactions_doubt')
    .eq('id', shoutoutId)
    .single()

  if (!shoutout) return { error: 'Shoutout no encontrado' }

  // Check collapse threshold
  const total = shoutout.reactions_confirm + shoutout.reactions_doubt
  const shouldCollapse = total > 0 && shoutout.reactions_doubt / total >= siteConfig.features.collapseDoubtThreshold
  if (shouldCollapse) {
    await supabase.rpc('set_shoutout_collapsed', { p_shoutout_id: shoutoutId, p_collapsed: true })
  }

  return { confirm: shoutout.reactions_confirm, doubt: shoutout.reactions_doubt, userReaction: type }
}

export async function getUserReactions(
  shoutoutIds: string[],
  sessionId: string
): Promise<Record<string, ReactionType>> {
  if (shoutoutIds.length === 0 || !UUID_RE.test(sessionId)) return {}
  const validIds = shoutoutIds.filter(id => UUID_RE.test(id)).slice(0, 100)
  if (validIds.length === 0) return {}

  const supabase = await createClient()
  const { data } = await supabase
    .from('reactions')
    .select('shoutout_id, type')
    .eq('session_id', sessionId)
    .in('shoutout_id', validIds)

  const map: Record<string, ReactionType> = {}
  for (const r of data ?? []) {
    map[r.shoutout_id] = r.type as ReactionType
  }
  return map
}
