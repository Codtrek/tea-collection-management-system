import type {UserRole} from '@/types/userRoles'

export const userRoles: UserRole[] = [
  {
    id: '1',
    role: 'Estate Owner',
    description: 'Manage your tea estate operations efficiently and effectively.',
    route: '../(estate-owner)/home'
  },
  {
    id: '2',
    role: 'Estate Manager',
    description: 'Oversee and coordinate the daily operations of the tea estate.',
    route: '../(estate-manager)'
  },
  {
    id: '3',
    role: 'Factory Collector',
    description: 'Collect tea leaves from the fields.',
    route: '../teacollector/teacollectorMobile'
  }
];