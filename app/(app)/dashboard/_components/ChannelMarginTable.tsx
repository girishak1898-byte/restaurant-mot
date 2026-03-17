import { cn } from '@/lib/utils'
import { formatCurrency, formatPct } from '@/lib/format'
import type { ChannelMargin } from '@/lib/data/dashboard'

export function ChannelMarginTable({ data }: { data: ChannelMargin[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center leading-relaxed">
        No channel data available. Make sure your sales data includes a channel column.
      </p>
    )
  }

  const hasFoodCost = data.some((d) => d.food_cost > 0)

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Channel</th>
            <th className="pb-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Net Revenue</th>
            <th className="pb-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Discount</th>
            {hasFoodCost && (
              <th className="pb-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Margin</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-muted/40 transition-colors">
              <td className="py-2.5 pr-4 font-medium">{row.channel}</td>
              <td className="py-2.5 text-right text-muted-foreground nums">{formatCurrency(row.net_revenue)}</td>
              <td className="py-2.5 text-right">
                <span
                  className={cn(
                    'font-semibold nums',
                    row.discount_pct > 20 && 'text-red-600',
                    row.discount_pct > 12 && row.discount_pct <= 20 && 'text-amber-600',
                    row.discount_pct <= 12 && 'text-emerald-600'
                  )}
                >
                  {formatPct(row.discount_pct)}
                </span>
              </td>
              {hasFoodCost && (
                <td className="py-2.5 text-right">
                  {row.food_cost > 0 ? (
                    <span
                      className={cn(
                        'font-semibold nums',
                        row.margin_pct >= 65 && 'text-emerald-600',
                        row.margin_pct < 50 && 'text-red-600',
                        row.margin_pct >= 50 && row.margin_pct < 65 && 'text-amber-600'
                      )}
                    >
                      {formatPct(row.margin_pct)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!hasFoodCost && (
        <p className="text-xs text-muted-foreground mt-3">
          Upload menu items with food costs to see gross margin per channel.
        </p>
      )}
    </div>
  )
}
