/**
 * The transport line of every settlement (Administration-Addendum §4). Pure; tested in
 * settlement-transport.spec.ts.
 *
 * Walks each estate's settlements oldest month first:
 *  • a processed settlement with a frozen line keeps it (a later version never changes it) and
 *    hands its carried-out amount to the next one; seeded history (no line) carries nothing
 *  • a settlement that will be processed gets a live line: the month's charge plus what was
 *    carried in, taken up to what's left (`takeTransport`), the rest carried on
 *  • a pending settlement that won't be processed in this run (missing bank, another period)
 *    still gets a live line, but doesn't pass its carry on — processing never relies on it
 */
import {
  firstChargedMonth,
  monthlyCharge,
  takeTransport,
  type PublicTransportLine,
  type TransportVersion,
} from '../admin/transport-rules';
import { labelToKey } from '../reports/reports-map';

export interface TransportSettlementFacts {
  id: string;
  estateId: number;
  period: string;
  status: string;
  selfDelivery: boolean;
  gross: number;
  adjustment: number;
  /** stored fertilizer + advance deductions */
  others: number;
  transportStatus: 'charged' | 'exempt' | 'no_deliveries' | null;
  transportCharge: string | number | null;
  transportVersionId: number | null;
  transportCarriedIn: string | number;
  transportCarriedOut: string | number;
  transportCost: string | number;
}

const monthOfVersion = (versions: TransportVersion[], id: number | null) => {
  const v = id == null ? null : versions.find((x) => x.id === id);
  return v ? firstChargedMonth(v.effectiveDate) : null;
};

/** The frozen line of a processed settlement, or null for history processed before §4. */
export function frozenLine(
  s: TransportSettlementFacts,
  versions: TransportVersion[],
): PublicTransportLine | null {
  if (s.status !== 'processed' || !s.transportStatus) return null;
  return {
    status: s.transportStatus,
    charge: Number(s.transportCharge ?? 0),
    carriedIn: Number(s.transportCarriedIn),
    taken: Number(s.transportCost),
    carriedOut: Number(s.transportCarriedOut),
    versionId: s.transportVersionId,
    versionMonth: monthOfVersion(versions, s.transportVersionId),
    frozen: true,
  };
}

/** The line a pending settlement would get if processed now. */
export function liveLine(
  s: TransportSettlementFacts,
  versions: TransportVersion[],
  deliveries: number,
  carriedIn: number,
): PublicTransportLine {
  const month = labelToKey(s.period);
  const c = monthlyCharge({
    versions,
    month,
    selfDelivery: s.selfDelivery,
    deliveries,
  });
  if (c.status === 'not_configured') {
    return {
      status: 'not_configured',
      charge: 0,
      carriedIn,
      taken: 0,
      carriedOut: carriedIn,
      versionId: null,
      versionMonth: null,
      frozen: false,
    };
  }
  const { taken, carriedOut } = takeTransport({
    due: c.charge + carriedIn,
    gross: s.gross,
    adjustment: s.adjustment,
    others: s.others,
  });
  return {
    status: c.status,
    charge: c.charge,
    carriedIn,
    taken,
    carriedOut,
    versionId: c.version?.id ?? null,
    versionMonth: c.version ? firstChargedMonth(c.version.effectiveDate) : null,
    frozen: false,
  };
}

/**
 * Every settlement's transport line, by id. `willProcess` says which pending rows pass their
 * carry on (the ones a run would process); `deliveriesOf` counts the estate's confirmed
 * deliveries in a 'YYYY-MM' month.
 */
export function transportLines(
  settlements: TransportSettlementFacts[],
  versions: TransportVersion[],
  deliveriesOf: (estateId: number, month: string) => number,
  willProcess: (s: TransportSettlementFacts) => boolean,
): Map<string, PublicTransportLine | null> {
  const out = new Map<string, PublicTransportLine | null>();
  const carry = new Map<number, number>();
  const sorted = [...settlements].sort(
    (a, b) =>
      labelToKey(a.period).localeCompare(labelToKey(b.period)) ||
      a.id.localeCompare(b.id),
  );
  for (const s of sorted) {
    if (s.status === 'processed') {
      const line = frozenLine(s, versions);
      out.set(s.id, line);
      carry.set(s.estateId, line ? line.carriedOut : 0);
      continue;
    }
    const line = liveLine(
      s,
      versions,
      deliveriesOf(s.estateId, labelToKey(s.period)),
      carry.get(s.estateId) ?? 0,
    );
    out.set(s.id, line);
    if (willProcess(s)) carry.set(s.estateId, line.carriedOut);
  }
  return out;
}
