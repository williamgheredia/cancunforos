import { siteConfig } from '@/config/siteConfig'

interface FeedHeaderProps {
  alias: string
}

export function FeedHeader({ alias }: FeedHeaderProps) {
  return (
    <nav className="navbar-brutal flex items-center justify-between">
      <span className="bg-black text-white px-3 py-1 font-bold text-sm">
        {siteConfig.appName}
      </span>
      <span className="text-xs font-bold text-foreground-secondary truncate max-w-[200px]">
        👤 {alias}
      </span>
    </nav>
  )
}
