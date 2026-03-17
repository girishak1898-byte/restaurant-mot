'use client'

import { useState, useTransition } from 'react'
import { Bell, CheckCheck, X } from 'lucide-react'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/actions/admin'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
}

interface NotificationsBellProps {
  notifications: Notification[]
  userId: string
}

export function NotificationsBell({ notifications, userId }: NotificationsBellProps) {
  const [items, setItems] = useState(notifications)
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const unread = items.filter((n) => !n.read).length

  function handleMarkRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    startTransition(() => { void markNotificationRead(id) })
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    startTransition(() => { void markAllNotificationsRead(userId) })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
      >
        <Bell className="h-3.5 w-3.5 shrink-0" />
        <span>Notifications</span>
        {unread > 0 && (
          <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-[13px] font-semibold">Notifications</p>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No notifications yet</p>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 border-b border-border/60 last:border-0 transition-colors',
                      !n.read && 'bg-primary/5'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        <div className={cn(!n.read ? '' : 'pl-3.5')}>
                          <p className="text-[12px] font-semibold text-foreground leading-tight">
                            {n.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {new Date(n.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground mt-0.5 transition-colors"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
