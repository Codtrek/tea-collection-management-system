/*
  Content & formatting standards (master brief §6). Define once, use everywhere.
  - Currency: Rs. 1,245,600  (thousands separator, Rs. prefix, no decimals unless cents)
  - Weight:   45,670 kg       (thousands separator, one decimal only when fractional)
  - Dates:    DD/MM/YYYY
*/

const grouped = new Intl.NumberFormat('en-US')

/** `Rs. 1,245,600` — decimals only when the amount has cents. */
export function formatCurrency(amount: number): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0
  const n = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount)
  return `Rs. ${n}`
}

/** `45,670 kg` — one decimal place only when the value is fractional. */
export function formatWeight(kg: number): string {
  const isFractional = Math.round(kg * 10) % 10 !== 0
  const n = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isFractional ? 1 : 0,
    maximumFractionDigits: 1,
  }).format(kg)
  return `${n} kg`
}

/** Plain grouped number, e.g. `27` or `1,245`. */
export function formatNumber(n: number): string {
  return grouped.format(n)
}

/**
 * `41.2M` / `284.7K` — abbreviated for a headline figure (EST-03's Lifetime
 * Summary strip, addendum §4). Below 1,000 falls back to the plain grouped
 * form. Callers pair this with the exact value on `title` for hover/a11y.
 */
export function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return grouped.format(n)
}

/** `Rs. 41.2M` — formatCompact with the currency prefix. */
export function formatCompactCurrency(n: number): string {
  return `Rs. ${formatCompact(n)}`
}

/** `6 yr 4 mo` / `6 yr` / `4 mo` — tenure length, used by EST-03's summary strip and EST-01's directory. */
export function formatTenure(tenureMonths: number): string {
  const years = Math.floor(tenureMonths / 12)
  const months = tenureMonths % 12
  if (years === 0) return `${months} mo`
  if (months === 0) return `${years} yr`
  return `${years} yr ${months} mo`
}

/** `6.2%` (or `+6.2%` when signed). */
export function formatPercent(value: number, signed = false): string {
  const s = value.toFixed(1)
  const sign = signed && value > 0 ? '+' : ''
  return `${sign}${s}%`
}

/** `DD/MM/YYYY` throughout the portal. */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

/** `DD/MM/YYYY HH:mm` for audit timestamps. */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${formatDate(d)} ${hh}:${min}`
}

/** Relative time for notifications: `12m ago`, `2h ago`, `3d ago`. */
export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return formatDate(d)
}

/** Mask all but the last 4 chars of a sensitive value (bank a/c), §13. */
export function maskAccount(value: string): string {
  if (value.length <= 4) return value
  return `•••• •••• ${value.slice(-4)}`
}

/** Initials for avatar fallback: "K. Perera" -> "KP". */
export function initials(name: string): string {
  const parts = name.replace(/[.]/g, '').trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
