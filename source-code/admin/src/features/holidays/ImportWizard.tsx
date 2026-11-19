import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Info, Loader2, RefreshCw, TriangleAlert, Upload } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Tabs } from '@/components/ui/Tabs'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { ImportPreview, ImportPreviewRow, ResyncItem } from '@/features/employees/types'
import * as holidaysService from '@/services/holidays'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { tickedCounts, trimIcsToYear } from './import-model'

const GAZETTE = 'The government gazette is the official source. Review before confirming.'

interface ImportWizardProps {
  initialYear: number
  today: string
  onClose: () => void
  onDone: (msg: string) => void
  onFailed: (err: unknown) => void
  /** "Enter manually" — the Poya / public holiday form */
  onManual: () => void
}

/*
  Import Sri Lanka holidays (Attendance-Leave-Addendum §4.5), Administrator only. Pick the year;
  the server fetches Google's public "Holidays in Sri Lanka" calendar (or reads an uploaded .ics /
  CSV); the Administrator reviews every row — type, include, flags — and confirms. A re-sync lists
  only the differences, each accepted (or ignored) one by one; nothing is overwritten on its own.
*/
export function ImportWizard({ initialYear, today, onClose, onDone, onFailed, onManual }: ImportWizardProps) {
  const thisYear = Number(today.slice(0, 4))
  const [year, setYear] = useState(initialYear)
  const [tab, setTab] = useState<'import' | 'resync'>('import')
  const [source, setSource] = useState<'google' | 'file'>('google')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [rows, setRows] = useState<ImportPreviewRow[]>([])
  const [result, setResult] = useState<{ added: number; skipped: number; counts: { poya: number; public: number } } | null>(null)

  const loaded = (p: ImportPreview) => {
    setPreview(p)
    setRows(p.rows)
  }
  const google = useMutation({ mutationFn: () => holidaysService.previewGoogleImport(year), onSuccess: loaded, onError: onFailed })
  const file = useMutation({
    mutationFn: async (f: File) => {
      const text = await f.text()
      const csv = f.name.toLowerCase().endsWith('.csv')
      return holidaysService.previewFileImport(year, csv ? 'csv' : 'ics', csv ? text : trimIcsToYear(text, year))
    },
    onSuccess: loaded,
    onError: onFailed,
  })
  const confirm = useMutation({
    mutationFn: () =>
      holidaysService.confirmImport({
        year,
        source: preview!.source,
        rows: rows.filter((r) => !r.alreadyImported).map(({ uid, date, name, type, include }) => ({ uid, date, name, type, include })),
      }),
    onSuccess: (r) => {
      setResult(r)
      onDone(`${r.added} holiday${r.added === 1 ? '' : 's'} imported for ${year}`)
    },
    onError: onFailed,
  })

  const counts = tickedCounts(rows.filter((r) => !r.alreadyImported))
  const setRow = (uid: string, patch: Partial<ImportPreviewRow>) => setRows((all) => all.map((r) => (r.uid === uid ? { ...r, ...patch } : r)))
  const loading = google.isPending || file.isPending

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Import Sri Lanka holidays"
      footer={
        tab === 'import' && preview && !result ? (
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Back
            </Button>
            <Button onClick={() => confirm.mutate()} loading={confirm.isPending} disabled={counts.poya + counts.public === 0}>
              Import {counts.poya} Poya · {counts.public} public
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {result ? 'Done' : 'Close'}
          </Button>
        )
      }
    >
      <p className="mb-3 flex items-start gap-2 rounded-[var(--radius-md)] border border-warning-fg/25 bg-warning-bg/60 p-2.5 text-sm text-text">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning-fg" aria-hidden />
        {preview?.note ?? GAZETTE}
      </p>

      {!preview && !result && (
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="w-32">
            <Select
              label="Year"
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
              options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({ value: String(y), label: String(y) }))}
            />
          </div>
          <Tabs
            tabs={[
              { id: 'import', label: 'Import' },
              { id: 'resync', label: 'Re-sync with Google' },
            ]}
            active={tab}
            onChange={(t) => setTab(t as 'import' | 'resync')}
          />
        </div>
      )}

      {result ? (
        <div className="py-2 text-sm">
          <p className="font-medium text-text">
            {result.added} added, {result.skipped} left out.
          </p>
          <p className="text-text-muted">
            {year} now has {result.counts.poya} Poya days and {result.counts.public} public holidays.
          </p>
        </div>
      ) : tab === 'resync' ? (
        <Resync year={year} onDone={onDone} onFailed={onFailed} />
      ) : !preview ? (
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex gap-2" role="radiogroup" aria-label="Where from">
            {(['google', 'file'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={source === s}
                onClick={() => setSource(s)}
                className={cn(
                  'flex-1 rounded-[var(--radius-md)] border p-3 text-left',
                  source === s ? 'border-primary bg-brand-soft' : 'border-border hover:bg-surface-hover',
                )}
              >
                <span className="block font-medium text-text">{s === 'google' ? 'Google: Holidays in Sri Lanka' : 'Upload a file'}</span>
                <span className="block text-xs text-text-muted">
                  {s === 'google' ? 'Google’s public calendar, fetched by the server.' : 'A .ics calendar or a CSV with date,name[,type].'}
                </span>
              </button>
            ))}
          </div>
          {source === 'google' ? (
            <Button className="self-start" onClick={() => google.mutate()} loading={google.isPending}>
              Get {year} holidays
            </Button>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 self-start rounded-[var(--radius-md)] border border-dashed border-border-strong px-4 py-3 text-text hover:bg-surface-hover">
              <Upload className="size-4" aria-hidden />
              Choose .ics or .csv
              <input
                type="file"
                accept=".ics,.csv,text/calendar,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) file.mutate(f)
                }}
              />
            </label>
          )}
          {loading && <Loader2 className="size-4 animate-spin text-text-muted" aria-label="Loading" />}
          <button type="button" className="self-start text-primary hover:underline" onClick={onManual}>
            Or enter holidays manually
          </button>
        </div>
      ) : (
        <ReviewTable rows={rows} onChange={setRow} />
      )}
    </Modal>
  )
}

