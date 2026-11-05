import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Loader2, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Toggle } from '@/components/ui/Toggle'
import { useToast } from '@/components/ui/Toast'
import { ErrorState } from '@/components/data/ErrorState'
import * as reportsService from '@/services/reports'
import type { ExpenseCategory } from '@/features/reports/types'

/*
  Daily expense categories (Finance-Reports-Addendum §6) — the list Officers pick from when they
  log a daily expense. Data, not code: add, rename, reorder or take a category out of use. A
  category out of use can't be picked for a new entry but stays on the entries that used it, so
  nothing is ever deleted. Every change is audited.
*/
export function ExpenseCategoriesCard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const key = ['reports', 'expense-categories']
  const { data, isPending, isError, refetch } = useQuery({ queryKey: key, queryFn: reportsService.listExpenseCategories })
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)

  const onDone = (rows: ExpenseCategory[], message: string) => {
    queryClient.setQueryData(key, rows)
    toast(message)
  }
  const onError = (err: unknown) => toast(err instanceof Error ? err.message : 'Could not save the category', 'danger')

  const add = useMutation({
    mutationFn: () => reportsService.createExpenseCategory(name.trim()),
    onSuccess: (rows) => {
      onDone(rows, `Added “${name.trim()}”`)
      setName('')
    },
    onError,
  })
  const update = useMutation({
    mutationFn: (v: { id: number; patch: Parameters<typeof reportsService.updateExpenseCategory>[1]; message: string }) =>
      reportsService.updateExpenseCategory(v.id, v.patch),
    onSuccess: (rows, v) => {
      onDone(rows, v.message)
      setEditing(null)
    },
    onError,
  })

  const active = (data ?? []).filter((c) => c.active)
  const retired = (data ?? []).filter((c) => !c.active)
  // swap two neighbours' order, one save after the other (both audited)
  const reorder = useMutation({
    mutationFn: async ({ a, b }: { a: ExpenseCategory; b: ExpenseCategory }) => {
      const aOrder = a.sortOrder === b.sortOrder ? b.sortOrder + 1 : b.sortOrder
      await reportsService.updateExpenseCategory(a.id, { sortOrder: aOrder })
      return reportsService.updateExpenseCategory(b.id, { sortOrder: a.sortOrder })
    },
    onSuccess: (rows, { a }) => onDone(rows, `Moved “${a.name}”`),
    onError,
  })
  const move = (i: number, by: -1 | 1) => {
    const a = active[i]
    const b = active[i + by]
    if (a && b) reorder.mutate({ a, b })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily expense categories</CardTitle>
      </CardHeader>
      <p className="-mt-2 mb-4 text-sm text-text-muted">
        What Officers pick from when they log a daily expense. Leaf purchases, wages and fertilizer stock come from
        their own records and aren’t categories here.
      </p>

      {isPending ? (
        <Loader2 className="size-5 animate-spin text-text-muted" aria-hidden />
      ) : isError ? (
        <ErrorState title="Couldn't load the categories" onRetry={() => void refetch()} />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-md)] border border-border">
            {[...active, ...retired].map((c) => {
              const i = active.indexOf(c)
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                  {editing?.id === c.id ? (
                    <form
                      className="flex flex-1 items-end gap-2"
                      onSubmit={(e) => {
                        e.preventDefault()
                        update.mutate({ id: c.id, patch: { name: editing.name.trim() }, message: `Renamed to “${editing.name.trim()}”` })
                      }}
                    >
                      <div className="flex-1">
                        <Input aria-label={`New name for ${c.name}`} value={editing.name} onChange={(e) => setEditing({ id: c.id, name: e.target.value })} />
                      </div>
                      <Button size="sm" type="submit" loading={update.isPending} disabled={editing.name.trim().length < 2}>
                        Save
                      </Button>
                      <Button size="sm" variant="secondary" type="button" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </form>
                  ) : (
                    <>
                      <span className="flex items-center gap-2 text-sm text-text">
                        {c.name}
                        {!c.active && <StatusBadge tone="neutral">Out of use</StatusBadge>}
                      </span>
                      <span className="flex items-center gap-1">
                        {c.active && (
                          <>
                            <Button size="sm" variant="ghost" aria-label={`Move ${c.name} up`} disabled={i === 0 || reorder.isPending} onClick={() => move(i, -1)}>
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Move ${c.name} down`}
                              disabled={i === active.length - 1 || reorder.isPending}
                              onClick={() => move(i, 1)}
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setEditing({ id: c.id, name: c.name })}>
                          Rename
                        </Button>
                        <Toggle
                          checked={c.active}
                          label={c.active ? 'In use' : 'Out of use'}
                          onChange={(on) =>
                            update.mutate({
                              id: c.id,
                              patch: { active: on },
                              message: on ? `“${c.name}” is in use again` : `“${c.name}” is out of use (kept on old entries)`,
                            })
                          }
                        />
                      </span>
                    </>
                  )}
                </li>
              )
            })}
          </ul>

          <form
            className="mt-4 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              add.mutate()
            }}
          >
            <div className="flex-1">
              <Input label="New category" placeholder="e.g. Security services" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" variant="secondary" loading={add.isPending} disabled={name.trim().length < 2}>
              <Plus className="size-4" /> Add
            </Button>
          </form>
        </>
      )}
    </Card>
  )
}
