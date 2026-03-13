import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChefHat, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'
import { Separator } from '@/components/ui/separator'
import { SidebarNav } from './_components/SidebarNav'

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
    .select('name, mode')
    .eq('id', membership.organization_id)
    .single()

  const displayName = user.user_metadata?.full_name || user.email || 'User'
  const modeLabel =
    org?.mode === 'restaurant' ? 'Restaurant' : org?.mode ? org.mode : 'Restaurant'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 border-r flex flex-col">
        {/* Brand / org header */}
        <Link href="/dashboard" className="flex items-center gap-2.5 px-3 py-3 border-b hover:bg-muted/40 transition-colors">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
            <ChefHat className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate leading-tight">{org?.name ?? 'My Restaurant'}</p>
            <p className="text-[11px] text-muted-foreground">{modeLabel}</p>
          </div>
        </Link>

        {/* Nav links — client component for active state */}
        <SidebarNav />

        <Separator />

        {/* User + sign out */}
        <div className="px-2 py-3 space-y-0.5">
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
