'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Upload, FolderOpen, ShieldCheck, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/cost-control', icon: Package, label: 'Cost Control' },
  { href: '/upload', icon: Upload, label: 'Import data' },
  { href: '/uploads', icon: FolderOpen, label: 'My files' },
]

interface SidebarNavProps {
  isSuperAdmin?: boolean
}

export function SidebarNav({ isSuperAdmin }: SidebarNavProps) {
  const pathname = usePathname()

  const items = [
    ...NAV_ITEMS,
    ...(isSuperAdmin ? [{ href: '/admin', icon: ShieldCheck, label: 'Admin' }] : []),
  ]

  return (
    <nav className="px-3 py-3 space-y-0.5">
      {items.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            )}
          >
            <Icon
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-colors',
                active ? 'text-primary' : 'text-sidebar-foreground/40'
              )}
            />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
