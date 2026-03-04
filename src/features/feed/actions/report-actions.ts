'use server'

import { createClient } from '@/lib/supabase/server'

const VALID_REASONS = ['spam', 'ofensivo', 'falso', 'otro'] as const
type ReportReason = (typeof VALID_REASONS)[number]

export async function reportShoutout(
  shoutoutId: string,
  sessionId: string,
  reason: ReportReason
): Promise<{ success: true } | { error: string }> {
  if (!VALID_REASONS.includes(reason)) {
    return { error: 'Razon de reporte invalida' }
  }

  const supabase = await createClient()

  // Check if already reported by this session
  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('shoutout_id', shoutoutId)
    .eq('session_id', sessionId)
    .single()

  if (existing) {
    return { error: 'Ya reportaste este shoutout' }
  }

  // Insert report
  const { error: insertError } = await supabase
    .from('reports')
    .insert({ shoutout_id: shoutoutId, session_id: sessionId, reason })

  if (insertError) {
    return { error: 'Error al reportar' }
  }

  // Increment reports_count
  const { data: shoutout } = await supabase
    .from('shoutouts')
    .select('reports_count')
    .eq('id', shoutoutId)
    .single()

  if (shoutout) {
    await supabase
      .from('shoutouts')
      .update({ reports_count: shoutout.reports_count + 1 })
      .eq('id', shoutoutId)
  }

  return { success: true }
}
