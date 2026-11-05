import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import * as reportsService from '@/services/reports'

/*
  RPT-04 — daily operational expenses (utilities, maintenance, misc) that no
  other workflow generates. Fills the §8.1.6 "enter daily expenses" gap the
  reports doc flagged; RPT-03 aggregates these entries.
*/
const expenseSchema = z.object({
  category: z.enum(['Utilities', 'Maintenance', 'Miscellaneous', 'Other'], { message: 'Category is required' }),
  amount: z.number({ message: 'Amount is required' }).positive('Amount must be a positive number'),
  date: z
    .string()
    .min(1, 'Date is required')
    .refine((v) => v <= new Date().toISOString().slice(0, 10), 'Date cannot be in the future'),
  description: z.string().min(1, 'Description is required'),
})

type ExpenseForm = z.infer<typeof expenseSchema>

export function ExpenseEntryPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    mode: 'onBlur',
    defaultValues: { date: new Date().toISOString().slice(0, 10) },
  })

  const logMutation = useMutation({
    mutationFn: (data: ExpenseForm) => reportsService.createExpense(data),
    onSuccess: () => {
      toast('Expense logged')
      void queryClient.invalidateQueries({ queryKey: ['reports', 'expenses'] })
      navigate('/reports/expenses')
    },
    onError: (err) => toast(err instanceof Error ? err.message : 'Could not log this expense', 'danger'),
  })

  const onSubmit = (data: ExpenseForm) => {
    logMutation.mutate(data)
  }

  return (
    <div>
      <PageHeader
        title="Log Daily Expense"
        breadcrumb={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Reports' },
          { label: 'Expenses', to: '/reports/expenses' },
          { label: 'New Entry' },
        ]}
      />

      <Card className="max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Select
            label="Category"
            placeholder="Select category"
            error={errors.category?.message}
            options={['Utilities', 'Maintenance', 'Miscellaneous', 'Other'].map((c) => ({ value: c, label: c }))}
            {...register('category')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount (Rs.)" type="number" min="0" inputMode="numeric" error={errors.amount?.message} {...register('amount', { valueAsNumber: true })} />
            <Input label="Date" type="date" max={new Date().toISOString().slice(0, 10)} error={errors.date?.message} {...register('date')} />
          </div>
          <Input label="Description" placeholder="e.g. CEB electricity — factory floor" error={errors.description?.message} {...register('description')} />

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-border bg-surface-sunken px-4 py-6 text-center hover:bg-surface-hover">
            <Upload className="size-5 text-text-muted" strokeWidth={1.5} />
            <span className="text-sm font-medium text-text">Receipt (optional)</span>
            <span className="text-xs text-text-muted">Click to upload (demo)</span>
            <input type="file" className="hidden" />
          </label>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={() => navigate('/reports/expenses')} disabled={logMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={logMutation.isPending}>
              Save Expense
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
