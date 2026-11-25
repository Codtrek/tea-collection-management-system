import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { AdminGuard } from './AdminGuard'
import { PermissionMatrixTab } from './PermissionMatrixTab'
import { SystemUsersTab } from './SystemUsersTab'

/*
  ADM-02 Users & Roles (Users-Roles-Addendum). Two tabs: System Users (portal logins) and Role
  Permissions (the matrix every screen's useAuth().can() reads). The tab is in the URL so a link
  or a reload keeps it.
*/
const TABS = [
  { id: 'users', label: 'System users' },
  { id: 'permissions', label: 'Role permissions' },
]

export function UsersRolesPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'permissions' ? 'permissions' : 'users'

  return (
    <AdminGuard>
      <PageHeader
        title="Users & Roles"
        breadcrumb={[{ label: 'Home', to: '/dashboard' }, { label: 'Administration' }, { label: 'Users & Roles' }]}
      />
      <Tabs
        tabs={TABS}
        active={tab}
        onChange={(id) => setParams(id === 'users' ? {} : { tab: id }, { replace: true })}
        className="mb-5"
      />
      {tab === 'users' ? <SystemUsersTab /> : <PermissionMatrixTab />}
    </AdminGuard>
  )
}
