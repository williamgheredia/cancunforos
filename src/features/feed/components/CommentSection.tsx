'use client'

import { useEffect, useState, useTransition } from 'react'
import { getComments, addComment, type CommentRow } from '../actions/comment-actions'
import { getRelativeTime } from '@/shared/lib/geo-utils'

interface CommentSectionProps {
  shoutoutId: string
  sessionId: string
  alias: string
}

export function CommentSection({ shoutoutId, sessionId, alias }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getComments(shoutoutId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false))
  }, [shoutoutId])

  function handleSubmit() {
    if (!text.trim() || isPending) return

    const optimisticComment: CommentRow = {
      id: crypto.randomUUID(),
      shoutout_id: shoutoutId,
      session_id: sessionId,
      alias,
      text: text.trim(),
      created_at: new Date().toISOString(),
    }

    setComments(prev => [...prev, optimisticComment])
    const submittedText = text.trim()
    setText('')

    startTransition(async () => {
      const result = await addComment({
        shoutoutId,
        sessionId,
        alias,
        text: submittedText,
      })

      if ('error' in result) {
        setComments(prev => prev.filter(c => c.id !== optimisticComment.id))
      } else {
        setComments(prev =>
          prev.map(c => c.id === optimisticComment.id ? result.comment : c)
        )
      }
    })
  }

  return (
    <div className="mt-3 pt-3 border-t-2 border-black/10">
      {loading ? (
        <p className="text-xs font-extrabold text-gray-400 uppercase">Cargando comentarios...</p>
      ) : (
        <>
          {comments.length > 0 && (
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="text-xs border-b border-black/5 pb-1">
                  <span className="font-black">👤 {c.alias}</span>{' '}
                  <span className="text-gray-400 font-extrabold">{getRelativeTime(c.created_at)}</span>
                  <p className="text-gray-600 font-medium mt-0.5">{c.text}</p>
                </div>
              ))}
            </div>
          )}

          {comments.length === 0 && (
            <p className="text-xs font-extrabold text-gray-400 mb-2 uppercase">Sin comentarios aun</p>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Escribe un comentario..."
              maxLength={280}
              className="flex-1 border-[2.5px] border-black px-2 py-1 text-xs font-medium shadow-[3px_3px_0_#000] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-[1px_1px_0_#000] focus:outline-none transition-all duration-100"
              disabled={isPending}
            />
            <button
              onClick={handleSubmit}
              disabled={isPending || !text.trim()}
              className="bg-cyan-300 border-2 border-black px-3 py-1 font-black text-xs shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100 disabled:opacity-50"
            >
              💬
            </button>
          </div>
        </>
      )}
    </div>
  )
}
