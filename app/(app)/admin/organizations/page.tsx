import { createServiceClient } from '@/lib/supabase/service'
import { OrgPlanControl } from './_components/OrgPlanControl'

export default async function AdminOrganizationsPage() {
  const service = createServiceClient()

  const { data: orgs } = await service
    .from('organizations')
    .select('id, name, slug, plan, mode, created_at')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage plan access for all organizations
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Organization
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Slug
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Mode
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Plan
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Created
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(orgs ?? []).map((org) => (
              <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3.5 font-medium text-foreground">{org.name}</td>
                <td className="px-5 py-3.5 text-muted-foreground font-mono text-xs">{org.slug}</td>
                <td className="px-5 py-3.5 text-muted-foreground capitalize">{org.mode}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={
                      org.plan === 'premium'
                        ? 'inline-flex items-center rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary'
                        : 'inline-flex items-center rounded-md bg-muted border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground'
                    }
                  >
                    {org.plan === 'premium' ? 'Premium' : 'Free'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground text-xs">
                  {new Date(org.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <OrgPlanControl orgId={org.id} currentPlan={org.plan} orgName={org.name} />
                </td>
              </tr>
            ))}
            {(orgs ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No organizations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
