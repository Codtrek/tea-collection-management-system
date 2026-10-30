import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertTriangle, Info, RouteIcon, UserCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import * as collectionsService from '@/services/collections'
import * as dispatchService from '@/services/dispatch'
import * as estatesService from '@/services/estates'
import { EstatePicker } from './EstatePicker'

/*
  COL-02 — exception/provisional entry, NOT a weight-override. Preserves §7.1
  (only the assigned agent records actual weight): saving creates a "Pending
  Agent Confirmation" record and notifies the agent's mobile app to confirm.

  Estate-first: the user picks only the estate. Its route and today's agent are DERIVED
  (the route from the estate; the agent from the route resolver, so an active cover is
  honoured and flagged) and shown read-only — nothing here is chosen by hand.
*/
const exceptionSchema = z.object({
  estateId: z.string().min(1, 'Pick an estate'),
  reportedWeight: z
    .number({ message: 'Reported weight is required' })
    .positive('Weight must be a positive number'),
  date: z.string().min(1, 'Date is required'),
  reason: z.string().min(1, 'Explain why this is logged outside the normal flow'),
})

type ExceptionForm = z.infer<typeof exceptionSchema>

/** 'EST-0002' → 2 (the numeric estates.id the API takes). */
const toEstateDbId = (formatted: string) => Number(formatted.replace(/^EST-/, ''))

export function CollectionExceptionEntryPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ExceptionForm>({
    resolver: zodResolver(exceptionSchema),
    mode: 'onBlur',
    defaultValues: { estateId: '', date: new Date().toISOString().slice(0, 10) },
  })
  const values = useWatch({ control })

  const directory = useQuery({ queryKey: ['estates', 'directory'], queryFn: estatesService.getDirectory })
  const activeEstates = (directory.data ?? []).filter((e) => e.status === 'Active')

  const estateId = values.estateId ?? ''
  const date = values.date ?? ''
  const routeAgent = useQuery({
    queryKey: ['dispatch', 'estate-route-agent', estateId, date],
    queryFn: () => dispatchService.getEstateRouteAgent(estateId, date || undefined),
    enabled: !!estateId,
  })

  const createMutation = useMutation({
    mutationFn: (data: ExceptionForm) =>
      collectionsService.createException({
        estateId: toEstateDbId(data.estateId),
        reportedWeight: data.reportedWeight,
        date: data.date,
        reason: data.reason,
      }),
    onSuccess: () => {
      toast('Logged — awaiting agent confirmation')
      void queryClient.invalidateQueries({ queryKey: ['collections'] })
      navigate('/collections')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not log this entry', 'danger'),
  })

  const onSubmit = (data: ExceptionForm) => {
    createMutation.mutate(data)
  }

  const info = routeAgent.data

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
            <strong className="text-text">provisional record</strong> — the Collection Agent for the estate’s route must still
            confirm the actual weight on mobile before it becomes official.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Controller
            control={control}
            name="estateId"
            render={({ field }) => (
              <EstatePicker
                estates={activeEstates}
                value={field.value}
                onChange={field.onChange}
                error={errors.estateId?.message}
              />
            )}
          />

          {estateId && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-sunken p-3.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-primary">
                  <RouteIcon className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-text-muted">Route (from the estate)</p>
                  <p className="text-sm font-medium text-text">
                    {routeAgent.isPending ? '…' : (info?.routeName ?? 'No route assigned')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-sunken p-3.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-primary">
                  <UserCheck className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">Today’s agent</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-text">
                    {routeAgent.isPending
                      ? '…'
                      : info?.selfDelivery
                        ? 'Self-delivered — no agent'
                        : (info?.agent?.name ?? 'No agent assigned')}
                    {info?.agent?.covering && <StatusBadge tone="warning">covering</StatusBadge>}
                  </p>
                </div>
              </div>
              {info && !info.selfDelivery && !info.agent && (
                <p className="flex items-start gap-2 text-sm text-warning-fg sm:col-span-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Nobody is assigned to this route on this date. The entry is still logged, but no agent will be asked to
                  confirm it until the route has one.
                </p>
              )}
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
            <Button type="button" variant="secondary" onClick={() => navigate('/collections')} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Save as Pending
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
