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

  // Classify with AI + moderation
  const { classification, blocked } = await classifyShoutout(text)

  if (blocked) {
    return { error: 'Tu shoutout no pudo ser publicado porque contiene contenido no permitido.' }
  }

  // Calculate expiration
  const expiresAt = new Date(
    Date.now() + siteConfig.features.shoutoutTTLHours * 60 * 60 * 1000
  ).toISOString()

  const supabase = await createClient()
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
  })

  if (error) {
    return { error: 'Error al publicar. Intenta de nuevo.' }
  }

  return { success: true }
}
