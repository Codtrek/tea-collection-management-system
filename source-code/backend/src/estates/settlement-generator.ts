/**
 * The settlement generator's calculation (Settlement-Addendum). Pure — no repositories — so every
 * rule is unit-tested in settlement-generator.spec.ts. The service feeds it one estate's facts for
 * one month; what comes back is the whole calculation, line by line, and it is exactly what a
 * processed settlement freezes as its snapshot.
 *
 *  1. Leaf: every payable delivery (confirmed, past the grading OPEN window, not yet paid) dated in
 *     the month — plus deliveries rolled in from an earlier month — priced at the grade rate in
 *     force on ITS delivery date. Lines are grouped by rate period, so N rate changes in a month
 *     show as N+1 periods.
 *  2. Deductions, after the approved corrections (adjustments), in the configured order
 *     (default transport → fertilizer → advances), each taking at most what is left:
 *       • transport — the fixed monthly charge in force for the month, plus what was carried in;
 *         self-delivery estates are exempt; no version for the month = BLOCKED, never Rs. 0
 *       • fertilizer — every outstanding "Deduct from tea payment" charge delivered on or before
 *         the month's last day, oldest first, each one recovered ONCE and whole. The first one
 *         that doesn't fit stops the step; it and every later one carry forward
 *       • advances — the installments due, never more than the cap % of gross; the rest carries
 *  3. Net payable = gross + adjustments − deductions, never below Rs. 0.
 *  4. Not eligible: ungraded deliveries block the estate until they are excluded with a reason
 *     (they roll to the next month); OPEN ones are skipped and roll on their own.
 */
import { round2, planPeriodDeductions } from '../advances/installments';
import {
  monthlyCharge,
  firstChargedMonth,
  type TransportVersion,
} from '../admin/transport-rules';
import type { DbGrade } from '../collections/collection-map';
import { keyToLabel } from '../reports/reports-map';
import {
  installmentOf,
  type EstateAdvanceFacts,
} from './estate-advance-balance';
import { rateVersionFor } from './settlement-calc';
import { dueAdvances } from './settlement-deductions';
import type { SettlementDeductionStep } from './estate-advance-settings.service';
import type { RepaymentFacts } from '../advances/installments';

/** Bump when the snapshot shape changes; a frozen snapshot keeps the version it was made with. */
export const SNAPSHOT_VERSION = 1;

/** Statuses of a delivery that reached the factory but isn't confirmed (graded) yet. */
export const UNGRADED_STATUSES = ['collected', 'pending_agent_confirmation'];

// ── inputs ───────────────────────────────────────────────────────────────────────────────────

export interface GenRateVersion {
  id: string;
  effectiveDate: string; // 'YYYY-MM-DD'
  superRate: number;
  normalRate: number;
}

export interface GenDelivery {
  id: string;
  /** 'YYYY-MM-DD' (the collection date — a DATE, already the factory's local day) */
  date: string;
  status: string;
  lockedAt: Date | null;
  settlementId: string | null;
  lines: { grade: DbGrade; weightKg: number }[];
}

/** A Manager's exclusion: the delivery is left out of `month` and rolls to the next one. */
export interface GenExclusion {
  deliveryId: string;
  /** 'YYYY-MM' the delivery was excluded from */
  month: string;
  reason: string;
}

export interface GenCharge {
  id: number;
  /** display id, e.g. 'FC-0001' */
  ref: string;
  /** 'YYYY-MM-DD' — when the fertilizer was delivered (charged) */
  date: string;
  item: string;
  quantityKg: number;
  ratePerKg: number;
  amount: number;
  /** null on legacy rows = deduct */
  method: 'deduct' | 'cash' | 'bank' | null;
  /** already recovered by a settlement */
  recovered: boolean;
}

export interface GenAdjustment {
  id: number;
  deliveryId: string;
  amount: number;
}

export interface GenEstate {
  id: number;
  name: string;
  selfDelivery: boolean;
  payoutMethod: 'bank' | 'cash';
  bankAccount: string | null;
}

