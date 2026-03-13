'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Upload, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/upload', icon: Upload, label: 'Import data' },
  { href: '/uploads', icon: FolderOpen, label: 'My files' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
