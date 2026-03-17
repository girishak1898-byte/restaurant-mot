import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatPct } from '@/lib/format'

// ── Return types (mirror the SQL RETURNS TABLE definitions) ──────────────────

export interface SalesOverview {
  total_net: number
  total_gross: number
  total_discount: number
  order_count: number
}

export interface RevenueByMonth {
  month: string
  revenue: number
}

export interface RevenueByChannel {
  channel: string
  revenue: number
}

export interface RevenueByOutlet {
  outlet_name: string
  revenue: number
}

export interface TopItemByRevenue {
  item_name: string
  revenue: number
}

export interface MarginByCategory {
  category: string
  revenue: number
  food_cost: number
  margin_pct: number
}

export interface TopItemByMargin {
  item_name: string
  revenue: number
  margin_pct: number
}

export interface LabourOverview {
  total_labour: number
  total_hours: number
  shift_count: number
}

export interface LabourByOutlet {
  outlet_name: string
  labour_cost: number
}

export interface PrimeCostByMonth {
  month: string
  net_revenue: number
  food_cost: number
  labour_cost: number
  prime_cost: number
  prime_cost_pct: number
}

export interface ChannelMargin {
  channel: string
  net_revenue: number
  gross_revenue: number
  discount: number
  discount_pct: number
  food_cost: number
  margin_pct: number
}

export interface DashboardData {
  overview: SalesOverview | null
  byMonth: RevenueByMonth[]
  byChannel: RevenueByChannel[]
  byOutlet: RevenueByOutlet[]
  topItems: TopItemByRevenue[]
  marginByCategory: MarginByCategory[]
  topByMargin: TopItemByMargin[]
  labourOverview: LabourOverview | null
  labourByOutlet: LabourByOutlet[]
  primeCostByMonth: PrimeCostByMonth[]
  channelMargin: ChannelMargin[]
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

export async function getDashboardData(orgId: string): Promise<DashboardData> {
  const supabase = await createClient()

  // Thin wrapper: swallows errors and returns empty array so the page never crashes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function rpc<T>(fn: string): Promise<T[]> {
    const { data, error } = await (supabase as any).rpc(fn, { p_org_id: orgId })
    if (error) {
      console.error(`[dashboard] rpc ${fn}:`, error.message)
      return []
    }
    return (data as T[]) ?? []
  }

  const [
    overviewRows,
    byMonth,
    byChannel,
    byOutlet,
    topItems,
    marginByCategory,
    topByMargin,
    labourRows,
    labourByOutlet,
    primeCostByMonth,
    channelMargin,
  ] = await Promise.all([
    rpc<SalesOverview>('get_sales_overview'),
    rpc<RevenueByMonth>('get_revenue_by_month'),
    rpc<RevenueByChannel>('get_revenue_by_channel'),
    rpc<RevenueByOutlet>('get_revenue_by_outlet'),
    rpc<TopItemByRevenue>('get_top_items_by_revenue'),
    rpc<MarginByCategory>('get_margin_by_category'),
    rpc<TopItemByMargin>('get_top_items_by_margin'),
    rpc<LabourOverview>('get_labour_overview'),
    rpc<LabourByOutlet>('get_labour_by_outlet'),
    rpc<PrimeCostByMonth>('get_prime_cost_by_month'),
    rpc<ChannelMargin>('get_channel_margin'),
  ])

  return {
    overview: overviewRows[0] ?? null,
    byMonth,
    byChannel,
    byOutlet,
    topItems,
    marginByCategory,
    topByMargin,
    labourOverview: labourRows[0] ?? null,
    labourByOutlet,
    primeCostByMonth,
    channelMargin,
  }
}

// ── Operator insights (rules engine) ─────────────────────────────────────────

export type InsightCategory = 'Labour' | 'Margin' | 'Channel' | 'Prime cost' | 'Revenue'

export interface Alert {
  level: 'critical' | 'warning' | 'info' | 'success'
  category: InsightCategory
  title: string
  body: string
  action?: string
}

