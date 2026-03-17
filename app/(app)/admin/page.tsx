import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Building2, Users, Inbox, Star } from 'lucide-react'

export default async function AdminOverviewPage() {
  const service = createServiceClient()

  const [
    { count: totalOrgs },
    { count: premiumOrgs },
    { count: totalUsers },
    { count: pendingRequests },
  ] = await Promise.all([
    service.from('organizations').select('*', { count: 'exact', head: true }),
    service
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'premium'),
    service.from('profiles').select('*', { count: 'exact', head: true }),
    service
      .from('upgrade_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const stats = [
    {
      label: 'Total Organizations',
      value: totalOrgs ?? 0,
      icon: Building2,
      sub: `${premiumOrgs ?? 0} on Premium`,
    },
    {
      label: 'Total Users',
      value: totalUsers ?? 0,
      icon: Users,
      sub: 'Across all orgs',
    },
    {
      label: 'Premium Orgs',
      value: premiumOrgs ?? 0,
      icon: Star,
      sub: `${totalOrgs ? Math.round(((premiumOrgs ?? 0) / totalOrgs) * 100) : 0}% of all orgs`,
    },
    {
      label: 'Pending Requests',
      value: pendingRequests ?? 0,
      icon: Inbox,
      sub: 'Awaiting review',
      highlight: (pendingRequests ?? 0) > 0,
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Platform health at a glance
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border bg-card p-5 shadow-sm ${
              stat.highlight ? 'border-amber-200 bg-amber-50/50' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {stat.label}
              </p>
              <stat.icon
                className={`h-4 w-4 ${stat.highlight ? 'text-amber-600' : 'text-muted-foreground/50'}`}
              />
            </div>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{stat.sub}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
