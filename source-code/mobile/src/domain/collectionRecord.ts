export type TeaGrade = 'super' | 'normal';

export type TransitionResult = { ok: true } | { ok: false; error: string };

// Threshold (kg) beyond which collected-vs-received weight difference auto-raises a complaint.
export const DEFAULT_WEIGHT_MISMATCH_THRESHOLD_KG = 2;

export function validateWeightKg(weightKg: number): TransitionResult {
  if (!Number.isFinite(weightKg)) {
    return { ok: false, error: 'Weight must be a number' };
  }
  if (weightKg <= 0) {
    return { ok: false, error: 'Weight must be greater than zero' };
  }
  return { ok: true };
}

export function canConfirmOwner(ownerConfirmed: boolean): TransitionResult {
  if (ownerConfirmed) {
    return { ok: false, error: 'This record is already confirmed by the owner' };
  }
  return { ok: true };
}

export function canReceiveCollection(alreadyReceived: boolean): TransitionResult {
  if (alreadyReceived) {
    return { ok: false, error: 'This record has already been received at the factory' };
  }
  return { ok: true };
}

export function isWeightMismatch(
  collectedKg: number,
  receivedKg: number,
  thresholdKg: number = DEFAULT_WEIGHT_MISMATCH_THRESHOLD_KG,
): boolean {
  return Math.abs(collectedKg - receivedKg) > thresholdKg;
}
