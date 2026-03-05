'use client'

import type { Conversation } from '../actions/inbox-actions'
import { getRelativeTime } from '@/shared/lib/geo-utils'

interface ConversationListProps {
  conversations: Conversation[]
  onSelect: (conv: Conversation) => void
}

export function ConversationList({ conversations, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center">
        <span className="text-5xl block mb-3">📨</span>
        <p className="font-black text-xl mb-2 uppercase">Sin mensajes</p>
        <p className="font-medium text-gray-600">
          Inicia una conversacion con alguien cercano
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {conversations.map(conv => (
        <button
          key={conv.otherSessionId}
          onClick={() => onSelect(conv)}
          className="w-full border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] px-4 py-3 flex items-center gap-3 text-left hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
        >
          <div className="w-10 h-10 bg-orange-200 border-2 border-black shadow-[2px_2px_0_#000] flex items-center justify-center text-lg font-black shrink-0">
            💬
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-black text-sm truncate">{conv.otherAlias}</p>
              <span className="text-[10px] font-extrabold text-gray-400 shrink-0 ml-2">
                {getRelativeTime(conv.lastMessageAt)}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
              {conv.isSender ? 'Tu: ' : ''}{conv.lastMessage}
            </p>
          </div>
          {conv.unreadCount > 0 && (
            <div className="w-6 h-6 bg-red-500 border-2 border-black rounded-full flex items-center justify-center shrink-0">
              <span className="text-white text-[10px] font-black">{conv.unreadCount}</span>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
