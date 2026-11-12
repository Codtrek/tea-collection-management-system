import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, FileText, Loader2, Paperclip, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/data/EmptyState'
import { ErrorState } from '@/components/data/ErrorState'
import { useAuth } from '@/context/AuthContext'
import { factoryToday } from '@/features/dispatch/status'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatCurrency, formatDate } from '@/lib/format'
import * as reportsService from '@/services/reports'
import type { ExpenseCategory, ExpenseEntry, PaidVia } from './types'

/*
  RPT-04 — log, view and correct a daily operating expense (Finance-Reports-Addendum §6–7).
  /reports/expenses/new logs one; /reports/expenses/:id opens it — editable by its creator for the
  edit window, then only by the Factory Manager with a reason (the server decides and says why).
  Leaf purchases, wages and fertilizer stock are never entered here: the Expense report derives them.
*/

const MAX_RECEIPT = 2 * 1024 * 1024
const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,application/pdf'

const schema = (today: string, needsReason: boolean) =>
  z
    .object({
      date: z.string().min(1, 'Date is required').refine((v) => v <= today, 'An expense can’t be dated in the future'),
      categoryId: z.string().min(1, 'Category is required'),
      amount: z.number({ message: 'Amount is required' }).positive('Amount must be more than Rs. 0'),
      paidVia: z.enum(['cash', 'bank'], { message: 'Choose how it was paid' }),
      description: z.string().trim().min(1, 'Description is required').max(200, 'At most 200 characters'),
      reason: z.string().optional(),
    })
    .superRefine((v, ctx) => {
      if (needsReason && !v.reason?.trim())
        ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Give a reason for the change' })
    })

type Form = z.infer<ReturnType<typeof schema>>

export function ExpenseEntryPage() {
  const { id } = useParams()
  const { can } = useAuth()
  const entryQuery = useQuery({
    queryKey: ['reports', 'expense', id],
    queryFn: () => reportsService.getExpense(id!),
    enabled: !!id,
  })
  const categoriesQuery = useQuery({
    queryKey: ['reports', 'expense-categories'],
    queryFn: reportsService.listExpenseCategories,
  })

  if (!id && !can('expenses', 'edit')) {
    return (
      <div>
        <PageHeader
          title="Log Daily Expense"
          breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Reports' }, { label: 'Expenses', to: '/reports/expenses' }]}
        />
        <EmptyState
          title="Your role can’t log daily expenses"
          description="Officers log daily expenses; the Factory Manager corrects them."
        />
      </div>
    )
  }
  if ((id && entryQuery.isPending) || categoriesQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }
  if ((id && entryQuery.isError) || categoriesQuery.isError || !categoriesQuery.data) {
    return (
      <ErrorState
        title={id ? `Couldn't load expense ${id}` : "Couldn't load the expense categories"}
        description={entryQuery.error instanceof ApiError ? entryQuery.error.message : undefined}
        onRetry={() => void (id ? entryQuery.refetch() : categoriesQuery.refetch())}
      />
    )
  }
  return <EntryForm key={id ?? 'new'} entry={entryQuery.data} categories={categoriesQuery.data} />
}

