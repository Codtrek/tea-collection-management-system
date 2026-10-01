export type RequestStatus = 'pending' | 'approved' | 'rejected'
export type FactoryStatus = 'active' | 'suspended'

export type FactoryRole =
  | 'FACTORY_ADMINISTRATOR'
  | 'FACTORY_MANAGER'
  | 'FACTORY_OFFICER'
  | 'RECEIVING_OFFICER'
  | 'COLLECTION_AGENT'
  | 'ESTATE_OWNER'
  | 'ESTATE_MANAGER'

export const ROLE_LABELS: Record<FactoryRole, string> = {
  FACTORY_ADMINISTRATOR: 'Factory Administrators',
  FACTORY_MANAGER: 'Factory Managers',
  FACTORY_OFFICER: 'Factory Officers',
  RECEIVING_OFFICER: 'Receiving Officers',
  COLLECTION_AGENT: 'Collection Agents',
  ESTATE_OWNER: 'Estate Owners',
  ESTATE_MANAGER: 'Estate Managers',
}

export type UserCounts = Record<FactoryRole, number>

export interface ContactPerson {
  fullName: string
  designation: string
  nic: string
  email: string
  phone: string
}

export interface UploadedDocument {
  id: string
  label: string
  fileName: string
  sizeKb: number
}

export interface FactoryProfile {
  name: string
  businessRegNo: string
  teaBoardRegNo: string
  district: string
  address: string
  phone: string
  email: string
  elevation: 'Low grown' | 'Mid grown' | 'High grown'
  estimatedSuppliers: number
}

export interface RegistrationRequest {
  id: string
  factory: FactoryProfile
  contact: ContactPerson
  documents: UploadedDocument[]
  submittedAt: string
  status: RequestStatus
  reviewedAt?: string
  reviewNote?: string
}

export interface Factory {
  id: string
  profile: FactoryProfile
  admin: ContactPerson
  status: FactoryStatus
  registeredAt: string
  routes: number
  estates: number
  userCounts: UserCounts
  suspendReason?: string
}

export const DISTRICTS = [
  'Badulla',
  'Galle',
  'Hambantota',
  'Kalutara',
  'Kandy',
  'Kegalle',
  'Matale',
  'Matara',
  'Nuwara Eliya',
  'Ratnapura',
] as const
