import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { useAdminStore } from '../data/AdminStore'
import { daysAgo, formatDate } from '../data/selectors'
import { AdminStatusBadge } from '../components/AdminStatusBadge'
import { ActionDialog } from '../components/ActionDialog'
import { DetailList } from '../components/DetailList'
import { LinkButton } from '../components/LinkButton'

const CHECKS = [
  'Business registration number matches the certificate',
  'Tea Board registration is valid and current',
  "Contact person's NIC matches the uploaded copy",
  'Phone number confirmed with a call to the factory',
]

export default function RequestReviewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { requests, factories, approveRequest, rejectRequest } = useAdminStore()
  const request = requests.find((r) => r.id === id)

  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false))
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null)

  if (!request) {
    return (
      <div className="py-24 text-center">
        <p className="text-text-muted">Request {id} was not found.</p>
        <LinkButton to="/requests" variant="ghost" className="mt-2">
          Back to requests
        </LinkButton>
      </div>
    )
  }

  const { factory, contact, documents } = request
  const isPending = request.status === 'pending'
  const doneCount = checked.filter(Boolean).length
  const allChecked = doneCount === CHECKS.length
  const duplicate = factories.find(
    (f) => f.profile.businessRegNo === factory.businessRegNo || f.profile.name === factory.name,
  )

  return (
    <>
      <Link
        to="/requests"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" /> Registration requests
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-heading">{factory.name}</h1>
            <AdminStatusBadge status={request.status} />
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {request.id} · submitted {formatDate(request.submittedAt)} ({daysAgo(request.submittedAt).toLowerCase()})
          </p>
        </div>
      </div>

      {isPending && duplicate && (
        <div
          role="alert"
          className="mb-6 rounded-[var(--radius-lg)] border border-warning-fg/30 bg-warning-bg p-4 text-sm text-warning-fg"
        >
          A registered factory already uses this name or BR number:{' '}
          <Link to={`/factories/${duplicate.id}`} className="font-medium underline">
            {duplicate.profile.name}
          </Link>
          . Check this is not a duplicate before approving.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Factory details</CardTitle>
            </CardHeader>
            <DetailList
              items={[
                ['Factory name', factory.name],
                ['Business registration no.', factory.businessRegNo],
                ['Tea Board registration no.', factory.teaBoardRegNo],
                ['Elevation', factory.elevation],
                ['District', factory.district],
                ['Address', factory.address],
                ['Phone', factory.phone],
                ['Email', factory.email],
                ['Estimated suppliers', factory.estimatedSuppliers.toLocaleString('en-US')],
              ]}
            />
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-base">Contact person</CardTitle>
                <p className="text-[13px] text-text-muted">Becomes the first Factory Administrator when approved</p>
              </div>
            </CardHeader>
            <DetailList
              items={[
                ['Full name', contact.fullName],
                ['Designation', contact.designation],
                ['NIC', contact.nic],
                ['Email', contact.email],
                ['Phone', contact.phone],
              ]}
            />
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-base">Documents</CardTitle>
                <p className="text-[13px] text-text-muted">{documents.length} of 3 required documents uploaded</p>
              </div>
            </CardHeader>
            <ul className="divide-y divide-border rounded-[var(--radius-sm)] border border-border">
              {documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                  <FileText className="size-4 shrink-0 text-text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{d.label}</p>
                    <p className="text-xs text-text-muted">
                      {d.fileName} · {d.sizeKb >= 1000 ? `${(d.sizeKb / 1024).toFixed(1)} MB` : `${d.sizeKb} KB`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost">
                    Open
                  </Button>
                </li>
              ))}
              {documents.length < 3 && (
                <li className="px-3 py-2.5 text-sm text-danger-fg">
                  {3 - documents.length} required {3 - documents.length === 1 ? 'document is' : 'documents are'} missing
                </li>
              )}
            </ul>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {isPending ? (
            <Card className="lg:sticky lg:top-8">
              <CardHeader>
                <div>
                  <CardTitle className="text-base">Verification</CardTitle>
                  <p className="text-[13px] text-text-muted">
                    {doneCount} of {CHECKS.length} checks done
                  </p>
                </div>
              </CardHeader>
              <ul className="space-y-3">
                {CHECKS.map((label, i) => (
                  <li key={label}>
                    <Checkbox
                      label={label}
                      checked={checked[i]}
                      onChange={(e) => setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                    />
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                <Button disabled={!allChecked} onClick={() => setDialog('approve')}>
                  <Check className="size-4" /> Approve factory
                </Button>
                <Button variant="secondary" className="text-danger-fg" onClick={() => setDialog('reject')}>
                  <X className="size-4" /> Reject
                </Button>
                {!allChecked && <p className="text-xs text-text-muted">Complete every check to enable approval.</p>}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="text-base">Decision</CardTitle>
                  <p className="text-[13px] text-text-muted">
                    {request.status === 'approved' ? 'Approved' : 'Rejected'}
                    {request.reviewedAt && ` on ${formatDate(request.reviewedAt)}`}
                  </p>
                </div>
              </CardHeader>
              <div className="space-y-3 text-sm">
                {request.reviewNote ? (
                  <p className="rounded-[var(--radius-sm)] bg-surface-hover p-3 text-text">{request.reviewNote}</p>
                ) : (
                  <p className="text-text-muted">No note was added.</p>
                )}
                {request.status === 'approved' && duplicate && (
                  <LinkButton to={`/factories/${duplicate.id}`} variant="secondary" className="w-full">
                    Open factory
                  </LinkButton>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      <ActionDialog
        open={dialog === 'approve'}
        onClose={() => setDialog(null)}
        title={`Approve ${factory.name}?`}
        description={`This creates the factory and sends ${contact.fullName} an invitation to set up the Factory Administrator account.`}
        confirmLabel="Approve factory"
        reason={{ label: 'Internal note', placeholder: 'Anything the team should know about this approval' }}
        onConfirm={(note) => {
          const created = approveRequest(request.id, note || undefined)
          if (created) navigate(`/factories/${created.id}?new=1`)
        }}
      />
      <ActionDialog
        open={dialog === 'reject'}
        onClose={() => setDialog(null)}
        title={`Reject ${factory.name}?`}
        description="The applicant is notified by email with your reason and can submit a new request."
        confirmLabel="Reject request"
        destructive
        reason={{
          label: 'Reason for rejection',
          placeholder: 'e.g. Tea Board registration number could not be verified.',
          required: true,
        }}
        onConfirm={(reason) => rejectRequest(request.id, reason)}
      />
    </>
  )
}
