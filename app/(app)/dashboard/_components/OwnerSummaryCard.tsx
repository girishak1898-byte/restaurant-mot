import { TrendingUp, TrendingDown, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPct, formatCurrency } from '@/lib/format'
import type { DashboardData } from '@/lib/data/dashboard'

interface SummaryLine {
  text: string
  positive: boolean
}

function deriveSummary(data: DashboardData): {
  improved: SummaryLine[]
  worsened: SummaryLine[]
  action: string
  period: string
} | null {
  const { byMonth, primeCostByMonth, overview, labourOverview, channelMargin } = data

  if (byMonth.length < 2) return null

  const curr = byMonth.at(-1)!
  const prev = byMonth.at(-2)!
  const period = curr.month

  const improved: SummaryLine[] = []
  const worsened: SummaryLine[] = []

  // Revenue trend
  const revChange =
    prev.revenue > 0 ? ((curr.revenue - prev.revenue) / prev.revenue) * 100 : null
  if (revChange !== null) {
    if (revChange >= 2) {
      improved.push({
        text: `Revenue up ${revChange.toFixed(1)}% to ${formatCurrency(curr.revenue)} vs last month`,
        positive: true,
      })
    } else if (revChange <= -2) {
      worsened.push({
        text: `Revenue down ${Math.abs(revChange).toFixed(1)}% to ${formatCurrency(curr.revenue)} vs last month`,
        positive: false,
      })
    }
  }

  // Prime cost trend
  const currPrime = primeCostByMonth.at(-1)
  const prevPrime = primeCostByMonth.at(-2)
  const primeChange =
    currPrime && prevPrime && prevPrime.prime_cost_pct > 0 && currPrime.prime_cost_pct > 0
      ? currPrime.prime_cost_pct - prevPrime.prime_cost_pct
      : null
  if (primeChange !== null) {
    if (primeChange <= -2) {
      improved.push({
        text: `Prime cost dropped ${Math.abs(primeChange).toFixed(1)}pp — now ${formatPct(currPrime!.prime_cost_pct)} of revenue`,
        positive: true,
      })
    } else if (primeChange >= 2) {
      worsened.push({
        text: `Prime cost rose ${primeChange.toFixed(1)}pp — now ${formatPct(currPrime!.prime_cost_pct)} of revenue`,
        positive: false,
      })
    }
  }

  // Labour %
  const labourPct =
    labourOverview && overview && overview.total_net > 0
      ? (labourOverview.total_labour / overview.total_net) * 100
      : null
  if (labourPct !== null) {
    if (labourPct >= 25 && labourPct <= 35) {
      improved.push({
        text: `Labour cost is healthy at ${formatPct(labourPct)} of revenue`,
        positive: true,
      })
    } else if (labourPct > 35) {
      worsened.push({
        text: `Labour is ${formatPct(labourPct)} of revenue — above the 35% target`,
        positive: false,
      })
    }
  }

  // Discount rate
  const discountPct =
    overview && overview.total_gross > 0
      ? (overview.total_discount / overview.total_gross) * 100
      : null
  if (discountPct !== null) {
    if (discountPct > 15) {
      worsened.push({
        text: `Discounts at ${formatPct(discountPct)} of gross revenue — review your promotions`,
        positive: false,
      })
    } else if (discountPct > 0 && discountPct <= 8) {
      improved.push({
        text: `Discount rate is low at ${formatPct(discountPct)} — good margin protection`,
        positive: true,
      })
    }
  }

  // Channel margin gap
  const channelsWithCost = channelMargin.filter((c) => c.food_cost > 0)
  if (channelsWithCost.length > 1) {
    const sorted = [...channelsWithCost].sort((a, b) => a.margin_pct - b.margin_pct)
    const worst = sorted[0]
    const best = sorted[sorted.length - 1]
    const gap = best.margin_pct - worst.margin_pct
    if (gap > 15) {
      worsened.push({
        text: `${worst.channel} margin is ${formatPct(worst.margin_pct)} — ${gap.toFixed(0)}pp below ${best.channel}`,
        positive: false,
      })
    }
  }

  // Recommended next action
  let action: string
  if (labourPct !== null && labourPct > 40) {
    action =
      'Labour is your biggest cost risk. Review next week\'s rota and look for shifts that can be cut or reorganised.'
  } else if (discountPct !== null && discountPct > 18) {
    action =
      'Your discount rate is high. Audit your active promotions, staff discounts, and delivery-platform deals this week.'
  } else if (primeChange !== null && primeChange > 4) {
    action =
      'Prime cost is climbing. Check your supplier invoices and food waste logs — a small fix here can recover meaningful margin.'
  } else if (revChange !== null && revChange < -8) {
    action =
      'Revenue has dropped significantly. Check whether a channel or outlet has gone quiet and investigate the cause.'
  } else if (channelsWithCost.length > 1) {
    const sorted = [...channelsWithCost].sort((a, b) => a.margin_pct - b.margin_pct)
    const worst = sorted[0]
    if (worst.margin_pct < 45) {
      action = `${worst.channel} has a weak margin. Consider whether the fees or discounts on this channel are worth the volume it brings.`
    } else {
      action =
        'Things are looking stable. Keep uploading data weekly to spot trends before they become problems.'
    }
  } else if (worsened.length === 0) {
    action =
      'Your numbers are looking healthy this period. Focus on maintaining consistent data uploads so trends stay visible.'
  } else {
    action =
      'Upload the latest week\'s sales and labour data to get a clearer picture of where costs are heading.'
  }

  if (improved.length === 0 && worsened.length === 0) return null

  return { improved, worsened, action, period }
}

export function OwnerSummaryCard({ data }: { data: DashboardData }) {
  const summary = deriveSummary(data)
  if (!summary) return null

  const { improved, worsened, action, period } = summary

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div>
          <h3 className="text-[13px] font-semibold">Owner Summary</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Latest period: {period}</p>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {/* What improved */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
                What improved
              </p>
            </div>
            {improved.length > 0 ? (
              <ul className="space-y-2">
                {improved.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-emerald-900/90">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    {line.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">Nothing notable yet — keep uploading data.</p>
            )}
          </div>

          {/* What worsened */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-700">
                Watch out for
              </p>
            </div>
            {worsened.length > 0 ? (
              <ul className="space-y-2">
                {worsened.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-amber-900/90">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    {line.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">No obvious warning signs this period.</p>
            )}
          </div>
        </div>

        {/* Recommended action */}
        <div className="rounded-lg border border-primary/15 bg-primary/5 p-3.5 flex gap-2.5">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-[11px] font-semibold text-primary mb-1 uppercase tracking-wide">Recommended action</p>
            <p className="text-[13px] text-foreground/80 leading-relaxed">{action}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
