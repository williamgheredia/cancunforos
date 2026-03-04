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
        // Remove optimistic comment on error
        setComments(prev => prev.filter(c => c.id !== optimisticComment.id))
      } else {
        // Replace optimistic with real comment
        setComments(prev =>
          prev.map(c => c.id === optimisticComment.id ? result.comment : c)
        )
      }
    })
  }

  return (
    <div className="mt-3 pt-3 border-t-2 border-black/10">
      {loading ? (
        <p className="text-xs text-foreground-muted font-medium">Cargando comentarios...</p>
      ) : (
        <>
          {comments.length > 0 && (
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="text-xs">
                  <span className="font-bold">👤 {c.alias}</span>{' '}
                  <span className="text-foreground-muted">{getRelativeTime(c.created_at)}</span>
                  <p className="text-foreground-secondary mt-0.5">{c.text}</p>
                </div>
              ))}
            </div>
          )}

          {comments.length === 0 && (
            <p className="text-xs text-foreground-muted font-medium mb-2">Sin comentarios aun</p>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Escribe un comentario..."
              maxLength={280}
              className="flex-1 border-2 border-black rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brutal-cyan"
              disabled={isPending}
            />
            <button
              onClick={handleSubmit}
              disabled={isPending || !text.trim()}
              className="badge-brutal bg-brutal-cyan text-xs cursor-pointer disabled:opacity-50"
            >
              💬
            </button>
          </div>
        </>
      )}
    </div>
  )
}
