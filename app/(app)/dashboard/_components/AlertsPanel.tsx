import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert } from '@/lib/data/dashboard'

const CONFIG = {
  critical: {
    icon: XCircle,
    wrapper: 'border-red-200/60 bg-red-50/50',
    iconClass: 'text-red-500',
    titleClass: 'text-red-900',
    bodyClass: 'text-red-800/80',
    actionClass: 'text-red-700/60',
  },
  warning: {
    icon: AlertTriangle,
    wrapper: 'border-amber-200/60 bg-amber-50/50',
    iconClass: 'text-amber-500',
    titleClass: 'text-amber-900',
    bodyClass: 'text-amber-800/80',
    actionClass: 'text-amber-700/60',
  },
  info: {
    icon: Info,
    wrapper: 'border-blue-200/50 bg-blue-50/40',
    iconClass: 'text-blue-500',
    titleClass: 'text-blue-900',
    bodyClass: 'text-blue-800/80',
    actionClass: 'text-blue-700/60',
  },
  success: {
    icon: CheckCircle2,
    wrapper: 'border-emerald-200/50 bg-emerald-50/40',
    iconClass: 'text-emerald-600',
    titleClass: 'text-emerald-900',
    bodyClass: 'text-emerald-800/80',
    actionClass: 'text-emerald-700/60',
  },
}

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null

  const order = { critical: 0, warning: 1, info: 2, success: 3 }
  const sorted = [...alerts].sort((a, b) => order[a.level] - order[b.level])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {sorted.map((alert, i) => {
        const { icon: Icon, wrapper, iconClass, titleClass, bodyClass, actionClass } = CONFIG[alert.level]
        return (
          <div key={i} className={cn('flex gap-3 rounded-xl border p-4', wrapper)}>
            <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconClass)} />
            <div className="min-w-0">
              <p className={cn('text-[13px] font-semibold leading-snug', titleClass)}>{alert.title}</p>
              <p className={cn('text-[13px] mt-1 leading-relaxed', bodyClass)}>{alert.body}</p>
              {alert.action && (
                <p className={cn('text-xs mt-1.5 font-medium', actionClass)}>→ {alert.action}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
