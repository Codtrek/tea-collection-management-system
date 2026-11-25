import type {UserRole} from '@/types/userRoles'

export const userRoles: UserRole[] = [
  {
    id: '1',
    role: 'Estate Owner',
    description: 'Manage your tea estate operations efficiently and effectively.',
    route: '/auth/login'
  },
  {
    id: '2',
    role: 'Estate Manager',
    description: 'Oversee and coordinate the daily operations of the tea estate.',
    route: '/estastemamnager/index'
  },
  {
    id: '3',
    role: 'Collection Agent',
    description: 'Collect tea leaves from the fields.',
    route: '/auth/login'
  }
];