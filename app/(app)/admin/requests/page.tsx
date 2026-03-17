import { createServiceClient } from '@/lib/supabase/service'
import { RequestActions } from './_components/RequestActions'

interface UpgradeRequest {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  requested_plan: string
  notes: string | null
  created_at: string
  updated_at: string
  organization_id: string
  user_id: string
  organizations: { name: string; plan: string } | null
}

export default async function AdminRequestsPage() {
  const service = createServiceClient()

  const { data: rawRequests } = await service
    .from('upgrade_requests')
    .select('id, status, requested_plan, notes, created_at, updated_at, organization_id, user_id, organizations(name, plan)')
    .order('created_at', { ascending: false })

  const requests: UpgradeRequest[] = (rawRequests ?? []).map((r) => ({
    ...r,
    organizations: r.organizations as { name: string; plan: string } | null,
  }))

  // Get auth users for emails and display names
  const { data: authUsers } = await service.auth.admin.listUsers({ perPage: 1000 })
  const userMap = new Map(
    authUsers?.users?.map((u) => [
      u.id,
      { email: u.email, name: u.user_metadata?.full_name as string | undefined },
    ]) ?? []
  )

  const pending = requests.filter((r) => r.status === 'pending')
  const handled = requests.filter((r) => r.status !== 'pending')

  function RequestRow({
    request,
    showActions,
  }: {
    request: UpgradeRequest
    showActions?: boolean
  }) {
    const org = request.organizations
    const user = userMap.get(request.user_id)

    return (
      <tr className="hover:bg-muted/30 transition-colors">
        <td className="px-5 py-3.5">
          <p className="font-medium text-foreground">{org?.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Current plan: {org?.plan === 'premium' ? 'Premium' : 'Free'}
          </p>
        </td>
        <td className="px-5 py-3.5">
          <p className="text-sm text-foreground">{user?.name ?? '—'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{user?.email ?? '—'}</p>
        </td>
        <td className="px-5 py-3.5">
          <span className="inline-flex items-center rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary capitalize">
            {request.requested_plan}
          </span>
        </td>
        <td className="px-5 py-3.5">
          <StatusBadge status={request.status} />
        </td>
        <td className="px-5 py-3.5 text-xs text-muted-foreground">
          {new Date(request.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </td>
        {showActions ? (
          <td className="px-5 py-3.5 text-right">
            <RequestActions requestId={request.id} />
          </td>
        ) : (
          <td className="px-5 py-3.5" />
        )}
      </tr>
    )
  }

  const tableHeaders = (
    <tr className="border-b border-border bg-muted/40">
      <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Organization</th>
      <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Requested by</th>
      <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Requested plan</th>
      <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
      <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</th>
      <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Action</th>
    </tr>
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Upgrade Requests</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Review and action pending plan upgrade requests</p>
      </div>

      {/* Pending */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[13px] font-semibold">
            Pending
            {pending.length > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 border border-amber-200 px-1.5 text-[11px] font-semibold text-amber-700">
                {pending.length}
              </span>
            )}
          </h2>
        </div>

        {pending.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">No pending requests. All clear.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>{tableHeaders}</thead>
              <tbody className="divide-y divide-border">
                {pending.map((r) => (
                  <RequestRow key={r.id} request={r} showActions />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Handled */}
      {handled.length > 0 && (
        <div>
          <h2 className="text-[13px] font-semibold mb-4">Previously handled</h2>
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead>{tableHeaders}</thead>
              <tbody className="divide-y divide-border">
                {handled.map((r) => (
                  <RequestRow key={r.id} request={r} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        Pending
      </span>
    )
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        Approved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700">
      Rejected
    </span>
  )
}
