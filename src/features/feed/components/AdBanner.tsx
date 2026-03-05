'use client'

import { useEffect, useState } from 'react'
import { getActiveBanners } from '@/features/admin/actions/moderation'
import type { Banner } from '@/features/admin/types'

interface AdBannerProps {
  position?: string
}

export function AdBanner({ position = 'sidebar' }: AdBannerProps) {
  const [banners, setBanners] = useState<Banner[]>([])

  useEffect(() => {
    getActiveBanners(position).then(setBanners).catch(() => {})
  }, [position])

  if (banners.length === 0) return null

  return (
    <div className="space-y-3">
      {banners.map(banner => (
        <a
          key={banner.id}
          href={banner.link_url || '#'}
          target={banner.link_url ? '_blank' : undefined}
          rel={banner.link_url ? 'noopener noreferrer' : undefined}
          className="block border-[2.5px] border-black shadow-[4px_4px_0_#000] overflow-hidden hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] transition-all duration-100"
        >
          <img
            src={banner.image_url}
            alt={banner.title}
            className="w-full h-auto block"
          />
        </a>
      ))}
    </div>
  )
}
