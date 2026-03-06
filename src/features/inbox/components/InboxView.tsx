'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { getConversations, type Conversation } from '../actions/inbox-actions'
import { getNearbyPeople, type PersonRow } from '@/features/people/actions/people-actions'
import { useSessionStore } from '@/shared/stores/session-store'
import { siteConfig } from '@/config/siteConfig'
import { formatDistance, calculateDistance } from '@/shared/lib/geo-utils'
import { ConversationList } from './ConversationList'
import { ChatView } from './ChatView'
import { PinGate, usePinStore } from './PinGate'

interface InboxViewProps {
  lat: number
  lng: number
  openChatWith?: { sessionId: string; alias: string } | null
  onUnreadUpdate?: (count: number) => void
}

type View = 'list' | 'chat' | 'people'

export function InboxView({ lat, lng, openChatWith, onUnreadUpdate }: InboxViewProps) {
  const [pin, setPin] = useState<string | null>(null)

  return (
    <PinGate onPinReady={setPin}>
      {pin && <InboxContent lat={lat} lng={lng} openChatWith={openChatWith} onUnreadUpdate={onUnreadUpdate} pin={pin} />}
    </PinGate>
  )
}

interface InboxContentProps extends InboxViewProps {
  pin: string
}

function InboxContent({ lat, lng, openChatWith, onUnreadUpdate, pin }: InboxContentProps) {
  const [view, setView] = useState<View>(openChatWith ? 'chat' : 'list')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [people, setPeople] = useState<PersonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [chatTarget, setChatTarget] = useState<{ sessionId: string; alias: string } | null>(openChatWith ?? null)
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const { sessionId, alias } = useSessionStore()
  const prevUnreadRef = useRef(0)

  // Open chat when openChatWith changes
  useEffect(() => {
    if (openChatWith) {
      setChatTarget(openChatWith)
      setView('chat')
    }
  }, [openChatWith])

  const fetchConversations = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const data = await getConversations(sessionId, pin)
      // Check if new unreads arrived → vibrate
      const totalUnread = data.reduce((sum, c) => sum + c.unreadCount, 0)
      if (totalUnread > prevUnreadRef.current && prevUnreadRef.current > 0) {
        navigator.vibrate?.(200)
      }
      prevUnreadRef.current = totalUnread
      onUnreadUpdate?.(totalUnread)
      setConversations(data)
    } catch {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [sessionId, pin])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => clearInterval(cooldownRef.current)
  }, [])

  const fetchPeople = useCallback(async () => {
    if (!sessionId) return
    try {
      const data = await getNearbyPeople(lat, lng, siteConfig.features.radiusKm, sessionId)
      setPeople(data)
    } catch {
      setPeople([])
    }
  }, [lat, lng, sessionId])

  function handleRefresh() {
    if (cooldown > 0) return
    fetchConversations()
    setCooldown(90)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  function openChat(targetSessionId: string, targetAlias: string) {
    setChatTarget({ sessionId: targetSessionId, alias: targetAlias })
    setView('chat')
  }

  function handleNewConversation() {
    fetchPeople()
    setView('people')
  }

  function handleBackFromChat() {
    setChatTarget(null)
    setView('list')
    fetchConversations()
  }

  if (view === 'chat' && chatTarget) {
    return (
      <ChatView
        sessionId={sessionId}
        alias={alias}
        otherSessionId={chatTarget.sessionId}
        otherAlias={chatTarget.alias}
        pin={pin}
        onBack={handleBackFromChat}
      />
    )
  }

  if (view === 'people') {
    return (
      <div>
        <div className="bg-orange-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-3 py-2 mb-3 flex items-center justify-between">
          <span className="font-black text-sm uppercase">👤 PERSONAS CERCA</span>
          <button
            onClick={() => setView('list')}
            className="bg-white border-2 border-black px-2 py-0.5 font-black text-xs shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] transition-all duration-100"
          >
            ← VOLVER
          </button>
        </div>

        {people.length === 0 ? (
          <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center">
            <span className="text-5xl block mb-3">👤</span>
            <p className="font-black text-xl mb-2 uppercase">Sin personas cerca</p>
            <p className="font-medium text-gray-600">No hay nadie activo en tu zona</p>
          </div>
        ) : (
          <div className="space-y-2">
            {people.map(person => {
              const dist = calculateDistance(lat, lng, person.lat, person.lng)
              return (
                <button
                  key={person.id}
                  onClick={() => openChat(person.session_id, person.alias)}
                  className="w-full border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] px-4 py-3 flex items-center justify-between hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-200 border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center text-lg font-black">
                      👤
                    </div>
                    <p className="font-black text-sm">{person.alias}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm">{formatDistance(dist)}</p>
                    <p className="text-[10px] font-extrabold text-gray-400">TAP PARA CHATEAR</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Default: conversation list
  return (
    <div>
      <div className="bg-orange-300 border-[2.5px] border-black shadow-[4px_4px_0_#000] px-3 py-2 mb-3 flex items-center justify-between">
        <span className="font-black text-sm uppercase">📨 INBOX</span>
        <button
          onClick={handleRefresh}
          disabled={cooldown > 0}
          className={`border-2 border-black px-2 py-0.5 font-black text-xs transition-all duration-100 ${
            cooldown > 0
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-white shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]'
          }`}
        >
          {cooldown > 0 ? `ACTUALIZAR (${cooldown}s)` : 'ACTUALIZAR'}
        </button>
      </div>

      {loading ? (
        <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center animate-fade-in">
          <span className="text-4xl block mb-2">📨</span>
          <p className="font-black uppercase">Cargando inbox...</p>
        </div>
      ) : (
        <ConversationList
          conversations={conversations}
          onSelect={conv => openChat(conv.otherSessionId, conv.otherAlias)}
        />
      )}
    </div>
  )
}
