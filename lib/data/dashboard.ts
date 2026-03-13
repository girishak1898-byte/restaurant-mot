import { createClient } from '@/lib/supabase/server'

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

// ── Operator alerts (rules engine) ────────────────────────────────────────────

export interface Alert {
  level: 'critical' | 'warning' | 'info' | 'success'
  title: string
  body: string
  action?: string
}

export function generateAlerts(data: DashboardData): Alert[] {
  const alerts: Alert[] = []
  const { overview, byChannel, byOutlet, labourOverview, marginByCategory, primeCostByMonth, channelMargin, topByMargin } = data

  if (!overview || overview.total_net === 0) return alerts

  // ── Prime cost ──────────────────────────────────────────────────
  const latestPrime = primeCostByMonth.at(-1)
  if (latestPrime && latestPrime.prime_cost_pct > 0) {
    const pct = latestPrime.prime_cost_pct
    if (pct > 65) {
      alerts.push({
        level: 'critical',
        title: `Prime cost at ${pct}% — critically high`,
        body: `Food + labour cost exceeded 65% of revenue in ${latestPrime.month}. The industry target is below 60%. Immediate review of food waste and scheduling is needed.`,
        action: 'Review prime cost trend below',
      })
    } else if (pct > 60) {
      alerts.push({
        level: 'warning',
        title: `Prime cost at ${pct}% — above target`,
        body: `Combined food and labour cost is above the 60% benchmark in ${latestPrime.month}. Check for waste, over-staffing, or underpriced menu items.`,
        action: 'Review prime cost trend below',
      })
    } else {
      alerts.push({
        level: 'success',
        title: `Prime cost healthy at ${pct}%`,
        body: `Food + labour cost is within the target range (below 60%) for ${latestPrime.month}. Keep monitoring monthly to catch drift early.`,
      })
    }
  }

  // ── Labour cost % ───────────────────────────────────────────────
  if (labourOverview && labourOverview.total_labour > 0) {
    const pct = (labourOverview.total_labour / overview.total_net) * 100
    if (pct > 35) {
      alerts.push({
        level: 'warning',
        title: `Labour at ${pct.toFixed(1)}% of revenue — above benchmark`,
        body: `The typical restaurant range is 25–35%. Consider reviewing rotas, peak-hour coverage, or split-shift scheduling.`,
      })
    } else if (pct < 20) {
      alerts.push({
        level: 'info',
        title: `Labour at ${pct.toFixed(1)}% — unusually low`,
        body: `This is below the typical 25–35% range. Double-check that all labour data has been imported.`,
      })
    }
  }

  // ── Discount rate ───────────────────────────────────────────────
  if (overview.total_gross > 0) {
    const discountPct = (overview.total_discount / overview.total_gross) * 100
    if (discountPct > 20) {
      alerts.push({
        level: 'critical',
        title: `Discount rate at ${discountPct.toFixed(1)}% — damaging margins`,
        body: `More than 1 in 5 pounds of gross revenue is being discounted away. Audit your promotions, vouchers, and staff discount policy.`,
      })
    } else if (discountPct > 12) {
      alerts.push({
        level: 'warning',
        title: `Discount rate at ${discountPct.toFixed(1)}% — worth reviewing`,
        body: `Discounts are above 12% of gross revenue. Review your active promotions to ensure they're driving incremental covers, not just eroding margin.`,
      })
    }
  }

  // ── Channel margin leak ─────────────────────────────────────────
  const channelsWithCost = channelMargin.filter((c) => c.food_cost > 0)
  if (channelsWithCost.length > 1) {
    const sorted = [...channelsWithCost].sort((a, b) => a.margin_pct - b.margin_pct)
    const worst = sorted[0]
    const best = sorted[sorted.length - 1]
    const gap = best.margin_pct - worst.margin_pct
    if (gap > 15) {
      alerts.push({
        level: 'warning',
        title: `${worst.channel} margin is ${gap.toFixed(0)}pp below ${best.channel}`,
        body: `${worst.channel} has a ${worst.margin_pct}% gross margin vs ${best.margin_pct}% on ${best.channel}. Delivery platform fees or channel-specific discounting may explain the gap.`,
        action: 'See Margin Leak section below',
      })
    }
  }

  // ── Low-margin high-revenue items ───────────────────────────────
  const itemsWithCost = topByMargin.filter((i) => i.margin_pct > 0 && i.revenue > 0)
  const highRevThreshold = overview.total_net * 0.03 // items > 3% of revenue
  const leakers = itemsWithCost.filter((i) => i.revenue >= highRevThreshold && i.margin_pct < 50)
  if (leakers.length > 0) {
    const item = leakers[0]
    alerts.push({
      level: 'warning',
      title: `"${item.item_name}" sells well but has low margin`,
      body: `At ${item.margin_pct.toFixed(1)}% gross margin, this popular item is dragging overall profitability. Consider a price review or ingredient substitution.`,
      action: 'See Menu Performance below',
    })
  }

  // ── Top channel / outlet ────────────────────────────────────────
  if (byChannel.length > 0) {
    const top = byChannel[0]
    const pct = ((top.revenue / overview.total_net) * 100).toFixed(0)
    if (byChannel.length === 1) {
      alerts.push({
        level: 'info',
        title: `All revenue from ${top.channel}`,
        body: `100% of sales come through ${top.channel}. Diversifying channels can reduce platform dependency and risk.`,
      })
    } else {
      alerts.push({
        level: 'info',
        title: `${top.channel} drives ${pct}% of revenue`,
        body: `Your strongest channel is ${top.channel}. ${byChannel.length > 1 ? `Second is ${byChannel[1].channel}.` : ''}`,
      })
    }
  }

  // ── Margin category insights ────────────────────────────────────
  const withCostData = marginByCategory.filter((c) => c.food_cost > 0)
  if (withCostData.length > 0) {
    const best = [...withCostData].sort((a, b) => b.margin_pct - a.margin_pct)[0]
    const worst = [...withCostData].sort((a, b) => a.margin_pct - b.margin_pct)[0]

    alerts.push({
      level: 'success',
      title: `${best.category} is your most profitable category`,
      body: `${best.margin_pct.toFixed(1)}% gross margin. Push this category in upsells and menu placement.`,
    })

    if (worst.category !== best.category && worst.margin_pct < 50) {
      alerts.push({
        level: 'info',
        title: `${worst.category} has the lowest margin at ${worst.margin_pct.toFixed(1)}%`,
        body: `Review portion sizes, food costs, or pricing for this category to bring it above 50%.`,
      })
    }
  }

  return alerts
}
