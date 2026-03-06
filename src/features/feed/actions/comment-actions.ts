'use server'

import { createClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface CommentRow {
  id: string
  shoutout_id: string
  session_id: string
  alias: string
  text: string
  created_at: string
}

export async function getComments(shoutoutId: string): Promise<CommentRow[]> {
  if (!UUID_RE.test(shoutoutId)) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('shoutout_id', shoutoutId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) throw new Error(error.message)
  return (data ?? []) as CommentRow[]
}

export async function addComment(input: {
  shoutoutId: string
  sessionId: string
  alias: string
  text: string
}): Promise<{ success: true; comment: CommentRow } | { error: string }> {
  if (!UUID_RE.test(input.shoutoutId) || !UUID_RE.test(input.sessionId)) {
    return { error: 'ID invalido' }
  }
  const text = input.text.trim()
  if (!text || text.length > 280) {
    return { error: 'El comentario debe tener entre 1 y 280 caracteres' }
  }

  const supabase = await createClient()

  // Insert comment
  const { data, error } = await supabase
    .from('comments')
    .insert({
      shoutout_id: input.shoutoutId,
      session_id: input.sessionId,
      alias: input.alias,
      text,
    })
    .select()
    .single()

  if (error) {
    return { error: 'Error al comentar. Intenta de nuevo.' }
  }

  // Atomic increment comments_count
  await supabase.rpc('increment_counter', {
    row_id: input.shoutoutId,
    table_name: 'shoutouts',
    column_name: 'comments_count',
  })

  return { success: true, comment: data as CommentRow }
}
