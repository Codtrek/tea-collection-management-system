import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info, RouteIcon, UserCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { ESTATES } from '@/features/estates/data'

/*
  COL-02 — exception/provisional entry, NOT a weight-override. Preserves §7.1
  (only the assigned agent records actual weight): saving creates a "Pending
  Agent Confirmation" record and notifies the agent's mobile app to confirm.
*/
const exceptionSchema = z.object({
  estateId: z.string().min(1, 'Estate owner is required'),
  reportedWeight: z
    .number({ message: 'Reported weight is required' })
    .positive('Weight must be a positive number'),
  date: z.string().min(1, 'Date is required'),
  reason: z.string().min(1, 'Explain why this is logged outside the normal flow'),
})

type ExceptionForm = z.infer<typeof exceptionSchema>

/** Mock route → assigned agent map (route assignment is system-owned). */
const ROUTE_AGENTS: Record<string, string> = {
  'Route 2': 'K. Weerasinghe',
  'Route 3': 'R. Senanayake',
  'Route 5': 'W. Gunaratne',
}

export function CollectionExceptionEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ExceptionForm>({
    resolver: zodResolver(exceptionSchema),
    mode: 'onBlur',
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  })
  const values = useWatch({ control })
  const estate = ESTATES.find((e) => e.id === values.estateId)
  const agent = estate ? ROUTE_AGENTS[estate.route] : undefined

  const onSubmit = (data: ExceptionForm) => {
    setSaving(true)
    setTimeout(() => {
      toast('Logged — awaiting agent confirmation')
      void data
      navigate('/collections')
    }, 600)
  }

  return (
    <div>
      <PageHeader
        title="Log Exception Entry"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Tea Leaf Collection', to: '/collections' },
          { label: 'Exception Entry' },
        ]}
      />

      <Card className="max-w-2xl">
        <div className="mb-5 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border bg-surface-sunken p-4">
          <Info className="mt-0.5 size-4 shrink-0 text-text-muted" />
          <p className="text-sm text-text-muted">
            For collections that happened outside the normal mobile flow (e.g. a phone-arranged pickup). This is a{' '}
            <strong className="text-text">provisional record</strong> — the assigned Collection Agent must still confirm
            the actual weight on mobile before it becomes official.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Select
            label="Estate owner"
            placeholder="Select estate"
            error={errors.estateId?.message}
            options={ESTATES.filter((e) => e.status === 'Active').map((e) => ({
              value: e.id,
              label: `${e.estateName} — ${e.ownerName}`,
            }))}
            {...register('estateId')}
          />

          {estate && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-sunken p-3.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-primary">
                  <RouteIcon className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-text-muted">Route (auto-filled)</p>
                  <p className="text-sm font-medium text-text">{estate.route}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-sunken p-3.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-primary">
                  <UserCheck className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-text-muted">Assigned agent (auto-filled)</p>
                  <p className="text-sm font-medium text-text">{agent ?? '—'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Reported weight (kg) — pending agent confirmation"
              hint="Not the actual weight; the agent confirms that on mobile."
              type="number"
              min="0"
              step="any"
              error={errors.reportedWeight?.message}
              {...register('reportedWeight', { valueAsNumber: true })}
            />
            <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />
          </div>

          <Input
            label="Reason"
            placeholder="Why is this being logged outside the normal flow?"
            error={errors.reason?.message}
            {...register('reason')}
          />

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate('/collections')} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save as Pending
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