export interface GenerateInput {
  /** 'YYYY-MM' */
  month: string;
  estate: GenEstate;
  /** the estate's deliveries: the month's, plus any excluded from an earlier month */
  deliveries: GenDelivery[];
  exclusions: GenExclusion[];
  rates: GenRateVersion[];
  adjustments: GenAdjustment[];
  transportVersions: TransportVersion[];
  /** transport left owing by the estate's last processed settlement */
  transportCarriedIn: number;
  charges: GenCharge[];
  advances: EstateAdvanceFacts[];
  recs: RepaymentFacts[];
  capPct: number;
  order: SettlementDeductionStep[];
  /** 'YYYY-MM' — charges before it are flagged "Check: possible seed data" */
  firstRealMonth: string;
  now: Date;
}

// ── output (= the snapshot) ──────────────────────────────────────────────────────────────────

export interface LeafLine {
  deliveryId: string;
  date: string;
  superKg: number;
  normalKg: number;
  superRate: number;
  normalRate: number;
  amount: number;
  /** delivered in an earlier month and rolled into this one */
  rolledIn: boolean;
}

export interface RatePeriod {
  rateId: string;
  /** 'YYYY-MM-DD' — first and last day this rate applied within the month */
  from: string;
  to: string;
  superRate: number;
  normalRate: number;
  superKg: number;
  normalKg: number;
  superAmount: number;
  normalAmount: number;
  amount: number;
  deliveries: number;
  /** rolled in from an earlier month: priced at the rate of their own dates */
  rolledIn: boolean;
}

export interface TransportCalc {
  status: 'charged' | 'exempt' | 'no_deliveries' | 'not_configured';
  /** the month's fixed charge (0 unless charged) */
  charge: number;
  carriedIn: number;
  due: number;
  taken: number;
  carriedOut: number;
  versionId: number | null;
  /** 'YYYY-MM' the version charges from */
  versionMonth: string | null;
}

export interface FertilizerLine {
  chargeId: number;
  ref: string;
  date: string;
  item: string;
  quantityKg: number;
  ratePerKg: number;
  amount: number;
  /** taken by this settlement (the whole amount, or 0 = carried forward) */
  taken: number;
  carried: number;
  /** delivered before the system's first real month — "Check: possible seed data" */
  checkSeed: boolean;
}

export interface AdvanceLine {
  advanceId: string;
  planned: number;
  taken: number;
  carried: number;
}

export interface NotEligibleDelivery {
  id: string;
  date: string;
  status: string;
  reason: string;
}

