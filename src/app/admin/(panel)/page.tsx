import { getReportedShoutouts, getAllShoutouts, getStats } from '@/features/admin/actions/moderation'
import { ShoutoutModerationList } from '@/features/admin/components'

export default async function AdminDashboardPage() {
  const [reported, all, stats] = await Promise.all([
    getReportedShoutouts(),
    getAllShoutouts(),
    getStats(),
  ])

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Shoutouts" value={stats.totalShoutouts} emoji="📢" color="bg-brutal-cyan" />
        <StatCard label="Reportados" value={stats.reportedShoutouts} emoji="🚩" color="bg-brutal-pink" />
        <StatCard label="Colapsados" value={stats.collapsedShoutouts} emoji="🔇" color="bg-brutal-orange" />
        <StatCard label="Spots Activos" value={stats.activeSpots} emoji="📍" color="bg-brutal-lime" />
        <StatCard label="Spots Inactivos" value={stats.inactiveSpots} emoji="💤" color="bg-brutal-yellow" />
      </div>

      {/* Reported Shoutouts */}
      <section>
        <h2 className="font-bold text-2xl mb-4">🚩 Shoutouts Reportados</h2>
        <ShoutoutModerationList shoutouts={reported} />
      </section>

      {/* All Recent Shoutouts */}
      <section>
        <h2 className="font-bold text-2xl mb-4">📢 Shoutouts Recientes (ultimos 50)</h2>
        <ShoutoutModerationList shoutouts={all} />
      </section>
    </div>
  )
}

function StatCard({ label, value, emoji, color }: {
  label: string
  value: number
  emoji: string
  color: string
}) {
  return (
    <div className={`card-brutal p-4 ${color}`}>
      <span className="text-2xl">{emoji}</span>
      <p className="font-bold text-3xl mt-1">{value}</p>
      <p className="font-bold text-xs uppercase">{label}</p>
    </div>
  )
}
