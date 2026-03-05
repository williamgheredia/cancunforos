'use server'

import { createClient } from '@/lib/supabase/server'

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

export async function getConversations(sessionId: string): Promise<Conversation[]> {
  const supabase = await createClient()

  // Get all messages where user is sender or receiver
  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(`sender_session_id.eq.${sessionId},receiver_session_id.eq.${sessionId}`)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error || !data) return []

  const messages = data as DirectMessage[]
  const convMap = new Map<string, Conversation>()

  for (const msg of messages) {
    const isMe = msg.sender_session_id === sessionId
    const otherSessionId = isMe ? msg.receiver_session_id : msg.sender_session_id
    const otherAlias = isMe ? msg.receiver_alias : msg.sender_alias

    if (!convMap.has(otherSessionId)) {
      convMap.set(otherSessionId, {
        otherSessionId,
        otherAlias,
        lastMessage: msg.text,
        lastMessageAt: msg.created_at,
        unreadCount: 0,
        isSender: isMe,
      })
    }

    // Count unread (only messages TO me that are unread)
    if (!isMe && !msg.is_read) {
      const conv = convMap.get(otherSessionId)!
      conv.unreadCount++
    }
  }

  return Array.from(convMap.values()).sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )
}

export async function getMessages(
  sessionId: string,
  otherSessionId: string
): Promise<DirectMessage[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('direct_messages')
    .select('*')
    .or(
      `and(sender_session_id.eq.${sessionId},receiver_session_id.eq.${otherSessionId}),and(sender_session_id.eq.${otherSessionId},receiver_session_id.eq.${sessionId})`
    )
    .order('created_at', { ascending: true })
    .limit(50)

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

export async function getUnreadCount(sessionId: string): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('direct_messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_session_id', sessionId)
    .eq('is_read', false)

  if (error) return 0
  return count ?? 0
}

export async function markConversationRead(
  sessionId: string,
  otherSessionId: string
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('direct_messages')
    .update({ is_read: true })
    .eq('sender_session_id', otherSessionId)
    .eq('receiver_session_id', sessionId)
    .eq('is_read', false)
}