function ReviewTable({ rows, onChange }: { rows: ImportPreviewRow[]; onChange: (uid: string, patch: Partial<ImportPreviewRow>) => void }) {
  return (
    <div className="max-h-[52vh] overflow-auto rounded-[var(--radius-md)] border border-border">
      <table className="w-full table-fixed text-sm">
        <thead className="sticky top-0 z-10 bg-surface-sunken text-[11px] uppercase tracking-wide text-text-muted">
          <tr>
            <th className="w-20 px-3 py-2 text-left">Include</th>
            <th className="w-28 px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="w-36 px-3 py-2 text-left">Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.uid} className={cn('border-t border-border', !r.include && 'bg-surface-sunken/60')}>
              <td className="px-3 py-2 align-top">
                <Checkbox
                  aria-label={`Include ${r.name}`}
                  checked={r.include}
                  disabled={r.alreadyImported}
                  onChange={(e) => onChange(r.uid, { include: e.target.checked })}
                />
              </td>
              <td className="whitespace-nowrap px-3 py-2 align-top tabular">{formatDate(r.date)}</td>
              <td className="px-3 py-2 align-top">
                <span className={cn('text-text', !r.include && 'text-text-muted')}>{r.name}</span>
                <span className="mt-0.5 flex flex-wrap gap-1">
                  {r.note && <StatusBadge tone={r.alreadyImported ? 'success' : 'neutral'}>{r.note}</StatusBadge>}
                  {r.tentative && <StatusBadge tone="warning">Date is tentative</StatusBadge>}
                  {r.sameDay && <StatusBadge tone="assigned">Two holidays this day</StatusBadge>}
                  {r.conflict && <StatusBadge tone="warning">{r.conflict}</StatusBadge>}
                </span>
              </td>
              <td className="px-3 py-2 align-top">
                <select
                  aria-label={`Type of ${r.name}`}
                  value={r.type}
                  disabled={r.alreadyImported}
                  onChange={(e) => onChange(r.uid, { type: e.target.value as 'poya' | 'public' })}
                  className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1 text-sm text-text"
                >
                  <option value="poya">Poya day</option>
                  <option value="public">Public holiday</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const KIND_LABEL: Record<ResyncItem['kind'], string> = { added: 'New in Google', removed: 'Removed from Google', changed: 'Changed in Google' }

/** Re-sync: the differences only; each accepted or ignored on its own. Manual holidays never appear. */
function Resync({ year, onDone, onFailed }: { year: number; onDone: (msg: string) => void; onFailed: (err: unknown) => void }) {
  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['holidays', 'resync', year],
    queryFn: () => holidaysService.getResync(year),
  })
  const act = useMutation({
    mutationFn: ({ item, ignore }: { item: ResyncItem; ignore?: boolean }) =>
      ignore && item.kind === 'added'
        ? holidaysService.ignoreResync({ year, kind: 'added', uid: item.uid })
        : holidaysService.acceptResync({ year, kind: item.kind, uid: item.uid, ...(item.kind === 'added' ? { type: item.type } : {}) }),
    onSuccess: (_, v) => {
      onDone(v.ignore ? `Left out: ${v.item.name}` : `Accepted: ${v.item.name}`)
      void refetch()
    },
    onError: onFailed,
  })
  if (isPending) return <Loader2 className="size-5 animate-spin text-text-muted" aria-label="Loading" />
  if (isError)
    return (
      <p className="text-sm text-danger-fg">
        Couldn’t compare with Google’s calendar.{' '}
        <button type="button" className="text-primary hover:underline" onClick={() => void refetch()}>
          Try again
        </button>
      </p>
    )
  return (
    <div className="text-sm">
      <p className="mb-2 flex items-center gap-2 text-text-muted">
        <Info className="size-4" aria-hidden /> Only differences with what was imported from Google are listed. Manual holidays are never changed.
        {isFetching && <RefreshCw className="size-3.5 animate-spin" aria-hidden />}
      </p>
      {data.items.length === 0 ? (
        <p className="py-4 text-text">{year} matches Google’s calendar — nothing to do.</p>
      ) : (
        <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
          {data.items.map((item) => (
            <li key={`${item.kind}-${item.uid}`} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-border p-3">
              <span>
                <StatusBadge tone={item.kind === 'removed' ? 'danger' : item.kind === 'added' ? 'approved' : 'warning'}>{KIND_LABEL[item.kind]}</StatusBadge>
                <span className="ml-2 font-medium text-text">{item.name}</span>
                <span className="block text-xs text-text-muted">
                  {formatDate(item.date)}
                  {item.kind === 'changed' && ` (was ${item.was.name}, ${formatDate(item.was.date)})`}
                  {item.kind === 'added' && item.note && ` · ${item.note}`}
                </span>
              </span>
              <span className="flex gap-2">
                <Button size="sm" onClick={() => act.mutate({ item })} disabled={act.isPending}>
                  {item.kind === 'removed' ? 'Remove it here too' : 'Accept'}
                </Button>
                {item.kind === 'added' && (
                  <Button size="sm" variant="ghost" onClick={() => act.mutate({ item, ignore: true })} disabled={act.isPending}>
                    Leave out
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
