import type { ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Landmark, Loader2, Upload } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorState } from '@/components/data/ErrorState'
import { useToast } from '@/components/ui/Toast'
import { ApiError } from '@/lib/api'
import * as adminService from '@/services/admin'
import { sameDraft } from './factory-setup-model'
import type { FactoryProfile } from './types'

/*
  ADM-01 General Info (Administration-Addendum §2) — the factory's details and its bank account
  (for the future bank payment file). Administrator only. The account number never comes back
  from the server in full: the page shows its last 4 digits, and changing it means typing the
  whole new number.
*/

export interface ProfileDraft {
  name: string
  registrationNo: string
  address: string
  contact: string
  email: string
  bank: string
  branch: string
  accountName: string
  /** '' keeps the number on record */
  accountNumber: string
}

const fromProfile = (p: FactoryProfile): ProfileDraft => ({
  name: p.name,
  registrationNo: p.registrationNo,
  address: p.address,
  contact: p.contact,
  email: p.email,
  bank: p.bank.bank,
  branch: p.bank.branch,
  accountName: p.bank.accountName,
  accountNumber: '',
})

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function GeneralInfoTab({ draft, onDraft }: { draft: ProfileDraft | null; onDraft: (d: ProfileDraft | null) => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { data: profile, isPending, isError, refetch } = useQuery({ queryKey: ['admin', 'factory-profile'], queryFn: adminService.getFactoryProfile })

  const save = useMutation({
    mutationFn: (d: ProfileDraft) => {
      const { accountNumber, ...rest } = d
      return adminService.updateFactoryProfile({ ...rest, ...(accountNumber.trim() ? { accountNumber: accountNumber.trim() } : {}) })
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin', 'factory-profile'], saved)
      onDraft(null)
      toast('Factory details saved, and recorded in the audit log')
    },
    onError: (err) => toast(err instanceof ApiError ? err.message : 'Could not save the factory details', 'danger'),
  })

  if (isPending) return <Loader2 className="size-6 animate-spin text-text-muted" aria-hidden />
  if (isError || !profile) return <ErrorState title="Couldn't load the factory details" onRetry={() => void refetch()} />

  const base = fromProfile(profile)
  const d = draft ?? base
  const set = (patch: Partial<ProfileDraft>) => {
    const next = { ...d, ...patch }
    onDraft(sameDraft(next, base) ? null : next)
  }
  const field = (key: keyof ProfileDraft) => ({ value: d[key], onChange: (e: ChangeEvent<HTMLInputElement>) => set({ [key]: e.target.value }) })
  const accountDigits = d.accountNumber.replace(/\s/g, '')
  const errors = {
    name: d.name.trim().length < 2 ? 'Enter the factory name' : undefined,
    email: d.email.trim() && !EMAIL.test(d.email.trim()) ? 'Enter a valid email address' : undefined,
    accountNumber: accountDigits && !/^\d{6,20}$/.test(accountDigits) ? 'The account number should be 6 to 20 digits' : undefined,
  }
  const invalid = Object.values(errors).some(Boolean)

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Factory details</CardTitle>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Factory name" error={errors.name} {...field('name')} />
          <Input label="Registration number" {...field('registrationNo')} />
          <div className="sm:col-span-2">
            <Input label="Address" {...field('address')} />
          </div>
          <Input label="Contact number" {...field('contact')} />
          <Input label="Email" type="email" error={errors.email} {...field('email')} />
          <div className="sm:col-span-2">
            <div
              aria-disabled
              className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-border bg-surface-sunken px-4 py-5 text-center opacity-70"
            >
              <Upload className="size-5 text-text-muted" strokeWidth={1.5} aria-hidden />
              <span className="text-sm font-medium text-text">Factory logo</span>
              <span className="text-xs text-text-muted">Coming soon (file storage)</span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="flex items-center gap-2">
              <Landmark className="size-4 text-primary" aria-hidden /> Factory bank account
            </span>
          </CardTitle>
        </CardHeader>
        <p className="-mt-2 mb-4 text-sm text-text-muted">For the bank payment file, when it is built. Only the last 4 digits of the account number are ever shown.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Bank" {...field('bank')} />
          <Input label="Branch" {...field('branch')} />
          <Input label="Account name" {...field('accountName')} />
          <Input
            label="Account number"
            inputMode="numeric"
            autoComplete="off"
            placeholder={profile.bank.accountNumberMasked ? `On record: ${profile.bank.accountNumberMasked}` : 'Not on record'}
            hint={profile.bank.accountNumberMasked ? 'Leave empty to keep the number on record; type the full new number to change it.' : undefined}
            error={errors.accountNumber}
            {...field('accountNumber')}
          />
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" disabled={!draft || save.isPending} onClick={() => onDraft(null)}>
          Discard changes
        </Button>
        <Button disabled={!draft || invalid} loading={save.isPending} onClick={() => draft && save.mutate(draft)}>
          Save General Info
        </Button>
      </div>
    </div>
  )
}
