/** Format a number as currency. Defaults to GBP symbol. */
export function formatCurrency(value: number, symbol = '£'): string {
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${symbol}${(value / 1_000).toFixed(1)}k`
  return `${symbol}${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/** Format a decimal as a percentage string, e.g. 34.5 → "34.5%" */
export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/** Format a number with thousands separators. */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-GB')
}
