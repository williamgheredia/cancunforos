export interface Rank {
  name: string
  badge: string
  minShoutouts: number
  nextAt: number | null
  progress: number // 0-100
}

const RANKS = [
  { name: 'Titan', badge: '🏆', min: 100 },
  { name: 'Leyenda', badge: '👑', min: 50 },
  { name: 'Veterano', badge: '⭐', min: 30 },
  { name: 'Reportero', badge: '📡', min: 15 },
  { name: 'Explorador', badge: '🔍', min: 5 },
  { name: 'Novato', badge: '🌱', min: 0 },
] as const

export function getRank(shoutoutCount: number): Rank {
  for (let i = 0; i < RANKS.length; i++) {
    const rank = RANKS[i]
    if (shoutoutCount >= rank.min) {
      const nextRank = i > 0 ? RANKS[i - 1] : null
      const nextAt = nextRank?.min ?? null
      const progress = nextAt
        ? Math.min(100, Math.round(((shoutoutCount - rank.min) / (nextAt - rank.min)) * 100))
        : 100

      return {
        name: rank.name,
        badge: rank.badge,
        minShoutouts: rank.min,
        nextAt,
        progress,
      }
    }
  }

  return { name: 'Novato', badge: '🌱', minShoutouts: 0, nextAt: 5, progress: 0 }
}
