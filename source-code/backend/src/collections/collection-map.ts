/**
 * DB ↔ portal mapping for collection status/grade, plus the `PublicCollection`
 * shape returned to the portal. Mirrors `auth/role-map.ts`'s DB→App pattern.
 */

export type DbGrade = 'super' | 'normal' | 'pending';
export type AppGrade = 'Super' | 'Normal' | 'Pending';

export type DbStatus =
  | 'submitted'
  | 'approved'
  | 'agent_assigned'
  | 'collected'
  | 'confirmed'
  | 'pending_agent_confirmation';

export type AppStatus =
  | 'Submitted'
  | 'Approved'
  | 'Agent Assigned'
  | 'Collected'
  | 'Confirmed'
  | 'Pending Agent Confirmation';

const DB_TO_APP_GRADE: Record<DbGrade, AppGrade> = {
  super: 'Super',
  normal: 'Normal',
  pending: 'Pending',
};

const APP_TO_DB_GRADE: Record<AppGrade, DbGrade> = {
  Super: 'super',
  Normal: 'normal',
  Pending: 'pending',
};

const DB_TO_APP_STATUS: Record<DbStatus, AppStatus> = {
  submitted: 'Submitted',
  approved: 'Approved',
  agent_assigned: 'Agent Assigned',
  collected: 'Collected',
  confirmed: 'Confirmed',
  pending_agent_confirmation: 'Pending Agent Confirmation',
};

const APP_TO_DB_STATUS: Record<AppStatus, DbStatus> = {
  Submitted: 'submitted',
  Approved: 'approved',
  'Agent Assigned': 'agent_assigned',
  Collected: 'collected',
  Confirmed: 'confirmed',
  'Pending Agent Confirmation': 'pending_agent_confirmation',
};

export function toAppGrade(dbGrade: DbGrade): AppGrade {
  return DB_TO_APP_GRADE[dbGrade];
}

export function toDbGrade(appGrade: AppGrade): DbGrade {
  return APP_TO_DB_GRADE[appGrade];
}

export function toAppStatus(dbStatus: DbStatus): AppStatus {
  return DB_TO_APP_STATUS[dbStatus];
}

export function toDbStatus(appStatus: AppStatus): DbStatus {
  return APP_TO_DB_STATUS[appStatus];
}

/* ── Portal-facing shapes — byte-identical to the portal's `features/collections/types.ts` ── */

export interface EvidencePhoto {
  label:
    | 'Agent collection photo'
    | 'Manager verification photo'
    | 'Handover photo';
  timestamp: string;
  takenBy: string;
}

export interface TimelineEntry {
  status: AppStatus;
  timestamp: string;
  by?: string;
}

export interface PublicCollection {
  id: string;
  estateId: string;
  estateName: string;
  route: string;
  weightKg: number;
  grade: AppGrade;
  status: AppStatus;
  date: string;
  agent: string;
  photos: EvidencePhoto[];
  timeline: TimelineEntry[];
  mismatch?: { complaintId: string; note: string };
  provisional?: { reportedBy: string; reason: string };
  lastUpdatedBy?: string;
  lastUpdatedOn?: string;
}
