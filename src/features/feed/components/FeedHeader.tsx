import { siteConfig } from '@/config/siteConfig'

interface FeedHeaderProps {
  alias: string
}

export function FeedHeader({ alias }: FeedHeaderProps) {
  return (
    <nav className="navbar-brutal flex items-center justify-between">
      <span className="bg-black text-yellow-300 px-3 py-1 font-black text-sm uppercase">
        {siteConfig.appName}
      </span>
      <span className="text-xs font-extrabold text-gray-500 truncate max-w-[200px]">
        👤 {alias}
      </span>
    </nav>
  )
}