function EntryForm({ entry, categories }: { entry?: ExpenseEntry; categories: ExpenseCategory[] }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const today = factoryToday()
  const editable = !entry || entry.access.canEdit
  const needsReason = !!entry?.access.needsReason
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<Form>({
    resolver: zodResolver(schema(today, needsReason)),
    mode: 'onBlur',
    defaultValues: entry
      ? {
          date: entry.date,
          categoryId: String(entry.categoryId),
          amount: entry.amount,
          paidVia: entry.paidVia ?? undefined,
          description: entry.description,
          reason: '',
        }
      : { date: today, reason: '' },
  })
  const paidVia = useWatch({ control, name: 'paidVia' })

  // active categories, plus the entry's own if it has since been retired
  const options = categories
    .filter((c) => c.active || c.id === entry?.categoryId)
    .map((c) => ({ value: String(c.id), label: c.active ? c.name : `${c.name} (no longer in use)` }))

  const done = (saved: ExpenseEntry, verb: string) => {
    toast(`Expense ${saved.id} ${verb}`)
    void queryClient.invalidateQueries({ queryKey: ['reports'] })
    navigate(`/reports/expenses?month=${saved.date.slice(0, 7)}&group=entry`)
  }

  const save = useMutation({
    mutationFn: async (data: Form) => {
      const input = {
        date: data.date,
        categoryId: Number(data.categoryId),
        amount: data.amount,
        paidVia: data.paidVia as PaidVia,
        description: data.description.trim(),
      }
      const reason = data.reason?.trim() || undefined
      let saved = entry
        ? isDirty
          ? await reportsService.updateExpense(entry.id, { ...input, reason })
          : entry
        : await reportsService.createExpense(input)
      if (file) saved = await reportsService.uploadExpenseReceipt(saved.id, file, reason)
      return saved
    },
    onSuccess: (saved) => done(saved, entry ? 'saved' : 'logged'),
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not save this expense', 'danger'),
  })

  const openReceipt = async () => {
    try {
      const blob = await reportsService.getExpenseReceipt(entry!.id)
      window.open(URL.createObjectURL(blob), '_blank', 'noopener')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not open the receipt', 'danger')
    }
  }

  const pickFile = (f: File | undefined) => {
    setFileError(null)
    if (!f) return setFile(null)
    if (f.size > MAX_RECEIPT) return setFileError('A receipt can be at most 2 MB.')
    if (!RECEIPT_ACCEPT.split(',').includes(f.type)) return setFileError('Use a photo (JPG, PNG, WebP, HEIC) or a PDF.')
    setFile(f)
  }

  const title = entry ? `Expense ${entry.id}` : 'Log Daily Expense'
  return (
    <div>
      <PageHeader
        title={title}
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Reports' },
          { label: 'Expenses', to: '/reports/expenses' },
          { label: entry ? entry.id : 'New Entry' },
        ]}
        description="Daily operating costs: firewood, electricity, fuel, repairs, packaging. Leaf purchases, wages and fertilizer stock come from their own records and are never entered here."
      />

      <Card className="max-w-xl">
        {entry && (
          <div className="mb-5 flex flex-col gap-1 border-b border-border pb-4 text-sm text-text-muted">
            <p>
              Logged by <span className="text-text">{entry.enteredBy}</span> on {formatDate(entry.loggedOn)}
              {entry.updatedBy && entry.updatedAt && (
                <>
                  {' '}
                  · last changed by <span className="text-text">{entry.updatedBy}</span> on {formatDate(entry.updatedAt.slice(0, 10))}
                </>
              )}
            </p>
            {entry.editReason && <p>Reason given: “{entry.editReason}”</p>}
            {entry.access.note && (
              <p className={cn('rounded-[var(--radius-md)] px-3 py-2 text-xs', editable ? 'bg-warning-bg text-warning-fg' : 'bg-surface-sunken')}>
                {entry.access.note}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit((d) => save.mutate(d))} className="flex flex-col gap-5">
          <fieldset disabled={!editable || save.isPending} className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Date" type="date" max={today} error={errors.date?.message} {...register('date')} />
              <Select
                label="Category"
                placeholder="Select category"
                error={errors.categoryId?.message}
                options={options}
                {...register('categoryId')}
              />
            </div>
            <Input
              label="Amount (Rs.)"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              error={errors.amount?.message}
              {...register('amount', { valueAsNumber: true })}
            />

            <div className="flex flex-col gap-1.5">
              <span id="paid-via" className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Paid via
              </span>
              <div role="radiogroup" aria-labelledby="paid-via" className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: 'cash', label: 'Cash', icon: <Wallet className="size-4" aria-hidden /> },
                    { value: 'bank', label: 'Bank', icon: <Banknote className="size-4" aria-hidden /> },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={paidVia === o.value}
                    onClick={() => setValue('paidVia', o.value, { shouldDirty: true, shouldValidate: true })}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60',
                      paidVia === o.value ? 'border-primary bg-brand-soft text-primary' : 'border-border text-text-muted hover:bg-surface-hover',
                    )}
                  >
                    {o.icon}
                    {o.label}
                  </button>
                ))}
              </div>
              {errors.paidVia && <p className="text-xs text-danger-fg">{errors.paidVia.message}</p>}
            </div>

            <Input
              label="Description"
              placeholder="e.g. CEB electricity — factory floor"
              error={errors.description?.message}
              {...register('description')}
            />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Receipt (optional)</span>
              {entry?.receipt && (
                <button
                  type="button"
                  onClick={() => void openReceipt()}
                  className="flex items-center gap-2 self-start text-sm font-medium text-primary hover:underline"
                >
                  <FileText className="size-4" aria-hidden />
                  {entry.receipt.fileName} ({Math.ceil(entry.receipt.sizeBytes / 1024)} KB)
                </button>
              )}
              {editable && (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-border bg-surface-sunken px-4 py-5 text-center hover:bg-surface-hover">
                  <Paperclip className="size-5 text-text-muted" strokeWidth={1.5} aria-hidden />
                  <span className="text-sm font-medium text-text">
                    {file ? file.name : entry?.receipt ? 'Replace the receipt' : 'Attach a photo or PDF'}
                  </span>
                  <span className="text-xs text-text-muted">At most 2 MB</span>
                  <input
                    type="file"
                    accept={RECEIPT_ACCEPT}
                    className="sr-only"
                    aria-label="Receipt file"
                    onChange={(e) => pickFile(e.target.files?.[0])}
                  />
                </label>
              )}
              {fileError && <p className="text-xs text-danger-fg">{fileError}</p>}
            </div>

            {needsReason && (
              <Input
                label="Reason for the change"
                placeholder="e.g. CEB re-issued the bill"
                error={errors.reason?.message}
                {...register('reason')}
              />
            )}
          </fieldset>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            {entry ? (
              <span className="tabular text-sm text-text-muted">
                {entry.category} · {formatCurrency(entry.amount)}
              </span>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)} disabled={save.isPending}>
                {editable ? 'Cancel' : 'Back'}
              </Button>
              {editable && (
                <Button type="submit" loading={save.isPending} disabled={!!entry && !isDirty && !file}>
                  {entry ? 'Save Changes' : 'Save Expense'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>
      {entry && (
        <p className="mt-3 text-xs text-text-muted">
          Every change is recorded in the audit log, with who made it and when.
        </p>
      )}
    </div>
  )
}
