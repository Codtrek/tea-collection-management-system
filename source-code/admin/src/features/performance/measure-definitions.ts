import type { MeasureKey } from './types'

/*
  Every measure's definition, in one place (Performance-Addendum §3): the (i) buttons on the team
  table and the "How performance is measured" page both read this, so they can't disagree. The
  formulas themselves live in the backend (performance-rules.ts); this is the plain-English copy.
*/
export interface MeasureDefinition {
  label: string
  formula: string
  source: string
  /** what can move it that isn't the person's doing */
  affects: string
  excluded: string
  minimum: string
}

export const MEASURE_DEFINITIONS: Record<MeasureKey, MeasureDefinition> = {
  attendance: {
    label: 'Attendance rate',
    formula: 'Present days (a half day counts 0.5) ÷ (working days − leave days).',
    source: 'Attendance records and the holiday calendar.',
    affects: 'Days nobody marked are left out and shown as "not marked" — a gap in the records is not an absence.',
    excluded: 'Holidays, weekly holidays, rest days and leave never lower it.',
    minimum: '5 marked working days.',
  },
  absences: {
    label: 'Unplanned absences',
    formula: 'Days marked Absent that were not leave.',
    source: 'Attendance records.',
    affects: 'Illness or an emergency the person could not report in advance.',
    excluded: 'Leave, holidays and rest days.',
    minimum: '5 marked working days.',
  },
  leave: {
    label: 'Leave taken',
    formula: 'Days marked Leave.',
    source: 'Attendance records (approved leave requests once they are live).',
    affects: 'Leave is an entitlement — it is shown for planning, never marked up or down.',
    excluded: '—',
    minimum: '—',
  },
  routeCompletion: {
    label: 'Route completion',
    formula: 'Stops collected ÷ stops on their route days (their own routes and the covers they accepted).',
    source: 'Collection requests on the route that day; collected or confirmed = visited.',
    affects: 'An estate with no leaf ready, a road problem, a request added late. Reasons for a skipped stop are not recorded yet.',
    excluded: 'Days the route was cancelled (a holiday or a closure).',
    minimum: '5 route days.',
  },
  kg: {
    label: 'Kg collected',
    formula:
      'Total kg collected; and the kg on each route day ÷ that route’s own average per collection day over the previous 3 months. A cover day is compared with the covered route’s average.',
    source: 'The estate weight recorded at pickup.',
    affects: 'Affected by season, rain and estates’ plucking rounds.',
    excluded: 'Never compared between agents on different routes. Route days with no stops are left out.',
    minimum: '5 route days with stops, and 5 collection days of route history.',
  },
  weightAccuracy: {
    label: 'Weight accuracy',
    formula: 'Graded deliveries where |estate weight − factory weight| ÷ estate weight is above the tolerance ÷ all graded deliveries.',
    source: 'The estate weight at pickup and the factory’s graded total (the latest approved correction).',
    affects: 'Leaf naturally loses some weight between the estate and the factory; the tolerance allows for that. Read it together with kg collected.',
    excluded: 'Deliveries not graded yet.',
    minimum: '5 graded deliveries.',
  },
  fertilizer: {
    label: 'Fertilizer first attempt',
    formula: 'Deliveries handed over (in full or in part) on the first attempt ÷ first attempts.',
    source: 'Fertilizer delivery attempts and their failure reasons.',
    affects: '“Owner not available” and “owner refused” are on the owner’s side, not the agent’s — they are shown separately.',
    excluded: 'Second and later attempts; cancelled deliveries.',
    minimum: '5 first attempts.',
  },
  coverHelp: {
    label: 'Cover help',
    formula: 'Cover requests accepted ÷ cover requests answered (accepted, declined or expired).',
    source: 'Cover assignments on Agent Dispatch.',
    affects: 'Information only — it depends on who was asked and when. Never marked up or down.',
    excluded: 'Requests still pending or cancelled.',
    minimum: '—',
  },
}
