'use server'

import { createClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidUUID(id: string): boolean { return UUID_RE.test(id) }

export interface DirectMessage {
  id: string
  sender_session_id: string
  sender_alias: string
  receiver_session_id: string
  receiver_alias: string
  text: string
  is_read: boolean
  created_at: string
}

export interface Conversation {
  otherSessionId: string
  otherAlias: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  isSender: boolean
}

export async function getConversations(sessionId: string, pin: string): Promise<Conversation[]> {
  if (!isValidUUID(sessionId) || !pin) return []
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_conversations', {
    p_session_id: sessionId,
    p_pin: pin,
  })

  if (error || !data) return []

  return (data as Array<{
    other_session_id: string
    other_alias: string
    last_message: string
    last_message_at: string
    unread_count: number
    is_sender: boolean
  }>).map(row => ({
    otherSessionId: row.other_session_id,
    otherAlias: row.other_alias,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count),
    isSender: row.is_sender,
  }))
}

export async function getMessages(
  sessionId: string,
  otherSessionId: string,
  pin: string
): Promise<DirectMessage[]> {
  if (!isValidUUID(sessionId) || !isValidUUID(otherSessionId) || !pin) return []
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_dm_messages', {
    p_session_id: sessionId,
    p_other_session_id: otherSessionId,
    p_pin: pin,
  })

  if (error) return []
  return (data ?? []) as DirectMessage[]
}

export async function sendMessage(
  senderSessionId: string,
  senderAlias: string,
  receiverSessionId: string,
  receiverAlias: string,
  text: string
): Promise<{ message?: DirectMessage; error?: string }> {
  if (!isValidUUID(senderSessionId) || !isValidUUID(receiverSessionId)) {
    return { error: 'Sesion invalida' }
  }
  if (!text.trim() || text.length > 500) {
    return { error: 'Mensaje invalido' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('direct_messages')
    .insert({
      sender_session_id: senderSessionId,
      sender_alias: senderAlias,
      receiver_session_id: receiverSessionId,
      receiver_alias: receiverAlias,
      text: text.trim(),
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { message: data as DirectMessage }
}

export async function getUnreadCount(sessionId: string, pin: string): Promise<number> {
  if (!isValidUUID(sessionId) || !pin) return 0
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_unread_dm_count', {
    p_session_id: sessionId,
    p_pin: pin,
  })

  if (error) return 0
  return data ?? 0
}

export async function markConversationRead(
  sessionId: string,
  otherSessionId: string,
  pin: string
): Promise<void> {
  if (!isValidUUID(sessionId) || !isValidUUID(otherSessionId) || !pin) return
  const supabase = await createClient()

  await supabase.rpc('mark_dm_read', {
    p_session_id: sessionId,
    p_other_session_id: otherSessionId,
    p_pin: pin,
  })
}
