import Link from 'next/link'
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format'
import type { DashboardData } from '@/lib/data/dashboard'

interface HealthItem {
  label: string
  status: 'ok' | 'warn' | 'missing'
  detail: string
}

function getHealthItems(data: DashboardData): HealthItem[] {
  const { overview, labourOverview, marginByCategory, primeCostByMonth } = data
  const items: HealthItem[] = []

  // Sales data
  if (overview && overview.total_net > 0) {
    items.push({
      label: 'Sales data',
      status: 'ok',
      detail: `${formatNumber(overview.order_count)} orders imported`,
    })
  } else {
    items.push({
      label: 'Sales data',
      status: 'missing',
      detail: 'No sales imported yet',
    })
  }

  // Menu / food cost data
  const hasFoodCost = marginByCategory.some((c) => c.food_cost > 0)
  if (hasFoodCost) {
    items.push({
      label: 'Menu & food costs',
      status: 'ok',
      detail: 'Food cost data available for margin calculations',
    })
  } else if (marginByCategory.length > 0) {
    items.push({
      label: 'Menu & food costs',
      status: 'warn',
      detail: 'Menu items imported but no food costs — margin data is incomplete',
    })
  } else {
    items.push({
      label: 'Menu & food costs',
      status: 'missing',
      detail: 'No menu data imported — prime cost and margin unavailable',
    })
  }

  // Labour data
  if (labourOverview && labourOverview.total_labour > 0) {
    items.push({
      label: 'Labour shifts',
      status: 'ok',
      detail: `${formatNumber(Math.round(labourOverview.total_hours))} hours across ${formatNumber(labourOverview.shift_count)} shifts`,
    })
  } else {
    items.push({
      label: 'Labour shifts',
      status: 'missing',
      detail: 'No labour data imported — prime cost calculation incomplete',
    })
  }

  // Prime cost completeness
  const primeCostComplete = primeCostByMonth.some(
    (m) => m.food_cost > 0 && m.labour_cost > 0
  )
  if (primeCostComplete) {
    items.push({
      label: 'Prime cost calculation',
      status: 'ok',
      detail: 'Both food cost and labour data present for prime cost trend',
    })
  } else {
    items.push({
      label: 'Prime cost calculation',
      status: 'warn',
      detail: 'Missing food cost or labour data — prime cost trend is partial',
    })
  }

  return items
}

const STATUS_CONFIG = {
  ok: { icon: CheckCircle2, color: 'text-emerald-600' },
  warn: { icon: AlertTriangle, color: 'text-amber-500' },
  missing: { icon: XCircle, color: 'text-red-400' },
}

export function DataHealthPanel({ data }: { data: DashboardData }) {
  const items = getHealthItems(data)
  const allOk = items.every((i) => i.status === 'ok')

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const { icon: Icon, color } = STATUS_CONFIG[item.status]
        return (
          <div key={i} className="flex items-start gap-3">
            <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', color)} />
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
            </div>
          </div>
        )
      })}
      {!allOk && (
        <div className="pt-2 border-t">
          <Link
            href="/upload"
            className="text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2"
          >
            Import missing data →
          </Link>
        </div>
      )}
    </div>
  )
}
