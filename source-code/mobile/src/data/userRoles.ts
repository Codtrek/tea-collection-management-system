import type {UserRole} from '@/types/userRoles'

export const userRoles: UserRole[] = [
  {
    id: '1',
    role: 'Estate Owner',
    description: 'Manage your tea estate operations efficiently and effectively.',
    route: { pathname: '/auth/login', params: { userType: 'estate-owner' } }
  },
  {
    id: '2',
    role: 'Estate Manager',
    description: 'Oversee and coordinate the daily operations of the tea estate.',
    route: { pathname: '/auth/login', params: { userType: 'estate-manager' } }
  },
  {
    id: '3',
    role: 'Collection Agent',
    description: 'Collect tea leaves from the fields.',
    route: '/auth/collector-login'
  }
];