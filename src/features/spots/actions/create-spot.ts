'use server'

import { createClient } from '@/lib/supabase/server'
import { createSpotSchema } from '../schemas/spot-schema'
import { classifySpot } from './classify-spot'

export async function createSpot(input: {
  name: string
  description?: string
  lat: number
  lng: number
  sessionId: string
}): Promise<{ success: true } | { error: string }> {
  const parsed = createSpotSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, description, lat, lng, sessionId } = parsed.data

  const classification = await classifySpot(name, description ?? '')

  const supabase = await createClient()
  const { error } = await supabase.from('spots').insert({
    session_id: sessionId,
    name,
    description: description || null,
    category: classification.category,
    emoji: classification.emoji,
    lat,
    lng,
  })

  if (error) {
    return { error: 'Error al crear spot. Intenta de nuevo.' }
  }

  return { success: true }
}