export interface SettlementCalculation {
  version: number;
  month: string;
  period: string;
  estateId: number;
  estateName: string;
  payoutMethod: 'bank' | 'cash';
  selfDelivery: boolean;
  calculatedAt: string;
  leaf: LeafLine[];
  ratePeriods: RatePeriod[];
  superKg: number;
  normalKg: number;
  gross: number;
  adjustments: { lines: GenAdjustment[]; total: number };
  transport: TransportCalc;
  fertilizer: {
    lines: FertilizerLine[];
    /** cash / bank charges in the month — listed for information, never deducted */
    info: FertilizerLine[];
    due: number;
    taken: number;
    carried: number;
  };
  advances: {
    lines: AdvanceLine[];
    capPct: number;
    cap: number;
    due: number;
    taken: number;
    carried: number;
  };
  order: SettlementDeductionStep[];
  deductionsTotal: number;
  net: number;
  carriedForward: number;
  /** ungraded (blocking), OPEN (skipped, rolls on its own) and excluded (rolls) deliveries */
  ungraded: NotEligibleDelivery[];
  open: NotEligibleDelivery[];
  excluded: NotEligibleDelivery[];
  /** why this estate can't be processed yet (empty = ready) */
  blockers: string[];
  /** why this estate is left out of processing altogether (e.g. no bank account) */
  excludedReason: string | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────

const monthStart = (month: string) => `${month}-01`;

export function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, '0')}`;
}

const dayBefore = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const kgOf = (d: GenDelivery, grade: DbGrade) =>
  round2(
    d.lines
      .filter((l) => l.grade === grade)
      .reduce((s, l) => s + Number(l.weightKg), 0),
  );

/**
 * The rate periods of a month, from the live versions: each version in force at some point in the
 * month, with the days it covered. Two changes in a month = three periods.
 */
export function monthRatePeriods(
  rates: GenRateVersion[],
  month: string,
): { rate: GenRateVersion; from: string; to: string }[] {
  const start = monthStart(month);
  const end = monthEnd(month);
  const sorted = [...rates].sort((a, b) =>
    a.effectiveDate.localeCompare(b.effectiveDate),
  );
  const out: { rate: GenRateVersion; from: string; to: string }[] = [];
  sorted.forEach((rate, i) => {
    const next = sorted[i + 1];
    const from = rate.effectiveDate < start ? start : rate.effectiveDate;
    const to = next ? dayBefore(next.effectiveDate) : end;
    const clippedTo = to > end ? end : to;
    if (from <= end && clippedTo >= start && from <= clippedTo) {
      out.push({ rate, from, to: clippedTo });
    }
  });
  return out;
}

/** "1–14 Jul" */
export function periodLabel(from: string, to: string): string {
  const mon = new Date(`${from}T00:00:00Z`).toLocaleString('en-GB', {
    month: 'short',
    timeZone: 'UTC',
  });
  return `${Number(from.slice(8))}–${Number(to.slice(8))} ${mon}`;
}

// ── the calculation ──────────────────────────────────────────────────────────────────────────

export function generateSettlement(i: GenerateInput): SettlementCalculation {
  const start = monthStart(i.month);
  const end = monthEnd(i.month);
  const blockers: string[] = [];

  // 1 — which deliveries this month pays for
  const excludedHere = new Map(
    i.exclusions
      .filter((e) => e.month === i.month)
      .map((e) => [e.deliveryId, e.reason]),
  );
  const rolledFrom = new Set(
    i.exclusions.filter((e) => e.month < i.month).map((e) => e.deliveryId),
  );
  const payable: (GenDelivery & { rolledIn: boolean })[] = [];
  const ungraded: NotEligibleDelivery[] = [];
  const open: NotEligibleDelivery[] = [];
  const excluded: NotEligibleDelivery[] = [];
  for (const d of [...i.deliveries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  )) {
    if (d.settlementId) continue;
    const inMonth = d.date >= start && d.date <= end;
    const rolledIn = !inMonth && d.date < start && rolledFrom.has(d.id);
    if (!inMonth && !rolledIn) continue;
    const reason = excludedHere.get(d.id);
    if (reason !== undefined) {
      excluded.push({ id: d.id, date: d.date, status: d.status, reason });
      continue;
    }
    if (d.status === 'confirmed') {
      if (d.lockedAt && i.now.getTime() < d.lockedAt.getTime()) {
        open.push({
          id: d.id,
          date: d.date,
          status: d.status,
          reason:
            'Inside the grading correction window — rolls to the next month',
        });
      } else {
        payable.push({ ...d, rolledIn });
      }
    } else if (UNGRADED_STATUSES.includes(d.status)) {
      ungraded.push({
        id: d.id,
        date: d.date,
        status: d.status,
        reason: 'Not graded yet',
      });
    }
  }
  if (ungraded.length > 0) {
    blockers.push(
      `${ungraded.length} deliver${ungraded.length === 1 ? 'y is' : 'ies are'} not graded yet (${ungraded
        .map((u) => u.id)
        .join(
          ', ',
        )}). Grade ${ungraded.length === 1 ? 'it' : 'them'}, or exclude ${ungraded.length === 1 ? 'it' : 'them'} with a reason to roll to the next month.`,
    );
  }

  // 2 — leaf lines, each at the rate in force on its own date
  const leaf: LeafLine[] = [];
  const unpriced: string[] = [];
  for (const d of payable) {
    const rate = rateVersionFor(i.rates, d.date);
    if (!rate) {
      unpriced.push(d.id);
      continue;
    }
    const superKg = kgOf(d, 'super');
    const normalKg = kgOf(d, 'normal');
    leaf.push({
      deliveryId: d.id,
      date: d.date,
      superKg,
      normalKg,
      superRate: rate.superRate,
      normalRate: rate.normalRate,
      amount: round2(superKg * rate.superRate + normalKg * rate.normalRate),
      rolledIn: d.rolledIn,
    });
  }
  if (unpriced.length > 0) {
    blockers.push(
      `No grade rate covers the date of ${unpriced.join(', ')} (Factory Setup → Grade Rates).`,
    );
  }

  const ratePeriods = groupByRatePeriod(leaf, i.rates, i.month);
  const superKg = round2(leaf.reduce((s, l) => s + l.superKg, 0));
  const normalKg = round2(leaf.reduce((s, l) => s + l.normalKg, 0));
  const gross = round2(leaf.reduce((s, l) => s + l.amount, 0));

  // 3 — corrections first, then each step in order, each up to what's left
  const adjustmentTotal = round2(
    i.adjustments.reduce((s, a) => s + a.amount, 0),
  );
  if (gross + adjustmentTotal < 0) {
    blockers.push(
      `Grading corrections (${adjustmentTotal}) are more than this month's leaf value (${gross}).`,
    );
  }
  let room = Math.max(0, round2(gross + adjustmentTotal));

  const tc = monthlyCharge({
    versions: i.transportVersions,
    month: i.month,
    selfDelivery: i.estate.selfDelivery,
    deliveries: leaf.length,
  });
  const transport: TransportCalc = {
    status: tc.status,
    charge: tc.charge,
    carriedIn: round2(i.transportCarriedIn),
    due: 0,
    taken: 0,
    carriedOut: 0,
    versionId: tc.version?.id ?? null,
    versionMonth: tc.version
      ? firstChargedMonth(tc.version.effectiveDate)
      : null,
  };
  if (tc.status === 'not_configured') {
    blockers.push(
      `Transport: not configured. No monthly transport charge covers ${keyToLabel(i.month)} (Factory Setup → Transport Rates).`,
    );
  }

  const deductCharges = i.charges
    .filter(
      (c) =>
        !c.recovered &&
        (c.method ?? 'deduct') === 'deduct' &&
        c.date <= end &&
        c.amount > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const fertLine = (c: GenCharge): FertilizerLine => ({
    chargeId: c.id,
    ref: c.ref,
    date: c.date,
    item: c.item,
    quantityKg: c.quantityKg,
    ratePerKg: c.ratePerKg,
    amount: round2(c.amount),
    taken: 0,
    carried: round2(c.amount),
    checkSeed: c.date.slice(0, 7) < i.firstRealMonth,
  });
  const fertLines = deductCharges.map(fertLine);
  const fertInfo = i.charges
    .filter(
      (c) =>
        (c.method === 'cash' || c.method === 'bank') &&
        c.date >= start &&
        c.date <= end,
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    .map((c) => ({ ...fertLine(c), carried: 0 }));

  let advanceLines: AdvanceLine[] = [];
  let advanceCap = 0;
  let advanceDue = 0;
  let advanceTaken = 0;

  for (const step of i.order) {
    if (step === 'transport') {
      transport.due = round2(
        (tc.status === 'charged' ? tc.charge : 0) + transport.carriedIn,
      );
      transport.taken = round2(Math.min(transport.due, room));
      transport.carriedOut = round2(transport.due - transport.taken);
      room = round2(room - transport.taken);
    } else if (step === 'fertilizer') {
      // whole charges, oldest first; the first that doesn't fit stops the step
      for (const line of fertLines) {
        if (line.amount > room) break;
        line.taken = line.amount;
        line.carried = 0;
        room = round2(room - line.amount);
      }
    } else {
      advanceCap = round2(Math.min(room, (gross * i.capPct) / 100));
      const plan = planPeriodDeductions(
        dueAdvances(i.advances, keyToLabel(i.month)),
        i.recs,
        keyToLabel(i.month),
        advanceCap,
        installmentOf,
      );
      advanceLines = plan.lines.map((l) => ({
        advanceId: l.advanceId,
        planned: l.planned,
        taken: l.amount,
        carried: round2(l.planned - l.amount),
      }));
      advanceDue = round2(plan.lines.reduce((s, l) => s + l.planned, 0));
      advanceTaken = plan.total;
      room = round2(room - advanceTaken);
    }
  }

  const fertDue = round2(fertLines.reduce((s, l) => s + l.amount, 0));
  const fertTaken = round2(fertLines.reduce((s, l) => s + l.taken, 0));
  const deductionsTotal = round2(transport.taken + fertTaken + advanceTaken);
  const net = Math.max(0, round2(gross + adjustmentTotal - deductionsTotal));
  const carriedForward = round2(
    transport.carriedOut + (fertDue - fertTaken) + (advanceDue - advanceTaken),
  );

  const excludedReason =
    i.estate.payoutMethod === 'bank' && !i.estate.bankAccount?.trim()
      ? 'Bank payout, but no bank account number is on file.'
      : null;

  return {
    version: SNAPSHOT_VERSION,
    month: i.month,
    period: keyToLabel(i.month),
    estateId: i.estate.id,
    estateName: i.estate.name,
    payoutMethod: i.estate.payoutMethod,
    selfDelivery: i.estate.selfDelivery,
    calculatedAt: i.now.toISOString(),
    leaf,
    ratePeriods,
    superKg,
    normalKg,
    gross,
    adjustments: { lines: i.adjustments, total: adjustmentTotal },
    transport,
    fertilizer: {
      lines: fertLines,
      info: fertInfo,
      due: fertDue,
      taken: fertTaken,
      carried: round2(fertDue - fertTaken),
    },
    advances: {
      lines: advanceLines,
      capPct: i.capPct,
      cap: advanceCap,
      due: advanceDue,
      taken: advanceTaken,
      carried: round2(advanceDue - advanceTaken),
    },
    order: i.order,
    deductionsTotal,
    net,
    carriedForward,
    ungraded,
    open,
    excluded,
    blockers,
    excludedReason,
  };
}

/** Leaf lines grouped by the rate period they fall in (rolled-in ones by their own rate). */
function groupByRatePeriod(
  leaf: LeafLine[],
  rates: GenRateVersion[],
  month: string,
): RatePeriod[] {
  const periods = monthRatePeriods(rates, month);
  const out = new Map<string, RatePeriod>();
  for (const l of leaf) {
    const rate = rateVersionFor(rates, l.date)!;
    const p = l.rolledIn ? null : periods.find((x) => x.rate.id === rate.id);
    const key = `${l.rolledIn ? 'rolled:' : ''}${rate.id}`;
    const g =
      out.get(key) ??
      ({
        rateId: rate.id,
        from: p?.from ?? l.date,
        to: p?.to ?? l.date,
        superRate: rate.superRate,
        normalRate: rate.normalRate,
        superKg: 0,
        normalKg: 0,
        superAmount: 0,
        normalAmount: 0,
        amount: 0,
        deliveries: 0,
        rolledIn: l.rolledIn,
      } satisfies RatePeriod);
    if (l.rolledIn) {
      if (l.date < g.from) g.from = l.date;
      if (l.date > g.to) g.to = l.date;
    }
    g.superKg = round2(g.superKg + l.superKg);
    g.normalKg = round2(g.normalKg + l.normalKg);
    g.superAmount = round2(g.superAmount + l.superKg * l.superRate);
    g.normalAmount = round2(g.normalAmount + l.normalKg * l.normalRate);
    g.amount = round2(g.amount + l.amount);
    g.deliveries += 1;
    out.set(key, g);
  }
  return [...out.values()].sort(
    (a, b) =>
      Number(b.rolledIn) - Number(a.rolledIn) || a.from.localeCompare(b.from),
  );
}

/** Totals over many estates' calculations — the ONE object the Process page and its popup read. */
export interface RunTotals {
  estates: number;
  superKg: number;
  normalKg: number;
  gross: number;
  adjustments: number;
  transport: number;
  fertilizer: number;
  advances: number;
  deductions: number;
  carriedForward: number;
  net: number;
}

export function runTotals(calcs: SettlementCalculation[]): RunTotals {
  const sum = (f: (c: SettlementCalculation) => number) =>
    round2(calcs.reduce((s, c) => s + f(c), 0));
  return {
    estates: calcs.length,
    superKg: sum((c) => c.superKg),
    normalKg: sum((c) => c.normalKg),
    gross: sum((c) => c.gross),
    adjustments: sum((c) => c.adjustments.total),
    transport: sum((c) => c.transport.taken),
    fertilizer: sum((c) => c.fertilizer.taken),
    advances: sum((c) => c.advances.taken),
    deductions: sum((c) => c.deductionsTotal),
    carriedForward: sum((c) => c.carriedForward),
    net: sum((c) => c.net),
  };
}
