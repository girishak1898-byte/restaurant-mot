import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ShieldCheck, Building2, Users, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) redirect('/dashboard')

  // Count pending requests for badge
  const { count: pendingCount } = await supabase
    .from('upgrade_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const navItems = [
    { href: '/admin', icon: ShieldCheck, label: 'Overview', exact: true },
    { href: '/admin/organizations', icon: Building2, label: 'Organizations' },
    { href: '/admin/users', icon: Users, label: 'Users' },
    {
      href: '/admin/requests',
      icon: Inbox,
      label: 'Requests',
      badge: pendingCount ?? 0,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Admin top bar */}
      <div className="border-b border-border bg-card px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-primary" style={{ width: 18, height: 18 }} />
            <span className="text-sm font-semibold text-foreground">Northline Admin</span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map(({ href, icon: Icon, label, exact, badge }) => (
              <AdminNavLink
                key={href}
                href={href}
                icon={Icon}
                label={label}
                exact={exact}
                badge={badge as number | undefined}
              />
            ))}
          </nav>
          <div className="ml-auto">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to app
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
    </div>
  )
}

// Client nav link needs to be inline since this is a server component layout
// We'll use a simple approach with data attributes
function AdminNavLink({
  href,
  icon: Icon,
  label,
  badge,
}: {
  href: string
  icon: React.ElementType
  label: string
  exact?: boolean
  badge?: number
}) {
  return (
    <Link
      href={href}
      className="relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {badge != null && badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  )
}
