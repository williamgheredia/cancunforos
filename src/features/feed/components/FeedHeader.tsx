import { siteConfig } from '@/config/siteConfig'

interface FeedHeaderProps {
  alias: string
  rankBadge?: string
  onAliasClick?: () => void
}

export function FeedHeader({ alias, rankBadge, onAliasClick }: FeedHeaderProps) {
  return (
    <nav className="navbar-brutal flex items-center justify-between">
      <span className="bg-black text-yellow-300 px-3 py-1 font-black text-sm uppercase">
        {siteConfig.appName}
      </span>
      <button
        onClick={onAliasClick}
        className="border-2 border-black bg-white px-3 py-1 font-extrabold text-xs truncate max-w-[200px] shadow-[3px_3px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-100"
      >
        {rankBadge || '🌱'} {alias}
      </button>
    </nav>
  )
}
