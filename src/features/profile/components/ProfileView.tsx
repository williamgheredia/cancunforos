'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSessionStore } from '@/shared/stores/session-store'
import { getProfileData, getShoutoutCount, getOrCreateRecoveryCode, restoreSession, getTopUsers, type TopUser, type ProfileData } from '../actions/profile-actions'
import { getMyShoutouts } from '@/features/feed/actions/feed-actions'
import type { ShoutoutRow } from '@/features/feed/actions/feed-actions'
import { getRank } from '@/shared/lib/rank-utils'
import { getRelativeTime } from '@/shared/lib/geo-utils'

type ProfileTab = 'perfil' | 'ranking'

interface ProfileViewProps {
  onClose: () => void
  onCreateShoutout: () => void
}

const PODIUM_STYLES = ['bg-yellow-300', 'bg-gray-200', 'bg-amber-200']

export function ProfileView({ onClose, onCreateShoutout }: ProfileViewProps) {
  const { sessionId, alias, restoreSession: restoreStore } = useSessionStore()
  const [profileTab, setProfileTab] = useState<ProfileTab>('perfil')
  const [count, setCount] = useState(0)
  const [shoutouts, setShoutouts] = useState<ShoutoutRow[]>([])
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  const [rankingLoaded, setRankingLoaded] = useState(false)

  // Restore mode
  const [showRestore, setShowRestore] = useState(false)
  const [restoreCode, setRestoreCode] = useState('')
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!sessionId) return

    getProfileData(sessionId)
      .then(({ count: c, shoutouts: s, recoveryCode: code }) => {
        setCount(c)
        setShoutouts(s as ShoutoutRow[])
        setRecoveryCode(code)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sessionId])

  // Load ranking lazily when tab switches
  useEffect(() => {
    if (profileTab === 'ranking' && !rankingLoaded) {
      getTopUsers().then(users => {
        setTopUsers(users)
        setRankingLoaded(true)
      }).catch(() => {})
    }
  }, [profileTab, rankingLoaded])

  const rank = getRank(count)

  function handleCopyCode() {
    if (!recoveryCode) return
    navigator.clipboard?.writeText(recoveryCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleRestore() {
    if (!restoreCode.trim()) return

    startTransition(async () => {
      setRestoreError(null)
      const result = await restoreSession(restoreCode.trim())
      if (!result) {
        setRestoreError('Codigo no encontrado. Verifica e intenta de nuevo.')
        return
      }

      restoreStore(result.sessionId, result.alias)
      setShowRestore(false)
      setRestoreCode('')
      const profile = await getProfileData(result.sessionId)
      setCount(profile.count)
      setShoutouts(profile.shoutouts as ShoutoutRow[])
      setRecoveryCode(profile.recoveryCode)
    })
  }

  const subTabStyle = (t: ProfileTab) =>
    `border-2 border-black px-3 py-1 font-black text-xs uppercase transition-all duration-100 ${
      profileTab === t
        ? 'bg-black text-yellow-300 translate-x-[1px] translate-y-[1px]'
        : 'bg-white shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000]'
    }`

  if (loading) {
    return (
      <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-8 text-center">
        <p className="font-black uppercase animate-pulse">Cargando perfil...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + Sub-tabs */}
      <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000]">
        <div className="bg-yellow-300 border-b-[2.5px] border-black px-4 py-2 flex items-center justify-between">
          <h2 className="font-black uppercase text-sm">Mi Perfil</h2>
          <button
            onClick={onClose}
            className="bg-black text-white font-black text-xs px-2 py-0.5 hover:bg-gray-800 transition-all duration-100"
          >
            VOLVER
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2 px-4 py-3 border-b-[2px] border-black bg-gray-50">
          <button onClick={() => setProfileTab('perfil')} className={subTabStyle('perfil')}>
            👤 MI PERFIL
          </button>
          <button onClick={() => setProfileTab('ranking')} className={subTabStyle('ranking')}>
            🏆 TOP 10
          </button>
        </div>

        {/* Profile info (always visible) */}
        <div className="p-4">
          <div className="text-center mb-4">
            <p className="text-2xl font-black">{rank.badge} {alias}</p>
            <p className="text-sm font-extrabold text-gray-600 mt-1">
              Rango: <span className="text-black">{rank.name}</span>
            </p>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-extrabold mb-1">
              <span>{count} shoutouts</span>
              {rank.nextAt ? (
                <span>{rank.nextAt - count} para {getRank(rank.nextAt).name} {getRank(rank.nextAt).badge}</span>
              ) : (
                <span>Rango maximo!</span>
              )}
            </div>
            <div className="h-4 border-[2px] border-black bg-gray-100">
              <div
                className="h-full bg-yellow-300 transition-all duration-300"
                style={{ width: `${rank.progress}%` }}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <div className="border-2 border-black bg-cyan-100 px-3 py-1 text-center">
              <p className="text-lg font-black">{count}</p>
              <p className="text-[10px] font-extrabold uppercase">Shoutouts</p>
            </div>
            <div className="border-2 border-black bg-violet-100 px-3 py-1 text-center">
              <p className="text-lg font-black">{rank.badge}</p>
              <p className="text-[10px] font-extrabold uppercase">{rank.name}</p>
            </div>
          </div>
        </div>
      </div>

      {profileTab === 'perfil' ? (
        <>
          {/* Recovery code */}
          {recoveryCode && (
            <div className="border-[2.5px] border-black bg-emerald-50 shadow-[4px_4px_0_#000] p-4">
              <p className="text-xs font-extrabold uppercase text-gray-600 mb-2">
                Codigo de respaldo
              </p>
              <div className="flex items-center gap-2">
                <span className="flex-1 bg-white border-2 border-black px-3 py-2 font-mono font-black text-lg text-center tracking-widest">
                  {recoveryCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="border-2 border-black bg-emerald-300 px-3 py-2 font-black text-xs uppercase shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000] transition-all duration-100"
                >
                  {copied ? 'COPIADO!' : 'COPIAR'}
                </button>
              </div>
              <p className="text-[10px] font-extrabold text-gray-500 mt-2">
                Guarda este codigo para recuperar tu cuenta si cambias de dispositivo.
              </p>
            </div>
          )}

          {/* Restore session */}
          {!recoveryCode && (
            <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-4">
              {!showRestore ? (
                <button
                  onClick={() => setShowRestore(true)}
                  className="w-full text-xs font-extrabold text-gray-500 hover:text-black transition-all duration-100"
                >
                  Tengo un codigo de respaldo
                </button>
              ) : (
                <div>
                  <p className="text-xs font-extrabold uppercase text-gray-600 mb-2">
                    Restaurar sesion
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={restoreCode}
                      onChange={e => setRestoreCode(e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX"
                      maxLength={9}
                      className="flex-1 border-2 border-black px-3 py-2 font-mono font-black text-center tracking-widest text-sm focus:outline-none"
                    />
                    <button
                      onClick={handleRestore}
                      disabled={isPending || restoreCode.length < 8}
                      className="border-2 border-black bg-yellow-300 px-3 py-2 font-black text-xs uppercase shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000] transition-all duration-100 disabled:opacity-50"
                    >
                      {isPending ? '...' : 'RESTAURAR'}
                    </button>
                  </div>
                  {restoreError && (
                    <p className="text-xs font-extrabold text-red-500 mt-2">{restoreError}</p>
                  )}
                  <button
                    onClick={() => { setShowRestore(false); setRestoreCode(''); setRestoreError(null) }}
                    className="text-[10px] font-extrabold text-gray-400 mt-2 hover:text-black"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* My shoutouts */}
          <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000]">
            <div className="bg-cyan-200 border-b-[2.5px] border-black px-4 py-2">
              <h3 className="font-black uppercase text-xs">
                Mis Shoutouts ({count})
              </h3>
            </div>

            {shoutouts.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-4xl mb-3">📡</p>
                <p className="font-black text-sm mb-1">Aun no tienes shoutouts</p>
                <p className="text-xs text-gray-500 font-extrabold mb-4">
                  Comparte lo que pasa cerca de ti
                </p>
                <button
                  onClick={() => { onClose(); onCreateShoutout() }}
                  className="bg-yellow-300 border-2 border-black shadow-[3px_3px_0_#000] px-4 py-2 font-black text-xs uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000] transition-all duration-100"
                >
                  Publicar mi primer shoutout
                </button>
                <div className="mt-4 border-t-2 border-dashed border-gray-200 pt-4">
                  <p className="text-[10px] font-extrabold text-gray-400 uppercase">
                    Publica 5 shoutouts para obtener tu codigo de respaldo
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y-2 divide-black max-h-[400px] overflow-y-auto">
                {shoutouts.map(s => (
                  <div key={s.id} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{s.emoji}</span>
                      <span className="text-[10px] font-extrabold text-gray-500 uppercase">{s.category}</span>
                      <span className="text-[10px] text-gray-400 font-extrabold ml-auto">
                        {getRelativeTime(s.created_at)}
                      </span>
                    </div>
                    <p className="text-xs font-medium">{s.text}</p>
                    <div className="flex gap-3 mt-1 text-[10px] font-extrabold text-gray-400">
                      <span>✅{s.reactions_confirm}</span>
                      <span>🤔{s.reactions_doubt}</span>
                      <span>💬{s.comments_count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rank milestones */}
          <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000] p-4">
            <h3 className="font-black uppercase text-xs mb-3">Rangos</h3>
            <div className="space-y-2">
              {[
                { badge: '🌱', name: 'Novato', min: 0 },
                { badge: '🔍', name: 'Explorador', min: 5, perk: 'Codigo de respaldo' },
                { badge: '📡', name: 'Reportero', min: 15 },
                { badge: '⭐', name: 'Veterano', min: 30 },
                { badge: '👑', name: 'Leyenda', min: 50 },
                { badge: '🏆', name: 'Titan', min: 100 },
              ].map(r => {
                const achieved = count >= r.min
                return (
                  <div
                    key={r.name}
                    className={`flex items-center gap-2 px-2 py-1 text-xs font-extrabold ${
                      achieved ? 'text-black' : 'text-gray-300'
                    }`}
                  >
                    <span className="text-base">{r.badge}</span>
                    <span className="uppercase">{r.name}</span>
                    <span className="text-gray-400 ml-auto">{r.min}+</span>
                    {r.perk && achieved && (
                      <span className="text-[9px] bg-emerald-200 border border-black px-1">{r.perk}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        /* RANKING TAB */
        <div className="border-[2.5px] border-black bg-white shadow-[4px_4px_0_#000]">
          <div className="bg-orange-300 border-b-[2.5px] border-black px-4 py-2">
            <h3 className="font-black uppercase text-xs">
              Top 10 Usuarios
            </h3>
          </div>

          {topUsers.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-4xl mb-3">🏆</p>
              <p className="font-black text-sm">Aun no hay ranking</p>
              <p className="text-xs text-gray-500 font-extrabold mt-1">
                Se el primero en publicar!
              </p>
            </div>
          ) : (
            <div className="divide-y-2 divide-black">
              {topUsers.map((user, i) => {
                const userRank = getRank(user.count)
                const isMe = user.session_id === sessionId
                const position = i + 1

                return (
                  <div
                    key={user.session_id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      isMe ? 'bg-yellow-50' : ''
                    } ${i < 3 ? PODIUM_STYLES[i] + '/30' : ''}`}
                  >
                    {/* Position */}
                    <span className={`font-black text-lg w-8 text-center ${
                      i === 0 ? 'text-yellow-600' :
                      i === 1 ? 'text-gray-500' :
                      i === 2 ? 'text-amber-600' :
                      'text-gray-400'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${position}`}
                    </span>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black truncate ${isMe ? 'text-yellow-700' : ''}`}>
                        {userRank.badge} {user.alias}
                        {isMe && <span className="text-[9px] ml-1 bg-yellow-300 border border-black px-1 font-extrabold">TU</span>}
                      </p>
                      <p className="text-[10px] font-extrabold text-gray-500">
                        {userRank.name}
                      </p>
                    </div>

                    {/* Count */}
                    <div className="border-2 border-black bg-white px-2 py-1 text-center">
                      <p className="text-sm font-black">{user.count}</p>
                      <p className="text-[8px] font-extrabold uppercase text-gray-500">shouts</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
