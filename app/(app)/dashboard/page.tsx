import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Upload, ArrowUpRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getDashboardData, generateAlerts, type DashboardData } from '@/lib/data/dashboard'
import { formatCurrency, formatPct, formatNumber } from '@/lib/format'
import {
  RevenueByMonthChart,
  HBarChart,
  MarginByCategoryChart,
  PrimeCostTrendChart,
} from './_components/Charts'
import { AlertsPanel } from './_components/AlertsPanel'
import { ChannelMarginTable } from './_components/ChannelMarginTable'
import { DataHealthPanel } from './_components/DataHealthPanel'
import { OwnerSummaryCard } from './_components/OwnerSummaryCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Layout primitives ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
          {title}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </section>
  )
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-sm',
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: 'warning' | 'success' | 'critical'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 shadow-sm',
        highlight === 'warning' && 'border-amber-200/70 bg-amber-50/60',
        highlight === 'critical' && 'border-red-200/70 bg-red-50/60',
        highlight === 'success' && 'border-emerald-200/60 bg-emerald-50/50'
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight nums leading-none">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  )
}

// ── High-revenue / low-margin items ───────────────────────────────────────────

function HighRevLowMarginTable({
  items,
  totalNet,
}: {
  items: { item_name: string; revenue: number; margin_pct: number }[]
  totalNet: number
}) {
  const hasCostData = items.some((i) => i.margin_pct > 0)

  if (!hasCostData) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center leading-relaxed">
        Upload a menu items file with food costs to find which popular dishes are hurting your margins.
      </p>
    )
  }

  const threshold = totalNet * 0.02
  const leakers = items
    .filter((i) => i.revenue >= threshold && i.margin_pct > 0 && i.margin_pct < 55)
    .sort((a, b) => b.revenue - a.revenue)

  if (leakers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No margin leaks found — your top sellers all have healthy margins.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        These items drive at least 2% of your revenue but have a gross margin below 55%.
        Consider a price review or ingredient swap.
      </p>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Item</th>
            <th className="pb-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Revenue</th>
            <th className="pb-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Share</th>
            <th className="pb-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Margin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {leakers.map((row, i) => (
            <tr key={i} className="hover:bg-muted/40 transition-colors">
              <td className="py-2.5 pr-4 font-medium truncate max-w-[180px]">{row.item_name}</td>
              <td className="py-2.5 text-right text-muted-foreground nums">{formatCurrency(row.revenue)}</td>
              <td className="py-2.5 text-right text-muted-foreground nums">
                {formatPct((row.revenue / totalNet) * 100)}
              </td>
              <td className="py-2.5 text-right">
                <span
                  className={cn(
                    'font-semibold nums',
                    row.margin_pct < 40 ? 'text-red-600' : 'text-amber-600'
                  )}
                >
                  {formatPct(row.margin_pct)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Top items by margin table ──────────────────────────────────────────────────

function TopMarginTable({
  data,
}: {
  data: { item_name: string; revenue: number; margin_pct: number }[]
}) {
  const hasData = data.some((d) => d.margin_pct > 0)
  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Upload menu items with food costs to see gross margin per item.
      </p>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Item</th>
            <th className="pb-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Revenue</th>
            <th className="pb-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Margin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-muted/40 transition-colors">
              <td className="py-2.5 pr-4 font-medium truncate max-w-[200px]">{row.item_name}</td>
              <td className="py-2.5 text-right text-muted-foreground nums">{formatCurrency(row.revenue)}</td>
              <td className="py-2.5 text-right">
                <span
                  className={cn(
                    'font-semibold nums',
                    row.margin_pct >= 70 && 'text-emerald-600',
                    row.margin_pct < 50 && row.margin_pct > 0 && 'text-amber-600'
                  )}
                >
                  {formatPct(row.margin_pct)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center mb-5">
        <Upload className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight font-heading">No data imported yet</h2>
      <p className="text-muted-foreground text-sm mt-2 max-w-xs leading-relaxed">
        Upload your sales, menu, or labour data to start seeing your restaurant analytics.
      </p>
      <Button asChild className="mt-6">
        <Link href="/upload">
          <Upload className="h-3.5 w-3.5" />
          Import your first file
        </Link>
      </Button>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')

  const data = await getDashboardData(membership.organization_id)
  const {
    overview,
    byMonth,
    byChannel,
    byOutlet,
    topItems,
    marginByCategory,
    topByMargin,
    labourOverview,
    labourByOutlet,
    primeCostByMonth,
    channelMargin,
  } = data

  const hasData = overview && (overview.total_net > 0 || overview.total_gross > 0)
  const hasLabour = labourOverview && labourOverview.total_labour > 0

  const labourPct =
    hasLabour && overview && overview.total_net > 0
      ? (labourOverview.total_labour / overview.total_net) * 100
      : null

  const latestPrime = primeCostByMonth.at(-1)
  const primePct = latestPrime?.prime_cost_pct ?? null

  const alerts = generateAlerts(data)

  return (
    <div className="px-8 py-7 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight font-heading">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your restaurant, at a glance</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/upload">
            <Upload className="h-3.5 w-3.5" />
            Import data
          </Link>
        </Button>
      </div>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Owner Summary ──────────────────────────────────────── */}
          <div className="mb-8 animate-fade-up">
            <OwnerSummaryCard data={data} />
          </div>

          {/* ── Operator Alerts ────────────────────────────────────── */}
          {alerts.length > 0 && (
            <Section title="Alerts">
              <AlertsPanel alerts={alerts} />
            </Section>
          )}

          {/* ── Revenue ────────────────────────────────────────────── */}
          <Section title="Revenue">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
              <MetricCard
                label="Net Revenue"
                value={formatCurrency(overview.total_net)}
                sub="After discounts"
              />
              <MetricCard
                label="Gross Revenue"
                value={formatCurrency(overview.total_gross)}
              />
              <MetricCard
                label="Total Discounts"
                value={formatCurrency(overview.total_discount)}
                sub={
                  overview.total_gross > 0
                    ? `${formatPct((overview.total_discount / overview.total_gross) * 100)} of gross`
                    : undefined
                }
                highlight={
                  overview.total_gross > 0 && overview.total_discount / overview.total_gross > 0.2
                    ? 'critical'
                    : overview.total_gross > 0 && overview.total_discount / overview.total_gross > 0.12
                    ? 'warning'
                    : undefined
                }
              />
              <MetricCard
                label="Unique Orders"
                value={formatNumber(overview.order_count)}
              />
            </div>

            {byMonth.length > 0 && (
              <ChartCard title="Net revenue by month" className="mb-5">
                <RevenueByMonthChart
                  data={byMonth}
                  emptyMessage="Upload at least one month of sales data to see your revenue trend."
                />
              </ChartCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Revenue by channel">
                <HBarChart
                  data={byChannel}
                  valueKey="revenue"
                  labelKey="channel"
                  emptyMessage="No channel data found. Make sure your sales file includes a channel column (e.g. Dine In, Delivery, Takeaway)."
                />
              </ChartCard>
              <ChartCard title="Revenue by outlet">
                <HBarChart
                  data={byOutlet}
                  valueKey="revenue"
                  labelKey="outlet_name"
                  emptyMessage="No outlet data found. Make sure your sales file includes an outlet name column."
                />
              </ChartCard>
            </div>
          </Section>

          {/* ── Prime Cost ─────────────────────────────────────────── */}
          <Section title="Prime cost">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
              {primePct !== null && primePct > 0 && (
                <MetricCard
                  label="Prime Cost % (latest)"
                  value={formatPct(primePct)}
                  sub="Food + labour as % of revenue"
                  highlight={primePct > 65 ? 'critical' : primePct > 60 ? 'warning' : 'success'}
                />
              )}
              {latestPrime && latestPrime.food_cost > 0 && (
                <MetricCard
                  label="Food Cost (latest)"
                  value={formatCurrency(latestPrime.food_cost)}
                  sub={
                    latestPrime.net_revenue > 0
                      ? `${formatPct((latestPrime.food_cost / latestPrime.net_revenue) * 100)} of revenue`
                      : undefined
                  }
                />
              )}
              {latestPrime && latestPrime.labour_cost > 0 && (
                <MetricCard
                  label="Labour Cost (latest)"
                  value={formatCurrency(latestPrime.labour_cost)}
                  sub={
                    latestPrime.net_revenue > 0
                      ? `${formatPct((latestPrime.labour_cost / latestPrime.net_revenue) * 100)} of revenue`
                      : undefined
                  }
                />
              )}
              {latestPrime && latestPrime.prime_cost > 0 && (
                <MetricCard
                  label="Combined Prime Cost"
                  value={formatCurrency(latestPrime.prime_cost)}
                  sub={latestPrime.month}
                />
              )}
            </div>
            <ChartCard title="Prime cost % trend" subtitle="Target: below 60%">
              <PrimeCostTrendChart data={primeCostByMonth} />
            </ChartCard>
          </Section>

          {/* ── Margin Leak ────────────────────────────────────────── */}
          <Section title="Margin leak">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              <ChartCard title="Channel margin breakdown">
                <ChannelMarginTable data={channelMargin} />
              </ChartCard>
              <ChartCard title="Gross margin by category">
                <MarginByCategoryChart data={marginByCategory} />
              </ChartCard>
            </div>
            {overview && (
              <ChartCard
                title="Popular items with low margin"
                subtitle="Items driving ≥2% of revenue but below 55% gross margin"
              >
                <HighRevLowMarginTable items={topByMargin} totalNet={overview.total_net} />
              </ChartCard>
            )}
          </Section>

          {/* ── Menu Performance ───────────────────────────────────── */}
          <Section title="Menu performance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Top items by revenue">
                <HBarChart
                  data={topItems}
                  valueKey="revenue"
                  labelKey="item_name"
                  emptyMessage="No item-level data found. Make sure your sales file includes an item name column."
                />
              </ChartCard>
              <ChartCard title="Top items by gross margin">
                <TopMarginTable data={topByMargin} />
              </ChartCard>
            </div>
          </Section>

          {/* ── Labour ─────────────────────────────────────────────── */}
          {hasLabour && (
            <Section title="Labour">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-5">
                <MetricCard
                  label="Total Labour Cost"
                  value={formatCurrency(labourOverview.total_labour)}
                />
                <MetricCard
                  label="Total Hours Worked"
                  value={formatNumber(Math.round(labourOverview.total_hours))}
                  sub="across all shifts"
                />
                {labourPct !== null && (
                  <MetricCard
                    label="Labour Cost %"
                    value={formatPct(labourPct)}
                    sub="of net revenue"
                    highlight={
                      labourPct > 35 ? 'warning' : labourPct >= 25 && labourPct <= 35 ? 'success' : undefined
                    }
                  />
                )}
              </div>
              <ChartCard title="Labour cost by outlet">
                <HBarChart
                  data={labourByOutlet}
                  valueKey="labour_cost"
                  labelKey="outlet_name"
                  color="#6D28D9"
                  emptyMessage="No outlet breakdown available. Make sure your labour data includes an outlet name column."
                />
              </ChartCard>
            </Section>
          )}

          {/* ── Data Health ─────────────────────────────────────────── */}
          <Section title="Data health">
            <div className="rounded-xl border bg-card p-5 shadow-sm max-w-lg">
              <DataHealthPanel data={data} />
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
