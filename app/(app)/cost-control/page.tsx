import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Receipt, Package, Trash2, Upload, ArrowRight, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

// ── Aggregation helpers ───────────────────────────────────────────────────────

function groupSum<T extends Record<string, unknown>>(
  rows: T[],
  keyField: keyof T,
  valueField: keyof T
): { key: string; total: number }[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const k = (row[keyField] as string | null) ?? 'Uncategorised'
    const v = Number(row[valueField] ?? 0)
    map.set(k, (map.get(k) ?? 0) + v)
  }
  return Array.from(map.entries())
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total)
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(key: string) {
  const [year, month] = key.split('-')
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

// ── Layout primitives ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
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

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function EmptyDataCard({
  icon: Icon,
  title,
  description,
  importType,
}: {
  icon: React.ElementType
  title: string
  description: string
  importType: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 flex items-start gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted border border-border">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{description}</p>
        <Link
          href={`/upload?type=${importType}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Upload className="h-3 w-3" />
          Import {title.toLowerCase()}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CostControlPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/onboarding')

  const orgId = membership.organization_id

  // Fetch cost control data in parallel
  const [purchasesRes, inventoryRes, wasteRes] = await Promise.all([
    supabase
      .from('restaurant_purchases')
      .select('purchase_date, supplier, item_category, total_cost, item_name')
      .eq('organization_id', orgId)
      .order('purchase_date', { ascending: false })
      .limit(1000),

    supabase
      .from('restaurant_inventory_counts')
      .select('count_date, item_name, item_category, opening_value, closing_value, count_reference')
      .eq('organization_id', orgId)
      .order('count_date', { ascending: false })
      .limit(500),

    supabase
      .from('restaurant_waste_adjustments')
      .select('waste_date, item_name, item_category, estimated_cost, waste_reason')
      .eq('organization_id', orgId)
      .order('waste_date', { ascending: false })
      .limit(500),
  ])

  const purchases = purchasesRes.data ?? []
  const inventory = inventoryRes.data ?? []
  const waste = wasteRes.data ?? []

  // ── Purchases aggregations ──────────────────────────────────────────────────
  const totalSpend = purchases.reduce((s, r) => s + Number(r.total_cost ?? 0), 0)

  const monthlySpend = new Map<string, number>()
  for (const r of purchases) {
    if (!r.purchase_date) continue
    const mk = monthKey(r.purchase_date)
    monthlySpend.set(mk, (monthlySpend.get(mk) ?? 0) + Number(r.total_cost ?? 0))
  }
  const monthlySpendSorted = Array.from(monthlySpend.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .reverse()

  const spendByCategory = groupSum(purchases, 'item_category', 'total_cost').slice(0, 8)
  const topSuppliers = groupSum(purchases, 'supplier', 'total_cost').slice(0, 6)

  // Current month spend
  const currentMk = monthKey(new Date().toISOString())
  const currentMonthSpend = monthlySpend.get(currentMk) ?? 0

  // ── Inventory aggregations ──────────────────────────────────────────────────
  const latestCountDate = inventory[0]?.count_date ?? null
  const latestCountRows = latestCountDate
    ? inventory.filter((r) => r.count_date === latestCountDate)
    : []
  const latestClosingValue = latestCountRows.reduce((s, r) => s + Number(r.closing_value ?? 0), 0)

  // Find the second-most-recent count date (for opening inventory in COGS calc)
  const countDates = Array.from(new Set(inventory.map((r) => r.count_date).filter(Boolean))).sort().reverse()
  const previousCountDate = countDates[1] ?? null
  const previousCountRows = previousCountDate
    ? inventory.filter((r) => r.count_date === previousCountDate)
    : []
  const previousClosingValue = previousCountRows.reduce((s, r) => s + Number(r.closing_value ?? 0), 0)

  // ── Waste aggregations ─────────────────────────────────────────────────────
  const totalWasteCost = waste.reduce((s, r) => s + Number(r.estimated_cost ?? 0), 0)
  const wasteByReason = groupSum(waste, 'waste_reason', 'estimated_cost').slice(0, 5)

  // ── COGS estimate (Phase 4 preview) ────────────────────────────────────────
  // Purchases between previous and latest count date
  const periodPurchases = (latestCountDate && previousCountDate)
    ? purchases
        .filter((r) => r.purchase_date >= previousCountDate && r.purchase_date <= latestCountDate)
        .reduce((s, r) => s + Number(r.total_cost ?? 0), 0)
    : null

  const cogsEstimate = (periodPurchases !== null)
    ? previousClosingValue + periodPurchases - latestClosingValue
    : null

  const hasPurchases = purchases.length > 0
  const hasInventory = inventory.length > 0
  const hasWaste = waste.length > 0

  return (
    <div className="px-8 py-7 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight font-heading">Cost Control</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Track purchases, inventory, and waste to understand your actual cost of goods sold.
        </p>
      </div>

      {/* ── Phase 1: Purchases ─────────────────────────────────────────────── */}
      <Section title="Purchases">
        {!hasPurchases ? (
          <EmptyDataCard
            icon={Receipt}
            title="Purchases"
            description="Import purchase records to track supplier spend, cost by category, and build towards actual COGS."
            importType="restaurant_purchases"
          />
        ) : (
          <div className="space-y-6">
            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard
                label="Total spend (all time)"
                value={formatCurrency(totalSpend)}
                sub={`${purchases.length.toLocaleString()} purchase records`}
              />
              <MetricCard
                label="This month"
                value={formatCurrency(currentMonthSpend)}
                sub={formatMonth(currentMk)}
              />
              <MetricCard
                label="Top category"
                value={spendByCategory[0]?.key ?? '—'}
                sub={spendByCategory[0] ? formatCurrency(spendByCategory[0].total) : undefined}
              />
              <MetricCard
                label="Top supplier"
                value={topSuppliers[0]?.key ?? '—'}
                sub={topSuppliers[0] ? formatCurrency(topSuppliers[0].total) : undefined}
              />
            </div>

            {/* Spend by category + top suppliers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* By category */}
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                  <p className="text-[13px] font-semibold">Spend by category</p>
                </div>
                <table className="min-w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {spendByCategory.map((row) => {
                      const pct = totalSpend > 0 ? (row.total / totalSpend) * 100 : 0
                      return (
                        <tr key={row.key} className="hover:bg-muted/30">
                          <td className="px-5 py-2.5">
                            <p className="text-sm font-medium truncate max-w-[140px]">{row.key}</p>
                          </td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[80px]">
                                <div
                                  className="h-full rounded-full bg-primary/60"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-2.5 text-right text-sm font-medium">
                            {formatCurrency(row.total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Top suppliers */}
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                  <p className="text-[13px] font-semibold">Top suppliers</p>
                </div>
                <table className="min-w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {topSuppliers.map((row, i) => (
                      <tr key={row.key} className="hover:bg-muted/30">
                        <td className="px-5 py-2.5 text-xs text-muted-foreground w-6">{i + 1}</td>
                        <td className="py-2.5 pr-2">
                          <p className="text-sm font-medium truncate max-w-[160px]">{row.key}</p>
                        </td>
                        <td className="px-5 py-2.5 text-right text-sm font-medium">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly trend */}
            {monthlySpendSorted.length > 1 && (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                  <p className="text-[13px] font-semibold">Monthly spend</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Last {monthlySpendSorted.length} months</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border">
                      <tr>
                        {monthlySpendSorted.map(([mk]) => (
                          <th key={mk} className="px-5 py-2 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                            {formatMonth(mk)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {monthlySpendSorted.map(([mk, total]) => (
                          <td key={mk} className="px-5 py-3 font-medium whitespace-nowrap">
                            {formatCurrency(total)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Phase 2: Inventory Counts ──────────────────────────────────────── */}
      <Section title="Inventory Counts">
        {!hasInventory ? (
          <EmptyDataCard
            icon={Package}
            title="Inventory Counts"
            description="Import periodic stock counts to track opening and closing stock values. Required for actual COGS calculation."
            importType="restaurant_inventory_counts"
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MetricCard
                label="Latest count date"
                value={latestCountDate
                  ? new Date(latestCountDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
                sub={`${latestCountRows.length} line items`}
              />
              <MetricCard
                label="Closing stock value"
                value={formatCurrency(latestClosingValue)}
                sub="Latest count"
              />
              {previousCountDate && (
                <MetricCard
                  label="Previous closing value"
                  value={formatCurrency(previousClosingValue)}
                  sub={new Date(previousCountDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                />
              )}
            </div>

            {/* Category breakdown for latest count */}
            {latestCountRows.length > 0 && (() => {
              const byCategory = groupSum(
                latestCountRows as Record<string, unknown>[],
                'item_category',
                'closing_value'
              ).slice(0, 8)
              return (
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border">
                    <p className="text-[13px] font-semibold">Closing stock by category</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      From count on {new Date(latestCountDate!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <table className="min-w-full text-sm">
                    <tbody className="divide-y divide-border">
                      {byCategory.map((row) => (
                        <tr key={row.key} className="hover:bg-muted/30">
                          <td className="px-5 py-2.5 font-medium">{row.key}</td>
                          <td className="px-5 py-2.5 text-right font-medium">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        )}
      </Section>

      {/* ── Phase 3: Waste & Adjustments ─────────────────────────────────── */}
      <Section title="Waste & Adjustments">
        {!hasWaste ? (
          <EmptyDataCard
            icon={Trash2}
            title="Waste & Adjustments"
            description="Import waste records to track spoilage, over-prep, and quality losses. Helps explain variance between theoretical and actual food cost."
            importType="restaurant_waste_adjustments"
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MetricCard
                label="Total waste cost"
                value={formatCurrency(totalWasteCost)}
                sub={`${waste.length.toLocaleString()} waste records`}
              />
              <MetricCard
                label="Top waste reason"
                value={wasteByReason[0]?.key ?? '—'}
                sub={wasteByReason[0] ? formatCurrency(wasteByReason[0].total) : undefined}
              />
              <MetricCard
                label="Waste as % of spend"
                value={totalSpend > 0 ? `${((totalWasteCost / totalSpend) * 100).toFixed(1)}%` : '—'}
                sub="Estimated waste ÷ total purchases"
              />
            </div>

            {wasteByReason.length > 0 && (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                  <p className="text-[13px] font-semibold">Waste by reason</p>
                </div>
                <table className="min-w-full text-sm">
                  <tbody className="divide-y divide-border">
                    {wasteByReason.map((row) => (
                      <tr key={row.key} className="hover:bg-muted/30">
                        <td className="px-5 py-2.5 font-medium">{row.key}</td>
                        <td className="px-5 py-2.5 text-right font-medium text-rose-700">
                          {formatCurrency(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ── Phase 4: Actual COGS ──────────────────────────────────────────── */}
      <Section title="Actual COGS">
        <div className={cn(
          'rounded-xl border p-6',
          cogsEstimate !== null
            ? 'bg-card shadow-sm'
            : 'border-dashed bg-card/50'
        )}>
          {cogsEstimate !== null ? (
            <div className="space-y-5">
              <div>
                <p className="text-[13px] font-semibold text-foreground">Actual COGS estimate</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Period: {new Date(previousCountDate!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  {' → '}
                  {new Date(latestCountDate!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {/* Calculation breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Opening inventory (prev. closing)</span>
                  <span className="font-medium">{formatCurrency(previousClosingValue)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">+ Purchases in period</span>
                  <span className="font-medium text-emerald-700">+ {formatCurrency(periodPurchases!)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">− Closing inventory</span>
                  <span className="font-medium text-blue-700">− {formatCurrency(latestClosingValue)}</span>
                </div>
                <div className="h-px bg-border my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">= Actual COGS</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(cogsEstimate)}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  This is a simplified estimate. For full accuracy, ensure all purchases in the
                  period are imported and inventory counts are taken at consistent points in time.
                  Waste adjustments are not yet deducted from this figure.
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted border border-border">
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Actual COGS — not yet available
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  Actual COGS requires at least two inventory counts and purchase records for the
                  period between them.
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Formula:</p>
                  <p className="font-mono bg-muted rounded px-2 py-1 inline-block">
                    Opening Inventory + Purchases − Closing Inventory
                  </p>
                  <div className="pt-1 space-y-0.5">
                    <p className={cn(hasPurchases ? 'text-emerald-700' : '')}>
                      {hasPurchases ? '✓' : '○'} Purchases {hasPurchases ? 'imported' : '— not yet imported'}
                    </p>
                    <p className={cn(hasInventory && countDates.length >= 2 ? 'text-emerald-700' : '')}>
                      {hasInventory && countDates.length >= 2 ? '✓' : '○'} Two inventory counts{' '}
                      {hasInventory && countDates.length >= 2
                        ? 'available'
                        : hasInventory
                        ? '— import a second count to enable COGS'
                        : '— not yet imported'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
