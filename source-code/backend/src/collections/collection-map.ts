/**
 * DB ↔ portal mapping for collection status/grade, plus the `PublicCollection`
 * shape returned to the portal. Mirrors `auth/role-map.ts`'s DB→App pattern.
 */

/** Grades a factory can assign. A delivery with no grade lines is simply "Ungraded". */
export type DbGrade = 'super' | 'normal';
export type AppGrade = 'Super' | 'Normal';

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
};

const APP_TO_DB_GRADE: Record<AppGrade, DbGrade> = {
  Super: 'super',
  Normal: 'normal',
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

export interface PublicGradeLine {
  grade: AppGrade;
  weightKg: number;
}

export interface PublicCollection {
  id: string;
  estateId: string;
  estateName: string;
  route: string;
  /** Total weight: the SUM of grade lines once graded, else the estate weight (Ungraded). */
  weightKg: number;
  /** Agent-entered weight at the estate — the mismatch-check input; never overwritten by grading. */
  estateWeightKg: number;
  /** Factory grade lines (empty = Ungraded). */
  gradeLines: PublicGradeLine[];
  graded: boolean;
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

/* ── Weights: the ONE place a delivery's totals are computed ── */

interface WeighedRecord {
  weightKg: string;
  gradeLines?: { grade: DbGrade; weightKg: string }[] | null;
}

/** Sum of one grade's lines on a record (0 when ungraded or that grade is absent). */
export function gradeKg(record: WeighedRecord, grade: DbGrade): number {
  return (record.gradeLines ?? [])
    .filter((l) => l.grade === grade)
    .reduce((sum, l) => sum + Number(l.weightKg), 0);
}

/** Graded total = Σ lines. Never stored anywhere, so it cannot drift. */
export function gradedTotalKg(record: WeighedRecord): number {
  return (record.gradeLines ?? []).reduce(
    (sum, l) => sum + Number(l.weightKg),
    0,
  );
}

export function isGraded(record: WeighedRecord): boolean {
  return (record.gradeLines ?? []).length > 0;
}

/**
 * Display total: graded sum once graded, otherwise the estate weight (shown with an
 * "Ungraded" marker by the UI). Every consumer of a delivery's weight goes through this.
 */
export function weightSummary(record: WeighedRecord): {
  estateWeightKg: number;
  weightKg: number;
  graded: boolean;
  gradeLines: PublicGradeLine[];
} {
  const gradeLines = [...(record.gradeLines ?? [])]
    .sort((a, b) => a.grade.localeCompare(b.grade) * -1) // Super before Normal
    .map((l) => ({ grade: toAppGrade(l.grade), weightKg: Number(l.weightKg) }));
  const graded = gradeLines.length > 0;
  return {
    estateWeightKg: Number(record.weightKg),
    weightKg: graded ? gradedTotalKg(record) : Number(record.weightKg),
    graded,
    gradeLines,
  };
}

/** Graded total may differ from the estate weight by this much (fraction) before a complaint is raised. */
export const MISMATCH_THRESHOLD = 0.05;
