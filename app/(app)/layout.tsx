import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChefHat, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { SidebarNav } from './_components/SidebarNav'
import { NMark } from '@/components/brand/mark'
import { NotificationsBell } from '@/components/notifications-bell'
import { PremiumUnlockModal } from '@/components/premium-unlock-modal'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')

  const { data: org } = await supabase
    .from('organizations')
    .select('name, mode, plan')
    .eq('id', membership.organization_id)
    .single()

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, message, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const displayName = user.user_metadata?.full_name || user.email || 'User'
  const modeLabel =
    org?.mode === 'restaurant' ? 'Northline for Restaurants' : org?.mode ? org.mode : 'Northline'

  const isSuperAdmin = profile?.is_super_admin ?? false
  const isPremium = org?.plan === 'premium'

  // Unread plan_approved notifications trigger the unlock celebration modal.
  // Once the modal is dismissed it marks them read, so they never show again.
  const unlockNotificationIds = isPremium
    ? (notifications ?? [])
        .filter((n) => n.type === 'plan_approved' && !n.read)
        .map((n) => n.id)
    : []

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 flex flex-col bg-sidebar border-r border-sidebar-border">
        {/* Brand / org header */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3.5 py-3.5 border-b border-sidebar-border hover:bg-sidebar-accent/50 transition-colors group"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0 transition-opacity group-hover:opacity-90">
            <ChefHat className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-accent-foreground truncate leading-tight">
              {org?.name ?? 'My Restaurant'}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 tracking-wide uppercase">{modeLabel}</p>
          </div>
        </Link>

        {/* Plan badge */}
        <div className="px-3.5 pt-3 pb-1">
          <span
            className={
              isPremium
                ? 'inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider'
                : 'inline-flex items-center gap-1 rounded-md bg-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider'
            }
          >
            {isPremium ? 'Premium' : 'Free plan'}
          </span>
        </div>

        {/* Nav links */}
        <SidebarNav isSuperAdmin={isSuperAdmin} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notifications */}
        <div className="px-3 pb-1">
          <NotificationsBell notifications={notifications ?? []} userId={user.id} />
        </div>

        {/* User + sign out */}
        <div className="border-t border-sidebar-border px-3 py-3 space-y-0.5">
          <div className="px-2 py-2 mb-1">
            <p className="text-[13px] font-medium text-sidebar-accent-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate mt-0.5">{user.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              Sign out
            </button>
          </form>
        </div>

        {/* Northline brand stamp */}
        <div className="px-3.5 pb-3 pt-2">
          <div className="flex items-center gap-1.5 opacity-25">
            <NMark className="h-3 w-3 text-sidebar-foreground" />
            <span className="text-[10px] font-semibold tracking-[0.12em] text-sidebar-foreground uppercase">
              Northline
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Premium unlock celebration — shown once after approval */}
      {unlockNotificationIds.length > 0 && (
        <PremiumUnlockModal notificationIds={unlockNotificationIds} />
      )}
    </div>
  )
}
