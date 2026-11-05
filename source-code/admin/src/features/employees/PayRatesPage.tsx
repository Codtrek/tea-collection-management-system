import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/data/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { PayRatesPanel } from './PayRatesPanel'

/*
  People → Pay Rates (Administration-Addendum §6–7) — the same panel as Factory Setup → Pay Rates,
  for the Manager, who prepares pay changes (`payRates: edit`); the Administrator approves them.
*/
export function PayRatesPage() {
  const { can } = useAuth()
  if (!can('payRates', 'view')) {
    return <EmptyState title="Your role can’t view pay rates" description="Ask your Factory Administrator if you need access." />
  }
  return (
    <div>
      <PageHeader
        title="Pay Rates"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Employees', to: '/employees' }, { label: 'Pay Rates' }]}
        description="What each role is paid per hour, who is on their own rate, and the history of every change."
      />
      <PayRatesPanel />
    </div>
  )
}
