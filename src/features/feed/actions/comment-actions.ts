'use server'

import { createClient } from '@/lib/supabase/server'

export interface CommentRow {
  id: string
  shoutout_id: string
  session_id: string
  alias: string
  text: string
  created_at: string
}

export async function getComments(shoutoutId: string): Promise<CommentRow[]> {
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

  // Increment comments_count on shoutout (read + update pattern)
  const { data: shoutout } = await supabase
    .from('shoutouts')
    .select('comments_count')
    .eq('id', input.shoutoutId)
    .single()

  await supabase
    .from('shoutouts')
    .update({ comments_count: (shoutout?.comments_count ?? 0) + 1 })
    .eq('id', input.shoutoutId)

  return { success: true, comment: data as CommentRow }
}
