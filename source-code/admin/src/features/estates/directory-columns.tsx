import type { Column } from '@/components/data/DataTable'
import { Sparkline } from '@/components/charts/Sparkline'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { EstateDirectoryRow } from './types'
import {
  formatCompact,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
  formatTenure,
  formatWeight,
} from '@/lib/format'

/*
  EST-01 amended — the three directory views. Kept out of EstateListPage.tsx
  for fast-refresh lint (same reason features/{collections,fertilizer}/status.ts
  are split out, though those hold no JSX — this one does, hence .tsx). Driven
  by `level('estateOwners')`, never `user.role` — see Claude.md's "level, not
  role" note for why.
*/

export type DirectoryView = 'management' | 'payments' | 'oversight'

export interface DirectoryViewConfig {
  /** column keys shown by default; the rest of `ALL_COLUMNS` stay hideable */
  defaultColumnKeys: string[]
  defaultSort: { key: string; direction: 'asc' | 'desc' }
  /** the Payments view's extra Outstanding Yes/No filter; other views have none */
  hasOutstandingFilter: boolean
  primaryAction: 'register' | 'issueAdvance' | null
  emptyTitle: string
  emptyDescription: string
}

const estateColumn: Column<EstateDirectoryRow> = {
  key: 'estateName',
  header: 'Estate',
  sortable: true,
  sortValue: (e) => e.estateName,
}

const ownerColumn: Column<EstateDirectoryRow> = {
  key: 'ownerName',
  header: 'Owner',
  sortable: true,
  sortValue: (e) => e.ownerName,
}

const routeColumn: Column<EstateDirectoryRow> = { key: 'route', header: 'Route' }

const statusColumn: Column<EstateDirectoryRow> = {
  key: 'status',
  header: 'Status',
  render: (e) => <StatusBadge tone={e.status === 'Active' ? 'success' : 'danger'}>{e.status}</StatusBadge>,
}

const registeredColumn: Column<EstateDirectoryRow> = {
  key: 'registeredOn',
  header: 'Registered',
  sortable: true,
  hideable: true,
  sortValue: (e) => e.registeredOn,
  render: (e) => <span title={`${formatTenure(e.tenureMonths)} tenure`}>{formatDate(e.registeredOn)}</span>,
}

const ytdColumn: Column<EstateDirectoryRow> = {
  key: 'ytdDeliveriesKg',
  header: 'YTD Deliveries',
  align: 'right',
  sortable: true,
  hideable: true,
  sortValue: (e) => e.ytdDeliveriesKg,
  render: (e) => formatWeight(e.ytdDeliveriesKg),
}

const lastPaymentColumn: Column<EstateDirectoryRow> = {
  key: 'lastPaymentRs',
  header: 'Last Payment',
  align: 'right',
  sortable: true,
  hideable: true,
  sortValue: (e) => e.lastPaymentDate ?? '',
  render: (e) =>
    e.lastPaymentRs === null ? (
      <span className="text-text-muted">—</span>
    ) : (
      <span>
        {formatCurrency(e.lastPaymentRs)}
        {e.lastPaymentDate && <span className="ml-1.5 text-xs text-text-muted">{formatDate(e.lastPaymentDate)}</span>}
      </span>
    ),
}

const outstandingColumn: Column<EstateDirectoryRow> = {
  key: 'outstandingRs',
  header: 'Outstanding',
  align: 'right',
  sortable: true,
  hideable: true,
  sortValue: (e) => e.outstandingRs,
  // Same rule as OutstandingPanel (§6.3): amber only when non-zero, calm
  // success-toned "Settled" at zero, never danger-red — owing for
  // recently-issued fertilizer is normal, red here would cry wolf.
  render: (e) =>
    e.hasOutstanding ? (
      <span className="font-medium text-warning-fg">{formatCurrency(e.outstandingRs)}</span>
    ) : (
      <span className="text-success-fg">Settled</span>
    ),
}

const lifetimeEarnedColumn: Column<EstateDirectoryRow> = {
  key: 'lifetimeEarnedRs',
  header: 'Lifetime Earned',
  align: 'right',
  sortable: true,
  hideable: true,
  sortValue: (e) => e.lifetimeEarnedRs,
  render: (e) => <span title={formatCurrency(e.lifetimeEarnedRs)}>{formatCompactCurrency(e.lifetimeEarnedRs)}</span>,
}

