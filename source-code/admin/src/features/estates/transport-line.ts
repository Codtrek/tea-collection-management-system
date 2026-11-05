import { formatCurrency } from '@/lib/format'
import type { Settlement } from './types'

/*
  The transport line of a settlement, in words (Administration-Addendum §4): a fixed monthly
  charge per estate, frozen when processed, worked out live while pending. Pure; tested in
  transport-line.test.ts.
*/

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthName = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`

export interface TransportLineText {
  label: string
  /** the amount column: '- Rs. 5,000', '—' or 'Not configured' */
  value: string
  /** carry-forward notes, if any */
  notes: string[]
  notConfigured: boolean
}

export function transportLineText(s: Pick<Settlement, 'transport' | 'transportCost' | 'selfDelivery'>): TransportLineText {
  const t = s.transport
  const less = (n: number) => (n > 0 ? `- ${formatCurrency(n)}` : '—')
  if (!t) {
    // processed before the monthly charge existed: the stored figure
    return {
      label: s.selfDelivery ? 'Less: Transport cost (exempt — self-delivery)' : 'Less: Transport cost',
      value: less(s.transportCost),
      notes: [],
      notConfigured: false,
    }
  }
  const notes: string[] = []
  if (t.carriedIn > 0) notes.push(`Includes ${formatCurrency(t.carriedIn)} carried from the estate’s last settlement.`)
  if (t.carriedOut > 0) notes.push(`${formatCurrency(t.carriedOut)} couldn’t be covered by this settlement and is carried to the next one.`)
  switch (t.status) {
    case 'not_configured':
      return { label: 'Less: Transport', value: 'Not configured', notes, notConfigured: true }
    case 'exempt':
      return { label: 'Less: Transport — exempt (self-delivery)', value: less(t.taken), notes, notConfigured: false }
    case 'no_deliveries':
      return { label: 'Less: Transport — no deliveries this month, no charge', value: less(t.taken), notes, notConfigured: false }
    case 'charged':
      return {
        label: `Less: Transport (fixed monthly) ${formatCurrency(t.charge)}${t.versionMonth ? ` — version effective ${monthName(t.versionMonth)}` : ''}`,
        value: less(t.taken),
        notes,
        notConfigured: false,
      }
  }
}
