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

/** A graded delivery's lifecycle: OPEN (editable) → LOCKED (correction request) → SETTLED (adjustment). */
export type GradingState = 'open' | 'locked' | 'settled';

/** Footer status of the owner notification, as the delivery detail shows it. */
export type NotificationStatus =
  | 'Queued'
  | 'Sent'
  | 'Correction sent'
  | 'Failed'
  | 'Cancelled';

export interface PublicRevisionLine {
  grade: AppGrade;
  weightKg: number;
}

export interface PublicRevision {
  revisionNo: number;
  kind: 'initial' | 'open_edit' | 'correction';
  lines: PublicRevisionLine[];
  totalKg: number;
  reason: string | null;
  changedBy: string;
  changedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
}

export interface PublicCorrectionRequest {
  id: number;
  deliveryId: string;
  lines: PublicRevisionLine[];
  currentLines: PublicRevisionLine[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  /** Present for a pending request: what approving it would do to money. */
  impact?: {
    settled: boolean;
    settlementId: string | null;
    /** signed Rs. difference that would be carried into the next settlement (0 when not settled) */
    adjustmentRs: number;
  };
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
  /** Set once graded. */
  gradingState?: GradingState;
  /** ISO — when the OPEN window closes (a snapshot taken at grading time). */
  lockedAt?: string;
  /** The processed settlement that paid this delivery. */
  settlementId?: string;
  /** How many times the grade lines were revised after the initial grading. */
  revisionCount?: number;
  /** Open correction request awaiting a Manager, if any. */
  pendingCorrectionId?: number;
  notificationStatus?: NotificationStatus;
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

/* ── Grading lifecycle: the ONE place OPEN / LOCKED / SETTLED is decided ── */

interface GradedRecord {
  status: DbStatus;
  lockedAt?: Date | null;
  settlementId?: string | null;
}

/**
 * Derived on read — never stored, so no cron has to flip a flag. `lockedAt` is the snapshot
 * taken at grading time (graded_at + the window THEN), so a later settings change never
 * re-opens or re-locks an already-graded delivery. A confirmed row with no `lockedAt` is a
 * legacy row from before the window existed: locked.
 */
export function gradingState(
  record: GradedRecord,
  now: Date = new Date(),
): GradingState | null {
  if (record.status !== 'confirmed') return null;
  if (record.settlementId) return 'settled';
  if (record.lockedAt && now.getTime() < record.lockedAt.getTime()) return 'open';
  return 'locked';
}

/**
 * Only deliveries past the correction window may feed a settlement or any payment figure.
 * An OPEN delivery can still change, so paying (or even counting) it would be premature.
 */
export function isPayable(record: GradedRecord, now: Date = new Date()): boolean {
  const state = gradingState(record, now);
  return state === 'locked' || state === 'settled';
}
