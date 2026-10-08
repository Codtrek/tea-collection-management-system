import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminStoreProvider } from './data/AdminStore'
import { AdminLayout } from './layout/AdminLayout'
import DashboardPage from './pages/DashboardPage'
import FactoriesPage from './pages/FactoriesPage'
import FactoryDetailPage from './pages/FactoryDetailPage'
import RegisterFactoryPage from './pages/RegisterFactoryPage'
import RegistrationRequestsPage from './pages/RegistrationRequestsPage'
import RequestReviewPage from './pages/RequestReviewPage'

export default function AdminApp() {
  return (
    <AdminStoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="requests" element={<RegistrationRequestsPage />} />
            <Route path="requests/:id" element={<RequestReviewPage />} />
            <Route path="factories" element={<FactoriesPage />} />
            <Route path="factories/new" element={<RegisterFactoryPage />} />
            <Route path="factories/:id" element={<FactoryDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AdminStoreProvider>
  )
}
