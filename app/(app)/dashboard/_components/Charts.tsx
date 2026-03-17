'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts'

// ── Palette ───────────────────────────────────────────────────────────────────
// Indigo primary + complementary suite — all professional, none flashy

const INDIGO   = '#4338CA'  // primary brand
const INDIGO_2 = '#6366F1'  // lighter indigo
const INDIGO_3 = '#818CF8'
const TEAL     = '#0F766E'
const SLATE    = '#475569'
const VIOLET   = '#6D28D9'

// Sequence for multi-bar charts (channel, outlet, menu items)
const SERIES = [INDIGO, TEAL, '#D97706', VIOLET, '#0369A1', SLATE, INDIGO_2]

const GREEN_SERIES = TEAL

// ── Shared formatting ──────────────────────────────────────────────────────────

function fmtCurrency(v: number) {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `£${(v / 1_000).toFixed(1)}k`
  return `£${v.toFixed(0)}`
}

// ── Shared style tokens ────────────────────────────────────────────────────────

const GRID_COLOR  = '#EEF0F6'   // very subtle cool-gray grid
const TICK_STYLE  = { fontSize: 11, fill: '#60677A', fontFamily: 'inherit' }
const TOOLTIP_STYLE = {
  fontSize: 12,
  backgroundColor: '#fff',
  border: '1px solid #E4E7F0',
  borderRadius: 8,
  boxShadow: '0 4px 16px rgba(30,35,60,0.08)',
  padding: '8px 12px',
  fontFamily: 'inherit',
}

// ── Empty state ────────────────────────────────────────────────────────────────

function ChartEmpty({ message = 'No data to display' }: { message?: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-muted-foreground text-center px-6 leading-relaxed">
      {message}
    </div>
  )
}

// ── Revenue by Month ───────────────────────────────────────────────────────────

export function RevenueByMonthChart({
  data,
  emptyMessage,
}: {
  data: { month: string; revenue: number }[]
  emptyMessage?: string
}) {
  if (!data.length) return <ChartEmpty message={emptyMessage} />
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="month"
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={fmtCurrency}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip
          formatter={(v) => [fmtCurrency(v as number), 'Net Revenue']}
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: '#EEF0F6', radius: 4 }}
        />
        <Bar dataKey="revenue" fill={INDIGO} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Generic horizontal bar chart ───────────────────────────────────────────────

export function HBarChart({
  data,
  valueKey,
  labelKey,
  formatter = fmtCurrency,
  color,
  emptyMessage,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  valueKey: string
  labelKey: string
  formatter?: (v: number) => string
  color?: string
  emptyMessage?: string
}) {
  if (!data.length) return <ChartEmpty message={emptyMessage} />
  const height = Math.min(data.length * 44 + 24, 320)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
      >
        <XAxis
          type="number"
          tickFormatter={formatter}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey={labelKey}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip
          formatter={(v) => [formatter(v as number), '']}
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: '#EEF0F6' }}
        />
        <Bar dataKey={valueKey} radius={[0, 3, 3, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={color ?? SERIES[i % SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Prime cost trend ───────────────────────────────────────────────────────────

export function PrimeCostTrendChart({
  data,
}: {
  data: { month: string; prime_cost_pct: number; food_cost: number; labour_cost: number; net_revenue: number }[]
}) {
  if (!data.length) return <ChartEmpty message="Upload sales and labour data to see the prime cost trend" />
  const hasCost = data.some((d) => d.prime_cost_pct > 0)
  if (!hasCost) return <ChartEmpty message="Upload menu items with food costs and labour shifts to see prime cost" />
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis dataKey="month" tick={TICK_STYLE} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          width={44}
        />
        <Tooltip
          formatter={(v, name) => {
            if (name === 'prime_cost_pct') return [`${Number(v).toFixed(1)}%`, 'Prime Cost %']
            return [fmtCurrency(v as number), name === 'food_cost' ? 'Food Cost' : 'Labour Cost']
          }}
          contentStyle={TOOLTIP_STYLE}
        />
        <Legend
          formatter={(v) =>
            v === 'prime_cost_pct' ? 'Prime Cost %' : v === 'food_cost' ? 'Food Cost £' : 'Labour Cost £'
          }
          wrapperStyle={{ fontSize: 11, color: '#8490A8' }}
        />
        <ReferenceLine
          y={60}
          stroke="#D97706"
          strokeDasharray="4 4"
          label={{ value: 'Target 60%', position: 'right', fontSize: 10, fill: '#D97706' }}
        />
        <Line
          type="monotone"
          dataKey="prime_cost_pct"
          stroke={INDIGO}
          strokeWidth={2}
          dot={{ r: 3, fill: INDIGO, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: INDIGO }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Gross margin by category ───────────────────────────────────────────────────

export function MarginByCategoryChart({
  data,
}: {
  data: { category: string; revenue: number; food_cost: number; margin_pct: number }[]
}) {
  if (!data.length) return <ChartEmpty message="Upload sales data with item categories to see margin by category" />
  const hasCostData = data.some((d) => d.food_cost > 0)
  if (!hasCostData) {
    return <ChartEmpty message="Upload a menu items file with food costs to unlock margin by category" />
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="category"
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={TICK_STYLE}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          width={44}
        />
        <Tooltip
          formatter={(v, name) =>
            name === 'margin_pct'
              ? [`${Number(v).toFixed(1)}%`, 'Gross Margin']
              : [fmtCurrency(v as number), 'Revenue']
          }
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: '#EEF0F6', radius: 4 }}
        />
        <Bar dataKey="margin_pct" fill={GREEN_SERIES} radius={[3, 3, 0, 0]} name="margin_pct" />
      </BarChart>
    </ResponsiveContainer>
  )
}
