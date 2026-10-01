import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { MOCK_FACTORIES, MOCK_REQUESTS } from './mock'
import type { ContactPerson, Factory, FactoryProfile, RegistrationRequest } from './types'

const today = () => new Date().toISOString().slice(0, 10)

const emptyCounts = (): Factory['userCounts'] => ({
  FACTORY_ADMINISTRATOR: 1,
  FACTORY_MANAGER: 0,
  FACTORY_OFFICER: 0,
  RECEIVING_OFFICER: 0,
  COLLECTION_AGENT: 0,
  ESTATE_OWNER: 0,
  ESTATE_MANAGER: 0,
})

let nextFactoryNo = 1100
const newFactory = (profile: FactoryProfile, admin: ContactPerson): Factory => ({
  id: `F-${nextFactoryNo++}`,
  profile,
  admin,
  status: 'active',
  registeredAt: today(),
  routes: 0,
  estates: 0,
  userCounts: emptyCounts(),
})

interface AdminStore {
  factories: Factory[]
  requests: RegistrationRequest[]
  approveRequest: (id: string, note?: string) => Factory | undefined
  rejectRequest: (id: string, reason: string) => void
  suspendFactory: (id: string, reason: string) => void
  reactivateFactory: (id: string) => void
  registerFactory: (profile: FactoryProfile, admin: ContactPerson) => Factory
}

const AdminStoreContext = createContext<AdminStore | null>(null)

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [factories, setFactories] = useState<Factory[]>(MOCK_FACTORIES)
  const [requests, setRequests] = useState<RegistrationRequest[]>(MOCK_REQUESTS)

  const store = useMemo<AdminStore>(
    () => ({
      factories,
      requests,
      approveRequest: (id, note) => {
        const req = requests.find((r) => r.id === id)
        if (!req || req.status !== 'pending') return undefined
        const factory = newFactory(req.factory, req.contact)
        setFactories((prev) => [factory, ...prev])
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'approved', reviewedAt: today(), reviewNote: note } : r)),
        )
        return factory
      },
      rejectRequest: (id, reason) =>
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'rejected', reviewedAt: today(), reviewNote: reason } : r)),
        ),
      suspendFactory: (id, reason) =>
        setFactories((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'suspended', suspendReason: reason } : f)),
        ),
      reactivateFactory: (id) =>
        setFactories((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'active', suspendReason: undefined } : f)),
        ),
      registerFactory: (profile, admin) => {
        const factory = newFactory(profile, admin)
        setFactories((prev) => [factory, ...prev])
        return factory
      },
    }),
    [factories, requests],
  )

  return <AdminStoreContext.Provider value={store}>{children}</AdminStoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminStore() {
  const ctx = useContext(AdminStoreContext)
  if (!ctx) throw new Error('useAdminStore must be used inside <AdminStoreProvider>')
  return ctx
}
