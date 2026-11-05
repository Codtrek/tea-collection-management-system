import { useQuery } from '@tanstack/react-query'
import * as employeesService from '@/services/employees'

/**
 * Job titles for the registration/edit forms, from the server — the single source of truth
 * (also tells us which title makes someone a collection agent). No hardcoded copy in the portal.
 */
export function useEmployeeRoles() {
  const query = useQuery({
    queryKey: ['employees', 'roles'],
    queryFn: employeesService.getRoles,
    staleTime: Infinity,
  })
  return { roles: query.data?.roles ?? [], agentRole: query.data?.agentRole ?? '', isPending: query.isPending }
}