const lifetimeDeliveredColumn: Column<EstateDirectoryRow> = {
  key: 'lifetimeDeliveredKg',
  header: 'Lifetime kg',
  align: 'right',
  sortable: true,
  sortValue: (e) => e.lifetimeDeliveredKg,
  render: (e) => <span title={formatWeight(e.lifetimeDeliveredKg)}>{formatCompact(e.lifetimeDeliveredKg)} kg</span>,
}

const superPctColumn: Column<EstateDirectoryRow> = {
  key: 'superPct',
  header: 'Super %',
  align: 'right',
  sortable: true,
  sortValue: (e) => e.superPct,
  render: (e) => formatPercent(e.superPct),
}

const qualityTrendColumn: Column<EstateDirectoryRow> = {
  key: 'qualityTrend',
  header: 'Quality Trend',
  align: 'right',
  hideable: true,
  render: (e) => <Sparkline data={e.qualityTrend.map((p) => ({ value: p.superPct }))} className="ml-auto" />,
}

const tenureColumn: Column<EstateDirectoryRow> = {
  key: 'tenureMonths',
  header: 'Tenure',
  align: 'right',
  sortable: true,
  sortValue: (e) => e.tenureMonths,
  render: (e) => formatTenure(e.tenureMonths),
}

const documentsColumn: Column<EstateDirectoryRow> = {
  key: 'documentCount',
  header: 'Documents',
  align: 'right',
  sortable: true,
  hideable: true,
  sortValue: (e) => e.documentCount,
  render: (e) => `${e.documentCount}`,
}

/** Union of every column any view might show — each view picks a subset by key. */
export const ALL_COLUMNS: Column<EstateDirectoryRow>[] = [
  estateColumn,
  ownerColumn,
  routeColumn,
  registeredColumn,
  ytdColumn,
  lastPaymentColumn,
  outstandingColumn,
  lifetimeEarnedColumn,
  lifetimeDeliveredColumn,
  superPctColumn,
  qualityTrendColumn,
  tenureColumn,
  documentsColumn,
  statusColumn,
]

export const DIRECTORY_VIEWS: Record<DirectoryView, DirectoryViewConfig> = {
  management: {
    defaultColumnKeys: ['estateName', 'ownerName', 'route', 'registeredOn', 'lifetimeEarnedRs', 'status'],
    defaultSort: { key: 'registeredOn', direction: 'desc' },
    hasOutstandingFilter: false,
    primaryAction: 'register',
    emptyTitle: 'Register your first estate owner',
    emptyDescription: 'No estates match your filters yet.',
  },
  payments: {
    defaultColumnKeys: ['estateName', 'ownerName', 'route', 'ytdDeliveriesKg', 'lastPaymentRs', 'outstandingRs', 'status'],
    defaultSort: { key: 'lastPaymentRs', direction: 'desc' },
    hasOutstandingFilter: true,
    primaryAction: 'issueAdvance',
    emptyTitle: 'No estates matching your filters',
    emptyDescription: 'Try widening the route, status or outstanding filter.',
  },
  oversight: {
    defaultColumnKeys: ['estateName', 'ownerName', 'route', 'lifetimeDeliveredKg', 'superPct', 'qualityTrend', 'tenureMonths', 'status'],
    defaultSort: { key: 'lifetimeDeliveredKg', direction: 'desc' },
    hasOutstandingFilter: false,
    primaryAction: null,
    emptyTitle: 'No estates to compare',
    emptyDescription: 'No estates match your filters yet.',
  },
}

/** Columns for a view: its defaults (in order), plus — except for the fixed Oversight view — every other hideable column, initially hidden. */
export function columnsForView(view: DirectoryView): Column<EstateDirectoryRow>[] {
  const config = DIRECTORY_VIEWS[view]
  const defaults = config.defaultColumnKeys
    .map((key) => ALL_COLUMNS.find((c) => c.key === key))
    .filter((c): c is Column<EstateDirectoryRow> => !!c)
  if (view === 'oversight') return defaults
  const extras = ALL_COLUMNS.filter((c) => c.hideable && !config.defaultColumnKeys.includes(c.key))
  return [...defaults, ...extras]
}

/** Which of a view's columns should start hidden (its hideable extras, not its defaults). */
export function hiddenByDefault(view: DirectoryView): string[] {
  if (view === 'oversight') return []
  const config = DIRECTORY_VIEWS[view]
  return ALL_COLUMNS.filter((c) => c.hideable && !config.defaultColumnKeys.includes(c.key)).map((c) => c.key)
}
