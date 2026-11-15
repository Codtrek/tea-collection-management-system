/**
 * Transport rates (Administration-Addendum §4) — pure. Rates are effective-dated (versioning.ts),
 * but NO transport formula exists yet: the factory hasn't confirmed whether it charges per km or
 * per kg, and estates have no distance on record. Until a confirmed version is in force AND the
 * formula is built, transport is "not configured" — settlement processing shows that and stops,
 * and never deducts Rs. 0 silently.
 */
import { versionInForce, type Versioned } from './versioning';

/** Flipped to true only when the transport formula is built (after the basis is confirmed). */
export const TRANSPORT_FORMULA_READY = false;

export interface TransportVersion extends Versioned {
  basis: 'per_km' | 'per_kg';
  rate: number;
  minimumCharge: number;
  basisConfirmed: boolean;
}

export interface TransportStatus {
  configured: boolean;
  /** why not, in words for the page */
  reason: string | null;
}

export function transportStatus(
  versions: TransportVersion[],
  date: string,
  formulaReady: boolean = TRANSPORT_FORMULA_READY,
): TransportStatus {
  const v = versionInForce(versions, date);
  if (!v) {
    return {
      configured: false,
      reason: `Transport: not configured. No transport rate is in force on ${date}.`,
    };
  }
  if (!v.basisConfirmed) {
    return {
      configured: false,
      reason:
        'Transport: not configured. The factory hasn’t confirmed whether transport is charged per km or per kg (Factory Setup → Transport Rates).',
    };
  }
  if (!formulaReady) {
    return {
      configured: false,
      reason:
        'Transport: not configured. The transport calculation isn’t built yet for the confirmed basis.',
    };
  }
  return { configured: true, reason: null };
}

/** A `transport_rates` row (DB decimals arrive as strings) → the rules' shape. */
export function toTransportVersion(r: {
  effectiveDate: string;
  cancelledAt: Date | null;
  basis: 'per_km' | 'per_kg';
  rate: string | number;
  minimumCharge: string | number;
  basisConfirmed: boolean;
}): TransportVersion {
  return {
    effectiveDate: r.effectiveDate,
    cancelledAt: r.cancelledAt,
    basis: r.basis,
    rate: Number(r.rate),
    minimumCharge: Number(r.minimumCharge),
    basisConfirmed: r.basisConfirmed,
  };
}
