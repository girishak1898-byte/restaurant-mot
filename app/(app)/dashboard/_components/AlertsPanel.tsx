import { cn } from '@/lib/utils'
import type { Alert } from '@/lib/data/dashboard'

// ── Visual config ─────────────────────────────────────────────────────────────

const LEVEL_CONFIG = {
  critical: {
    accent: 'border-l-red-500',
    bg: 'bg-red-50/20',
    categoryClass: 'text-red-600',
    actionClass: 'text-red-600/80',
    levelLabel: 'Critical',
    levelClass: 'text-red-400',
  },
  warning: {
    accent: 'border-l-amber-400',
    bg: 'bg-amber-50/20',
    categoryClass: 'text-amber-700',
    actionClass: 'text-amber-700/80',
    levelLabel: 'Attention',
    levelClass: 'text-amber-400',
  },
  info: {
    accent: 'border-l-primary/40',
    bg: 'bg-primary/[0.025]',
    categoryClass: 'text-primary',
    actionClass: 'text-primary/80',
    levelLabel: 'Note',
    levelClass: 'text-primary/40',
  },
  success: {
    accent: 'border-l-emerald-500',
    bg: 'bg-emerald-50/15',
    categoryClass: 'text-emerald-700',
    actionClass: 'text-emerald-700/80',
    levelLabel: 'On track',
    levelClass: 'text-emerald-400',
  },
}

const PRIORITY: Record<string, number> = { critical: 0, warning: 1, info: 2, success: 3 }
const MAX_VISIBLE = 5

// ── Component ─────────────────────────────────────────────────────────────────

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null

  const sorted = [...alerts]
    .sort((a, b) => PRIORITY[a.level] - PRIORITY[b.level])
    .slice(0, MAX_VISIBLE)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {sorted.map((alert, i) => {
        const { accent, bg, categoryClass, actionClass, levelLabel, levelClass } = LEVEL_CONFIG[alert.level]
        return (
          <div
            key={i}
            className={cn(
              'rounded-xl border border-border border-l-[3px] p-4 shadow-sm',
              accent,
              bg
            )}
          >
            {/* Header row: category + severity */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className={cn('text-[10px] font-semibold uppercase tracking-[0.1em]', categoryClass)}>
                {alert.category}
              </span>
              <span className={cn('text-[10px] font-medium', levelClass)}>
                {levelLabel}
              </span>
            </div>

            {/* Headline */}
            <p className="text-[13px] font-semibold text-foreground leading-snug mb-1.5">
              {alert.title}
            </p>

            {/* Supporting sentence */}
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {alert.body}
            </p>

            {/* Next action */}
            {alert.action && (
              <p className={cn('text-[11px] font-medium mt-2.5', actionClass)}>
                → {alert.action}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
