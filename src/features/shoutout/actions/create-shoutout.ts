'use server'

import { createClient } from '@/lib/supabase/server'
import { createShoutoutSchema } from '../schemas/shoutout-schema'
import { classifyShoutout } from './classify-shoutout'
import { siteConfig } from '@/config/siteConfig'

export async function createShoutout(input: {
  text: string
  lat: number
  lng: number
  sessionId: string
  alias: string
  source?: 'text' | 'voice'
}): Promise<{ success: true } | { error: string }> {
  const parsed = createShoutoutSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { text, lat, lng, sessionId, alias, source } = parsed.data

  // Rate limit: 1 shoutout every 15 minutes per session
  const supabase = await createClient()
  const { data: lastShoutout } = await supabase
    .from('shoutouts')
    .select('created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (lastShoutout?.created_at) {
    const elapsed = Date.now() - new Date(lastShoutout.created_at).getTime()
    const cooldownMs = 15 * 60 * 1000
    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 60_000)
      return { error: `Espera ${remaining} minuto${remaining > 1 ? 's' : ''} para publicar otro shoutout.` }
    }
  }

  // Classify with AI + moderation
  const { classification, blocked, isPromo } = await classifyShoutout(text)

  if (blocked) {
    return { error: 'Tu shoutout no pudo ser publicado porque contiene contenido no permitido.' }
  }

  // Calculate expiration
  const expiresAt = new Date(
    Date.now() + siteConfig.features.shoutoutTTLHours * 60 * 60 * 1000
  ).toISOString()

  const { error } = await supabase.from('shoutouts').insert({
    session_id: sessionId,
    alias,
    text,
    summary: classification.summary,
    category: classification.category,
    emoji: classification.emoji,
    source,
    lat,
    lng,
    expires_at: expiresAt,
    is_promo: isPromo,
  })

  if (error) {
    return { error: 'Error al publicar. Intenta de nuevo.' }
  }

  return { success: true }
}
