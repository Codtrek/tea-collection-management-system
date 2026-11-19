import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/data/EmptyState'
import { useAuth } from '@/context/AuthContext'
import { ItemPricesTab } from '@/features/admin/ItemPricesTab'

/*
  Item Prices, read-only (Administration-Addendum §5) — what estate owners are charged for
  fertilizer and other items, for the people who approve requests (Officers) and the Manager
  (`itemPrices: view`). Prices are set in Factory Setup → Item Prices; this is the same list.
*/
export function ItemPricesPage() {
  const { can } = useAuth()
  if (!can('itemPrices', 'view')) {
    return <EmptyState title="Your role can’t view item prices" description="Ask your Factory Administrator if you need access." />
  }
  return (
    <div>
      <PageHeader
        title="Item Prices"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Fertilizer', to: '/fertilizer' }, { label: 'Item Prices' }]}
        description="What estate owners are charged for fertilizer and other items. A request keeps the price in force on the day it was approved."
        actions={
          can('itemPrices', 'edit') && can('administration') ? (
            <Link to="/admin/factory-setup" className="text-sm font-medium text-primary hover:underline">
              Change prices in Factory Setup →
            </Link>
          ) : undefined
        }
      />
      <ItemPricesTab readOnly />
    </div>
  )
}
