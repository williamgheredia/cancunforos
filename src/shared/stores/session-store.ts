'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateAlias } from '../lib/alias-generator'

interface SessionState {
  sessionId: string
  alias: string
  aliasCreatedAt: number
  initSession: () => void
}

function generateSessionId(): string {
  return crypto.randomUUID()
}

const ALIAS_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionId: '',
      alias: '',
      aliasCreatedAt: 0,

      initSession: () => {
        const state = get()
        const now = Date.now()

        // Generate session_id if missing
        const sessionId = state.sessionId || generateSessionId()

        // Regenerate alias if missing or expired (24h privacy)
        const aliasExpired = now - state.aliasCreatedAt > ALIAS_TTL_MS
        const alias = !state.alias || aliasExpired ? generateAlias() : state.alias
        const aliasCreatedAt = aliasExpired ? now : state.aliasCreatedAt

        set({ sessionId, alias, aliasCreatedAt })
      },
    }),
    {
      name: 'cancunforos-session',
    }
  )
)
