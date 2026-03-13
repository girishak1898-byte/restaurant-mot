import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert } from '@/lib/data/dashboard'

const CONFIG = {
  critical: {
    icon: XCircle,
    classes: 'border-red-200 bg-red-50 text-red-900',
    iconClass: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-amber-200 bg-amber-50 text-amber-900',
    iconClass: 'text-amber-500',
  },
  info: {
    icon: Info,
    classes: 'border-blue-200 bg-blue-50 text-blue-900',
    iconClass: 'text-blue-500',
  },
  success: {
    icon: CheckCircle2,
    classes: 'border-green-200 bg-green-50 text-green-900',
    iconClass: 'text-green-600',
  },
}

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null

  // Sort: critical → warning → info → success
  const order = { critical: 0, warning: 1, info: 2, success: 3 }
  const sorted = [...alerts].sort((a, b) => order[a.level] - order[b.level])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sorted.map((alert, i) => {
        const { icon: Icon, classes, iconClass } = CONFIG[alert.level]
        return (
          <div key={i} className={cn('flex gap-3 rounded-xl border p-4', classes)}>
            <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconClass)} />
            <div>
              <p className="text-sm font-semibold leading-snug">{alert.title}</p>
              <p className="text-sm mt-1 opacity-90">{alert.body}</p>
              {alert.action && (
                <p className="text-xs mt-1.5 font-medium opacity-70">→ {alert.action}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
