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

const BLUES = ['#2563eb', '#3b82f6', '#60a5fa', '#1d4ed8', '#1e40af', '#93c5fd', '#bfdbfe']
const GREEN = '#16a34a'

// ── Shared formatters ─────────────────────────────────────────────────────────

function fmtCurrency(v: number) {
  if (v >= 1_000_000) return `£${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `£${(v / 1_000).toFixed(1)}k`
  return `£${v.toFixed(0)}`
}

const tooltipStyle = {
  fontSize: 12,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}

function ChartEmpty({ message = 'No data to display' }: { message?: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-muted-foreground text-center px-4">
      {message}
    </div>
  )
}

// ── Revenue by Month ──────────────────────────────────────────────────────────

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
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={fmtCurrency}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip
          formatter={(v) => [fmtCurrency(v as number), 'Net Revenue']}
          contentStyle={tooltipStyle}
        />
        <Bar dataKey="revenue" fill={BLUES[0]} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Generic horizontal bar chart ──────────────────────────────────────────────

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
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey={labelKey}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={140}
        />
        <Tooltip
          formatter={(v) => [formatter(v as number), '']}
          contentStyle={tooltipStyle}
        />
        <Bar dataKey={valueKey} radius={[0, 3, 3, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={color ?? BLUES[i % BLUES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Prime cost trend ──────────────────────────────────────────

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
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11 }}
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
          contentStyle={tooltipStyle}
        />
        <Legend formatter={(v) => (v === 'prime_cost_pct' ? 'Prime Cost %' : v === 'food_cost' ? 'Food Cost £' : 'Labour Cost £')} wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Target 60%', position: 'right', fontSize: 10, fill: '#f59e0b' }} />
        <Line type="monotone" dataKey="prime_cost_pct" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Gross margin by category ──────────────────────────────────────────────────

export function MarginByCategoryChart({
  data,
}: {
  data: { category: string; revenue: number; food_cost: number; margin_pct: number }[]
}) {
  if (!data.length) return <ChartEmpty message="Upload sales data with item categories to see margin by category" />
  const hasCostData = data.some((d) => d.food_cost > 0)
  if (!hasCostData) {
    return (
      <ChartEmpty message="Upload a menu items file with food costs to unlock margin by category" />
    )
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11 }}
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
          contentStyle={tooltipStyle}
        />
        <Bar dataKey="margin_pct" fill={GREEN} radius={[3, 3, 0, 0]} name="margin_pct" />
      </BarChart>
    </ResponsiveContainer>
  )
}
