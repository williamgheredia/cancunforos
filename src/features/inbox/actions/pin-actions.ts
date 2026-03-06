'use server'

import { createClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PIN_RE = /^\d{4}$/

export async function createPin(
  sessionId: string,
  pin: string
): Promise<{ success: true } | { error: string }> {
  if (!UUID_RE.test(sessionId)) return { error: 'Sesion invalida' }
  if (!PIN_RE.test(pin)) return { error: 'PIN debe ser 4 digitos' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('create_inbox_pin', {
    p_session_id: sessionId,
    p_pin: pin,
  })

  if (error) return { error: 'Error al crear PIN' }
  return { success: true }
}

export async function verifyPin(
  sessionId: string,
  pin: string
): Promise<boolean> {
  if (!UUID_RE.test(sessionId) || !PIN_RE.test(pin)) return false

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('verify_inbox_pin', {
    p_session_id: sessionId,
    p_pin: pin,
  })

  if (error) return false
  return data === true
}

export async function hasPin(sessionId: string): Promise<boolean> {
  if (!UUID_RE.test(sessionId)) return false

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('has_inbox_pin', {
    p_session_id: sessionId,
  })

  if (error) return false
  return data === true
}
