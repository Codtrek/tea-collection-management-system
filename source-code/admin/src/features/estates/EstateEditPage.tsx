import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RouteIcon } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Toggle } from '@/components/ui/Toggle'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import * as estatesService from '@/services/estates'
import type { EstateOwner } from './types'
import { estateOwnerSchema, type EstateOwnerForm, BANKS, BRANCHES } from './schema'

/* EST-04 — same fields/validation as EST-02, single pre-filled form.
   Route stays read-only; saving appends an audit trail entry (§12). */
export function EstateEditPage() {
  const { id } = useParams()

  const {
    data: estate,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['estate', id],
    queryFn: () => estatesService.getById(id!),
    enabled: !!id,
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError || !estate) {
    return <ErrorState title="Estate not found" description={`No estate owner with ID “${id}”.`} onRetry={() => void refetch()} />
  }

  return (
    <div>
      <PageHeader
        title={`Edit — ${estate.estateName}`}
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Estate Owners', to: '/estates' },
          { label: estate.id, to: `/estates/${estate.id}` },
          { label: 'Edit' },
        ]}
      />
      <EditForm estate={estate} />
    </div>
  )
}

/* Split out so its form state can lazily init straight from `estate` — the
   parent only mounts this once `estate` is guaranteed loaded, so there's no
   "sync state from a prop" effect needed at all. */
function EditForm({ estate }: { estate: EstateOwner }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<EstateOwnerForm>({
    resolver: zodResolver(estateOwnerSchema),
    mode: 'onBlur',
    defaultValues: {
      ownerName: estate.ownerName,
      nic: estate.nic,
      contact: estate.contact,
      email: estate.email ?? '',
      estateName: estate.estateName,
      address: estate.address,
      location: estate.location,
      selfDelivery: estate.selfDelivery,
      bank: estate.bank.bank,
      branch: estate.bank.branch,
      account: estate.bank.account,
    },
  })
  const values = useWatch({ control })

  const updateMutation = useMutation({
    mutationFn: (data: EstateOwnerForm) => estatesService.update(estate.id, { ...data, email: data.email || undefined }),
    onSuccess: () => {
      toast('Estate owner updated — audit entry recorded')
      void queryClient.invalidateQueries({ queryKey: ['estate', estate.id] })
      void queryClient.invalidateQueries({ queryKey: ['estates'] })
      navigate(`/estates/${estate.id}`)
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not update this estate owner', 'danger'),
  })

  const onSubmit = (data: EstateOwnerForm) => {
    updateMutation.mutate(data)
  }

  return (
    <Card className="max-w-3xl">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <h3 className="text-sm font-semibold text-text-heading sm:col-span-2">Owner details</h3>
            <Input label="Owner full name" error={errors.ownerName?.message} {...register('ownerName')} />
            <Input label="NIC number" error={errors.nic?.message} {...register('nic')} />
            <Input label="Contact number" error={errors.contact?.message} {...register('contact')} />
            <Input label="Email (optional)" type="email" error={errors.email?.message} {...register('email')} />
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <h3 className="text-sm font-semibold text-text-heading sm:col-span-2">Estate location & route</h3>
            <Input label="Estate name" error={errors.estateName?.message} {...register('estateName')} />
            <Input label="Location (town)" error={errors.location?.message} {...register('location')} />
            <div className="sm:col-span-2">
              <Input label="Estate address / GPS" error={errors.address?.message} {...register('address')} />
            </div>
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-sunken p-4 sm:col-span-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-primary">
                <RouteIcon className="size-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-text">Collection route: {estate.route}</p>
                <p className="text-xs text-text-muted">System-assigned — read-only, even on edit.</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-border p-4 sm:col-span-2">
              <div>
                <p className="text-sm font-medium text-text">Self-delivery / transport exemption</p>
                <p className="text-xs text-text-muted">Exempts this estate from the transport cost deduction.</p>
              </div>
              <Toggle
                checked={values.selfDelivery ?? false}
                onChange={(v) => setValue('selfDelivery', v)}
                label={values.selfDelivery ? 'Exempt' : 'Not exempt'}
              />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <h3 className="text-sm font-semibold text-text-heading sm:col-span-2">Bank details</h3>
            <Select label="Bank" placeholder="Select bank" error={errors.bank?.message} options={BANKS.map((b) => ({ value: b, label: b }))} {...register('bank')} />
            <Select label="Branch" placeholder="Select branch" error={errors.branch?.message} options={BRANCHES.map((b) => ({ value: b, label: b }))} {...register('branch')} />
            <Input label="Account number" error={errors.account?.message} {...register('account')} />
          </section>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate(`/estates/${estate.id}`)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
  )
}
