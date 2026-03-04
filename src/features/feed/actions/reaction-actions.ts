'use server'

import { createClient } from '@/lib/supabase/server'
import { siteConfig } from '@/config/siteConfig'

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

    // Adjust counters: +1 new type, -1 old type
    const confirmDelta = type === 'confirm' ? 1 : -1
    const doubtDelta = type === 'doubt' ? 1 : -1

    const { data: shoutout } = await supabase
      .from('shoutouts')
      .select('reactions_confirm, reactions_doubt')
      .eq('id', shoutoutId)
      .single()

    if (!shoutout) return { error: 'Shoutout no encontrado' }

    const newConfirm = Math.max(0, shoutout.reactions_confirm + confirmDelta)
    const newDoubt = Math.max(0, shoutout.reactions_doubt + doubtDelta)

    await updateShoutoutCounters(supabase, shoutoutId, newConfirm, newDoubt)

    return { confirm: newConfirm, doubt: newDoubt, userReaction: type }
  }

  // New reaction
  const { error: insertError } = await supabase
    .from('reactions')
    .insert({ shoutout_id: shoutoutId, session_id: sessionId, type })

  if (insertError) return { error: 'Error al reaccionar' }

  // Increment counter
  const { data: shoutout } = await supabase
    .from('shoutouts')
    .select('reactions_confirm, reactions_doubt')
    .eq('id', shoutoutId)
    .single()

  if (!shoutout) return { error: 'Shoutout no encontrado' }

  const newConfirm = shoutout.reactions_confirm + (type === 'confirm' ? 1 : 0)
  const newDoubt = shoutout.reactions_doubt + (type === 'doubt' ? 1 : 0)

  await updateShoutoutCounters(supabase, shoutoutId, newConfirm, newDoubt)

  return { confirm: newConfirm, doubt: newDoubt, userReaction: type }
}

async function updateShoutoutCounters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shoutoutId: string,
  confirm: number,
  doubt: number
) {
  const total = confirm + doubt
  const shouldCollapse =
    total > 0 &&
    doubt / total >= siteConfig.features.collapseDoubtThreshold

  await supabase
    .from('shoutouts')
    .update({
      reactions_confirm: confirm,
      reactions_doubt: doubt,
      is_collapsed: shouldCollapse,
    })
    .eq('id', shoutoutId)
}

export async function getUserReactions(
  shoutoutIds: string[],
  sessionId: string
): Promise<Record<string, ReactionType>> {
  if (shoutoutIds.length === 0 || !sessionId) return {}

  const supabase = await createClient()
  const { data } = await supabase
    .from('reactions')
    .select('shoutout_id, type')
    .eq('session_id', sessionId)
    .in('shoutout_id', shoutoutIds)

  const map: Record<string, ReactionType> = {}
  for (const r of data ?? []) {
    map[r.shoutout_id] = r.type as ReactionType
  }
  return map
}
