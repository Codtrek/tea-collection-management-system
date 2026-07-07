export type EvidenceStatus = 'none' | 'queued_offline' | 'uploaded';
export type TransitionResult = { ok: true } | { ok: false; error: string };

export function canCaptureEvidence(currentStatus: EvidenceStatus): TransitionResult {
  if (currentStatus !== 'none') {
    return { ok: false, error: 'Evidence has already been captured for this record' };
  }
  return { ok: true };
}

export function resolveCaptureOutcome(isOnline: boolean): EvidenceStatus {
  return isOnline ? 'uploaded' : 'queued_offline';
}

export function canRetryUpload(currentStatus: EvidenceStatus): TransitionResult {
  if (currentStatus !== 'queued_offline') {
    return { ok: false, error: 'Only queued evidence can be retried' };
  }
  return { ok: true };
}
