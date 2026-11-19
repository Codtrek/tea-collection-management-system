import { formatCurrency } from '@/lib/format'
import type { HourRates } from './types'

/** "Rs. 400 · Rs. 600 · Rs. 480 · Rs. 720" — day · day OT · night · night OT, per hour. */
export const rate4 = (r: HourRates) =>
  `${formatCurrency(r.dayRate)} · ${formatCurrency(r.dayOtRate)} · ${formatCurrency(r.nightRate)} · ${formatCurrency(r.nightOtRate)}`