export function generateAlerts(data: DashboardData): Alert[] {
  const alerts: Alert[] = []
  const { overview, byChannel, labourOverview, marginByCategory, primeCostByMonth, channelMargin, topByMargin } = data

  if (!overview || overview.total_net === 0) return alerts

  // ── Prime cost ──────────────────────────────────────────────────
  const latestPrime = primeCostByMonth.at(-1)
  if (latestPrime && latestPrime.prime_cost_pct > 0) {
    const pct = latestPrime.prime_cost_pct
    if (pct > 65) {
      alerts.push({
        level: 'critical',
        category: 'Prime cost',
        title: 'Prime cost is critically high',
        body: `At ${formatPct(pct)}, food and labour are taking over two-thirds of revenue in ${latestPrime.month}. The target is below 60%. This level erodes profit quickly.`,
        action: 'Review staffing levels and food waste this week',
      })
    } else if (pct > 60) {
      alerts.push({
        level: 'warning',
        category: 'Prime cost',
        title: 'Prime cost is above target',
        body: `Combined food and labour cost reached ${formatPct(pct)} in ${latestPrime.month} — ${(pct - 60).toFixed(1)}pp above the 60% benchmark. Small overruns compound quickly.`,
        action: 'Check food waste logs and next week\'s rota',
      })
    } else {
      alerts.push({
        level: 'success',
        category: 'Prime cost',
        title: 'Prime cost is on track',
        body: `At ${formatPct(pct)} for ${latestPrime.month}, food and labour costs are within the healthy range. Keep importing data monthly to catch any drift early.`,
      })
    }
  }

  // ── Labour cost % ───────────────────────────────────────────────
  if (labourOverview && labourOverview.total_labour > 0 && overview.total_net > 0) {
    const pct = (labourOverview.total_labour / overview.total_net) * 100
    if (pct > 35) {
      alerts.push({
        level: 'warning',
        category: 'Labour',
        title: 'Labour is above target',
        body: `Labour cost is ${formatPct(pct)} of net revenue — ${formatCurrency(labourOverview.total_labour)} against ${formatCurrency(overview.total_net)}. The target range is 25–35%.`,
        action: 'Review rotas and peak-hour scheduling',
      })
    } else if (pct < 20) {
      alerts.push({
        level: 'info',
        category: 'Labour',
        title: 'Labour looks unusually low',
        body: `At ${formatPct(pct)} of revenue, labour costs are below the typical 25–35% range. Check that all shift data has been imported before drawing conclusions.`,
        action: 'Import missing labour shifts',
      })
    }
  }

  // ── Discount rate ───────────────────────────────────────────────
  if (overview.total_gross > 0) {
    const discountPct = (overview.total_discount / overview.total_gross) * 100
    if (discountPct > 20) {
      alerts.push({
        level: 'critical',
        category: 'Margin',
        title: 'Discounts are damaging margin',
        body: `${formatPct(discountPct)} of gross revenue — ${formatCurrency(overview.total_discount)} — is being discounted away. At this level, promotions are likely destroying more value than they create.`,
        action: 'Audit active promotions and staff discount policy',
      })
    } else if (discountPct > 12) {
      alerts.push({
        level: 'warning',
        category: 'Margin',
        title: 'Discounts are eating into margin',
        body: `Discount rate is ${formatPct(discountPct)} of gross revenue (${formatCurrency(overview.total_discount)}). Check whether your promotions are driving new covers or simply reducing margin on existing ones.`,
        action: 'Review active promotions',
      })
    }
  }

  // ── Channel margin gap ─────────────────────────────────────────
  const channelsWithCost = channelMargin.filter((c) => c.food_cost > 0)
  if (channelsWithCost.length > 1) {
    const sorted = [...channelsWithCost].sort((a, b) => a.margin_pct - b.margin_pct)
    const worst = sorted[0]
    const best = sorted[sorted.length - 1]
    const gap = best.margin_pct - worst.margin_pct
    if (gap > 15) {
      alerts.push({
        level: 'warning',
        category: 'Channel',
        title: `${worst.channel} is driving revenue, not profit`,
        body: `${worst.channel} runs at ${formatPct(worst.margin_pct)} gross margin vs ${formatPct(best.margin_pct)} on ${best.channel} — a ${gap.toFixed(0)}pp gap. Platform fees or channel-specific discounting are likely the cause.`,
        action: 'Review channel margin breakdown below',
      })
    }
  }

  // ── Low-margin high-revenue items ───────────────────────────────
  const itemsWithCost = topByMargin.filter((i) => i.margin_pct > 0 && i.revenue > 0)
  const highRevThreshold = overview.total_net * 0.03
  const leakers = itemsWithCost.filter((i) => i.revenue >= highRevThreshold && i.margin_pct < 50)
  if (leakers.length > 0) {
    const item = leakers[0]
    alerts.push({
      level: 'warning',
      category: 'Margin',
      title: `"${item.item_name}" sells well but hurts margin`,
      body: `This item generates strong volume but only at ${formatPct(item.margin_pct)} gross margin. A small price increase or ingredient swap could recover meaningful profit.`,
      action: 'Review menu performance below',
    })
  }

  // ── Channel concentration / top channel ────────────────────────
  if (byChannel.length > 0) {
    const top = byChannel[0]
    const topPct = ((top.revenue / overview.total_net) * 100).toFixed(0)
    if (byChannel.length === 1) {
      alerts.push({
        level: 'info',
        category: 'Channel',
        title: `All revenue comes through ${top.channel}`,
        body: `With no other active channels, any fee change or volume drop on ${top.channel} has a direct impact on total revenue. Diversification reduces that risk.`,
        action: 'Consider adding a second sales channel',
      })
    } else {
      alerts.push({
        level: 'info',
        category: 'Channel',
        title: `${top.channel} is your strongest channel`,
        body: `${top.channel} accounts for ${topPct}% of net revenue, followed by ${byChannel[1].channel}. A healthy channel mix reduces dependency risk.`,
      })
    }
  }

  // ── Category margin insights ────────────────────────────────────
  const withCostData = marginByCategory.filter((c) => c.food_cost > 0)
  if (withCostData.length > 0) {
    const best = [...withCostData].sort((a, b) => b.margin_pct - a.margin_pct)[0]
    const worst = [...withCostData].sort((a, b) => a.margin_pct - b.margin_pct)[0]

    alerts.push({
      level: 'success',
      category: 'Margin',
      title: `${best.category} has your best margin`,
      body: `At ${formatPct(best.margin_pct)} gross margin, this is your most profitable category. Prioritise it in upsells and front-of-menu placement.`,
    })

    if (worst.category !== best.category && worst.margin_pct < 50) {
      alerts.push({
        level: 'info',
        category: 'Margin',
        title: `${worst.category} is below margin target`,
        body: `${formatPct(worst.margin_pct)} gross margin is below the 50% target for this category. Review pricing, portion sizes, or supplier costs to find where value is leaking.`,
        action: 'Review category margins below',
      })
    }
  }

  return alerts
}
