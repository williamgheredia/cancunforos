'use client'

import { useEffect, useState, useTransition, useRef, useCallback } from 'react'
import { getMessages, sendMessage, markConversationRead, type DirectMessage } from '../actions/inbox-actions'
import { getRelativeTime } from '@/shared/lib/geo-utils'

interface ChatViewProps {
  sessionId: string
  alias: string
  otherSessionId: string
  otherAlias: string
  pin: string
  onBack: () => void
}

export function ChatView({ sessionId, alias, otherSessionId, otherAlias, pin, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)
  const msgCountRef = useRef(0)

  const fetchMessages = useCallback(async () => {
    const data = await getMessages(sessionId, otherSessionId, pin)

    // Check for new messages from the other person → vibrate
    const incomingCount = data.filter(m => m.sender_session_id === otherSessionId).length
    const prevIncoming = messages.filter(m => m.sender_session_id === otherSessionId).length
    if (incomingCount > prevIncoming && prevIncoming > 0) {
      navigator.vibrate?.(200)
    }

    setMessages(data)
    msgCountRef.current = data.length
    markConversationRead(sessionId, otherSessionId, pin)
  }, [sessionId, otherSessionId, pin, messages])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getMessages(sessionId, otherSessionId, pin)
      setMessages(data)
      msgCountRef.current = data.length
      setLoading(false)
      markConversationRead(sessionId, otherSessionId, pin)
    }
    load()
  }, [sessionId, otherSessionId])

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages()
    }, 60_000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSend() {
    if (!text.trim() || isPending) return

    const optimistic: DirectMessage = {
      id: crypto.randomUUID(),
      sender_session_id: sessionId,
      sender_alias: alias,
      receiver_session_id: otherSessionId,
      receiver_alias: otherAlias,
      text: text.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, optimistic])
    const sent = text.trim()
    setText('')

    startTransition(async () => {
      const result = await sendMessage(sessionId, alias, otherSessionId, otherAlias, sent)
      if (result.error) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      } else if (result.message) {
        setMessages(prev => prev.map(m => m.id === optimistic.id ? result.message! : m))
      }
    })
  }

  return (
    <div className="flex flex-col" style={{ height: '70vh' }}>
      {/* Header */}
      <div className="bg-orange-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-3 py-2 flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="bg-white border-2 border-black px-2 py-0.5 font-black text-xs shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] transition-all duration-100"
        >
          ← VOLVER
        </button>
        <span className="font-black text-sm uppercase truncate ml-2">💬 {otherAlias}</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 bg-white border-x-[2.5px] border-black"
      >
        {loading ? (
          <p className="text-xs font-extrabold text-gray-400 uppercase text-center py-8">Cargando mensajes...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs font-extrabold text-gray-400 uppercase text-center py-8">Envia el primer mensaje</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_session_id === sessionId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] border-2 border-black px-3 py-2 shadow-[2px_2px_0_#000] ${
                    isMe ? 'bg-cyan-200' : 'bg-gray-100'
                  }`}
                >
                  {!isMe && (
                    <p className="text-[10px] font-black text-gray-500 mb-0.5">{msg.sender_alias}</p>
                  )}
                  <p className="text-sm font-medium">{msg.text}</p>
                  <p className="text-[10px] font-extrabold text-gray-400 mt-1 text-right">
                    {getRelativeTime(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-[2.5px] border-black shadow-[4px_4px_0_#000] p-2 flex gap-2 shrink-0">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Escribe un mensaje..."
          maxLength={500}
          className="flex-1 border-[2.5px] border-black px-2 py-1 text-sm font-medium shadow-[3px_3px_0_#000] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[1px_1px_0_#000] focus:outline-none transition-all duration-100"
          disabled={isPending}
        />
        <button
          onClick={handleSend}
          disabled={isPending || !text.trim()}
          className="bg-orange-300 border-2 border-black px-3 py-1 font-black text-sm shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100 disabled:opacity-50"
        >
          📨
        </button>
      </div>
    </div>
  )
}
