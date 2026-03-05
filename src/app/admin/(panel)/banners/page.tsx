import { getBanners } from '@/features/admin/actions/moderation'
import { BannerManagement } from './BannerManagement'

export default async function AdminBannersPage() {
  const banners = await getBanners()

  const active = banners.filter(b => b.is_active)
  const inactive = banners.filter(b => !b.is_active)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-3xl">📣 Gestion de Banners</h1>
        <div className="flex gap-2">
          <span className="badge-brutal bg-brutal-lime">{active.length} activos</span>
          <span className="badge-brutal bg-foreground-muted text-white">{inactive.length} inactivos</span>
        </div>
      </div>

      <BannerManagement banners={banners} />
    </div>
  )
}
