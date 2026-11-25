import { Fragment, useState } from 'react'
import { Info, Loader2, Lock, Search } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { Tooltip } from '@/components/ui/Tooltip'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import * as adminService from '@/services/admin'
import type { ModuleKey, PermissionLevel, Role } from '@/types'
import type { PermissionMatrix } from './types'
import {
  allowedLevels,
  cellLock,
  describeChange,
  diffMatrix,
  LEVEL_LABELS,
  levelAt,
  LOCK_REASONS,
  matchesSearch,
  needsReason,
  PERMISSION_CATALOG,
  ROLES,
  SECTIONS,
  type Matrix,
  type PermissionKeyInfo,
} from './permission-catalog'

/*
  ADM-02 Role Permissions (Users-Roles-Addendum §4). One row per permission key, one column per
  role. Edits stay a draft until reviewed: changed cells are marked, a sticky bar counts them,
  and the review lists every change (a reason is required for approval-level or finance keys).
  The server checks permissions on every request, so a reduction applies on the user's next
  request.
*/
export function PermissionMatrixTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const narrow = useMediaQuery('(max-width: 1023px)')
  const [activeRole, setActiveRole] = useState<Role>('Manager')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Matrix | null>(null)
  const [seededFrom, setSeededFrom] = useState<PermissionMatrix | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [reason, setReason] = useState('')

  const permQuery = useQuery({
    queryKey: ['admin', 'permissions'],
    queryFn: adminService.getPermissionMatrix,
    // a refetch must never wipe an unsaved draft
    refetchOnWindowFocus: false,
  })
  const saved = permQuery.data ?? null

  // "adjust state during render": seed the draft whenever a new server matrix arrives
  if (saved && saved !== seededFrom) {
    setSeededFrom(saved)
    setDraft(structuredClone(saved))
  }

  const changes = saved && draft ? diffMatrix(saved, draft) : []
  const reasonRequired = needsReason(changes)

  const save = useMutation({
    mutationFn: () =>
      adminService.updatePermissions(
        changes.map((c) => ({ role: c.role, module: c.key, level: c.to })),
        reason.trim() || undefined,
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'permissions'], updated)
      toast(
        `${changes.length} permission ${changes.length === 1 ? 'change' : 'changes'} saved. Reduced access applies on each user’s next request.`,
      )
      setReviewing(false)
      setReason('')
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not save permissions', 'danger'),
  })

  if (permQuery.isError) {
    return <ErrorState title="Couldn't load permissions" onRetry={() => void permQuery.refetch()} />
  }
  if (!saved || !draft) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  const roles = narrow ? [activeRole] : ROLES
  const rows = PERMISSION_CATALOG.filter((i) => matchesSearch(i, search))
  const setCell = (role: Role, key: ModuleKey, level: PermissionLevel) =>
    setDraft((prev) => (prev ? { ...prev, [role]: { ...prev[role], [key]: level } } : prev))

  return (
    <div className="pb-4">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-sm">
          <Input
            aria-label="Search permissions"
            placeholder="Search permissions…"
            leadingIcon={<Search className="size-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Legend />
      </div>

      {narrow && (
        <Tabs
          tabs={ROLES.map((r) => ({ id: r, label: r }))}
          active={activeRole}
          onChange={(id) => setActiveRole(id as Role)}
          className="mb-3"
        />
      )}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
        <div className="max-h-[calc(100vh-17rem)] min-h-[320px] overflow-auto" data-testid="permission-matrix">
          <table className="w-full border-separate border-spacing-0">
            <caption className="sr-only">Permission levels by role. Each level includes the one before it.</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-30 min-w-[260px] border-b border-border bg-surface-sunken px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-text-muted"
                >
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role}
                    scope="col"
                    className="sticky top-0 z-20 w-[180px] min-w-[150px] border-b border-border bg-surface-sunken px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-text-muted"
                  >
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((section) => {
                const inSection = rows.filter((r) => r.section === section)
                if (inSection.length === 0) return null
                return (
                  <Fragment key={section}>
                    <tr>
                      <th
                        scope="colgroup"
                        colSpan={roles.length + 1}
                        className="sticky left-0 border-b border-border bg-background px-4 pb-2 pt-4 text-left text-sm font-semibold text-text-heading"
                      >
                        {section}
                      </th>
                    </tr>
                    {inSection.map((info) => (
                      <PermissionRow
                        key={info.key}
                        info={info}
                        roles={roles}
                        saved={saved}
                        draft={draft}
                        onChange={setCell}
                      />
                    ))}
                  </Fragment>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={roles.length + 1} className="px-4 py-10 text-center text-sm text-text-muted">
                    No permission matches “{search}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {changes.length > 0 && (
        <div
          role="region"
          aria-label="Unsaved permission changes"
          className="sticky bottom-4 z-30 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-3)]"
        >
          <p className="text-sm font-medium text-text" aria-live="polite">
            <span className="tabular">{changes.length}</span> {changes.length === 1 ? 'change' : 'changes'} not saved
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDraft(structuredClone(saved))}>
              Discard
            </Button>
            <Button onClick={() => setReviewing(true)}>Review changes</Button>
          </div>
        </div>
      )}

      <Modal
        open={reviewing}
        onClose={() => setReviewing(false)}
        title="Review permission changes"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewing(false)}>
              Back to editing
            </Button>
            <Button
              onClick={() => save.mutate()}
              loading={save.isPending}
              disabled={reasonRequired && !reason.trim()}
            >
              Save {changes.length} {changes.length === 1 ? 'change' : 'changes'}
            </Button>
          </>
        }
      >
        <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-md)] border border-border" data-testid="review-list">
          {changes.map((c) => (
            <li key={`${c.role}:${c.key}`} className="px-3 py-2 text-sm text-text">
              {describeChange(c)}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="perm-reason" className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Reason {reasonRequired ? '(required)' : '(optional)'}
          </label>
          <textarea
            id="perm-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            aria-required={reasonRequired}
            placeholder="Why is access changing?"
            className="w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          />
          {reasonRequired && (
            <p className="text-xs text-text-muted">
              Needed because a change touches an approval level or a finance permission.
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Reduced access applies on each affected user’s next request. New access shows when they next open or
          reload the portal. The change is recorded in the audit log with the reason.
        </p>
      </Modal>
    </div>
  )
}

function PermissionRow({
  info,
  roles,
  saved,
  draft,
  onChange,
}: {
  info: PermissionKeyInfo
  roles: Role[]
  saved: Matrix
  draft: Matrix
  onChange: (role: Role, key: ModuleKey, level: PermissionLevel) => void
}) {
  return (
    <tr>
      <th scope="row" className="sticky left-0 z-10 border-b border-border bg-surface px-4 py-3 text-left align-top font-normal">
        <div className="flex items-start gap-1.5">
          <span className="text-sm font-medium text-text">{info.label}</span>
          <Tooltip content={info.description}>
            {(p) => (
              <button
                type="button"
                {...p}
                aria-label={`About: ${info.label}`}
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-text-muted hover:text-text"
              >
                <Info className="size-3.5" aria-hidden />
              </button>
            )}
          </Tooltip>
        </div>
        <p className="mt-0.5 max-w-[340px] text-xs leading-5 text-text-muted">{info.description}</p>
      </th>
      {roles.map((role) => {
        const from = levelAt(saved, role, info.key)
        const to = levelAt(draft, role, info.key)
        const changed = from !== to
        return (
          <td
            key={role}
            className={cn('border-b border-border px-3 py-2 align-top', changed && 'bg-brand-soft')}
            data-changed={changed || undefined}
          >
            <Cell role={role} info={info} level={to} onChange={(l) => onChange(role, info.key, l)} />
            {changed && (
              <p className="mt-1 text-xs text-text-muted">
                <span className="sr-only">Changed, </span>was {LEVEL_LABELS[from]}
              </p>
            )}
          </td>
        )
      })}
    </tr>
  )
}

function Cell({
  role,
  info,
  level,
  onChange,
}: {
  role: Role
  info: PermissionKeyInfo
  level: PermissionLevel
  onChange: (level: PermissionLevel) => void
}) {
  const lock = cellLock(role, info.key)
  const name = `${role} — ${info.label}`

  if (lock === 'pinned') {
    return (
      <Tooltip content={LOCK_REASONS.pinned}>
        {(p) => (
          <span
            {...p}
            tabIndex={0}
            role="img"
            aria-label={`${name}: ${LEVEL_LABELS[level]}, locked`}
            data-cell={`${role}:${info.key}`}
            data-locked="pinned"
            className="inline-flex h-10 min-w-[120px] items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-sunken px-3 text-sm text-text-muted"
          >
            <Lock className="size-3.5 shrink-0" aria-hidden />
            {LEVEL_LABELS[level]}
          </span>
        )}
      </Tooltip>
    )
  }

  const allowed = allowedLevels(role, info.key)
  // a stored value outside the cap (set before the cap existed) is shown, but can't be picked again
  const options = [
    ...(allowed.includes(level) ? [] : [{ value: level, label: `${LEVEL_LABELS[level]} (not allowed)` }]),
    ...allowed.map((l) => ({ value: l, label: LEVEL_LABELS[l] })),
  ]

  return (
    <div className="flex items-center gap-1.5">
      <div className="min-w-[120px] flex-1">
        <Select
          aria-label={name}
          data-cell={`${role}:${info.key}`}
          value={level}
          options={options}
          onChange={(e) => onChange(e.target.value as PermissionLevel)}
          className="min-w-[120px]"
        />
      </div>
      {lock === 'capped' && (
        <Tooltip content={LOCK_REASONS.capped}>
          {(p) => (
            <button
              type="button"
              {...p}
              aria-label={`${name}: only None or View`}
              data-locked="capped"
              className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-text-muted hover:text-text"
            >
              <Lock className="size-3.5" aria-hidden />
            </button>
          )}
        </Tooltip>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted" aria-label="Permission levels">
      <span>
        <span className="font-medium text-text">None</span> · no access
      </span>
      <span>
        <span className="font-medium text-text">View</span> &lt; <span className="font-medium text-text">Edit</span>{' '}
        &lt; <span className="font-medium text-text">Approve</span> · each level includes the one before it
      </span>
      <span className="inline-flex items-center gap-1">
        <Lock className="size-3" aria-hidden /> locked or capped
      </span>
    </div>
  )
}
