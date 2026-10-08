import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './App.tsx'
import { ToastProvider } from './components/ui/Toast.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { isAdminHost } from './lib/host.ts'

// Super admin panel (admin.<domain>) — lazy so factory users never download it.
// It owns its router and store, so it sits outside the factory providers.
// eslint-disable-next-line react-refresh/only-export-components
const AdminApp = lazy(() => import('./admin/AdminApp.tsx'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminHost() ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    )}
  </StrictMode>,
)
