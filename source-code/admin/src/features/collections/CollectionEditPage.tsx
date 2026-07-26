import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Lock } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import * as collectionsService from '@/services/collections'
import { isLocked } from './status'
import type { CollectionRecord, TeaGrade } from './types'
import { formatDate } from '@/lib/format'

/* COL-04 — editable only before Confirmed. Stale links to locked records get
   a banner pointing at Flag for Correction (audit pattern §12), not the form. */
export function CollectionEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const {
    data: record,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => collectionsService.getById(id!),
    enabled: !!id,
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
      </div>
    )
  }

  if (isError || !record) {
    return <ErrorState title="Record not found" description={`No collection record “${id}”.`} onRetry={() => void refetch()} />
  }

  const breadcrumb = [
    { label: 'Home', to: '/dashboard' },
    { label: 'Tea Leaf Collection', to: '/collections' },
    { label: record.id, to: `/collections/${record.id}` },
    { label: 'Edit' },
  ]

  if (isLocked(record)) {
    const confirmedOn = record.timeline.find((t) => t.status === 'Confirmed')?.timestamp
    return (
      <div>
        <PageHeader title={`Edit — ${record.id}`} breadcrumb={breadcrumb} />
        <Card className="max-w-2xl">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning-bg text-warning-fg">
              <Lock className="size-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-text-heading">This record is locked</h2>
              <p className="mt-1 text-sm text-text-muted">
                Confirmed on {confirmedOn ? formatDate(confirmedOn) : formatDate(record.date)}. Confirmed records cannot
                be edited or deleted (§7.1). Use <strong className="text-text">“Flag for Correction”</strong> from the
                detail page to request a change — corrections are audit-tracked, never silent edits.
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => navigate(`/collections/${record.id}`)}>
                  Back to Record
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={`Edit — ${record.id}`} breadcrumb={breadcrumb} />
      <EditForm record={record} />
    </div>
  )
}

/* Split out so its form state can lazily init straight from `record` — the
   parent only mounts this once `record` is guaranteed loaded, so there's no
   "sync state from a prop" effect needed at all. */
function EditForm({ record }: { record: CollectionRecord }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [weight, setWeight] = useState(String(record.weightKg))
  const [date, setDate] = useState(record.date)
  const [grade, setGrade] = useState<TeaGrade>(record.grade)

  const updateMutation = useMutation({
    mutationFn: () => collectionsService.update(record.id, { weightKg: Number(weight), date, grade }),
    onSuccess: () => {
      toast('Collection record updated')
      void queryClient.invalidateQueries({ queryKey: ['collection', record.id] })
      void queryClient.invalidateQueries({ queryKey: ['collections'] })
      navigate(`/collections/${record.id}`)
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not update this record', 'danger'),
  })

  return (
    <Card className="max-w-2xl">
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Estate owner" value={record.estateName} disabled hint="Change via a new record, not an edit." />
          <Input label="Route" value={record.route} disabled hint="System-assigned." />
          <Input
            label={record.status === 'Pending Agent Confirmation' ? 'Reported weight (kg)' : 'Weight (kg)'}
            type="number"
            min="0"
            step="any"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select
            label="Grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value as TeaGrade)}
            options={['Pending', 'Super', 'Normal'].map((g) => ({ value: g, label: g }))}
            // Grading belongs to the Tea Receiving Officer (UC-053, mobile) — web edit keeps it view-mostly.
            disabled={record.status !== 'Collected'}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="secondary" onClick={() => navigate(`/collections/${record.id}`)} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>
            Save Changes
          </Button>
        </div>
      </div>
    </Card>
  )
}
