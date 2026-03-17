import { createServiceClient } from '@/lib/supabase/service'

export default async function AdminUsersPage() {
  const service = createServiceClient()

  const { data: memberships } = await service
    .from('organization_memberships')
    .select('user_id, role, organization_id, created_at, organizations(name, plan)')
    .order('created_at', { ascending: false })

  const { data: profiles } = await service
    .from('profiles')
    .select('id, full_name, is_super_admin')

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

  const { data: authUsers } = await service.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map(authUsers?.users?.map((u) => [u.id, u.email]) ?? [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm mt-0.5">All registered users and their roles</p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">User</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Email</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Organization</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Plan</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Role</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(memberships ?? []).map((m) => {
              const profile = profileMap.get(m.user_id)
              const org = m.organizations as { name: string; plan: string } | null
              const email = emailMap.get(m.user_id)
              return (
                <tr key={`${m.user_id}-${m.organization_id}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">
                    {profile?.full_name ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">{email ?? '—'}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{org?.name ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={
                        org?.plan === 'premium'
                          ? 'inline-flex items-center rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary'
                          : 'inline-flex items-center rounded-md bg-muted border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground'
                      }
                    >
                      {org?.plan === 'premium' ? 'Premium' : 'Free'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground capitalize">{m.role}</td>
                  <td className="px-5 py-3.5">
                    {profile?.is_super_admin && (
                      <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        Super Admin
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {(memberships ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
