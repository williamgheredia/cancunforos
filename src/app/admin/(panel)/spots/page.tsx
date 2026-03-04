import { getSpots } from '@/features/admin/actions/moderation'
import { SpotManagement } from '@/features/admin/components'

export default async function AdminSpotsPage() {
  const spots = await getSpots()

  const active = spots.filter(s => s.is_active)
  const inactive = spots.filter(s => !s.is_active)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-3xl">📍 Gestion de Spots</h1>
        <div className="flex gap-2">
          <span className="badge-brutal bg-brutal-lime">{active.length} activos</span>
          <span className="badge-brutal bg-foreground-muted text-white">{inactive.length} inactivos</span>
        </div>
      </div>

      <SpotManagement spots={spots} />
    </div>
  )
}
