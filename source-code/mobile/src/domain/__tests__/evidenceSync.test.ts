import { canCaptureEvidence, canRetryUpload, resolveCaptureOutcome } from '../evidenceSync';

describe('canCaptureEvidence', () => {
  it('allows capture when no evidence has been captured yet', () => {
    expect(canCaptureEvidence('none')).toEqual({ ok: true });
  });

  it('rejects capturing evidence twice', () => {
    expect(canCaptureEvidence('uploaded')).toEqual({
      ok: false,
      error: 'Evidence has already been captured for this record',
    });
    expect(canCaptureEvidence('queued_offline')).toEqual({
      ok: false,
      error: 'Evidence has already been captured for this record',
    });
  });
});

describe('resolveCaptureOutcome', () => {
  it('resolves to uploaded when online', () => {
    expect(resolveCaptureOutcome(true)).toBe('uploaded');
  });

  it('resolves to queued_offline when offline', () => {
    expect(resolveCaptureOutcome(false)).toBe('queued_offline');
  });
});

describe('canRetryUpload', () => {
  it('allows retrying a queued item', () => {
    expect(canRetryUpload('queued_offline')).toEqual({ ok: true });
  });

  it('rejects retrying an item that is not queued', () => {
    expect(canRetryUpload('uploaded')).toEqual({
      ok: false,
      error: 'Only queued evidence can be retried',
    });
    expect(canRetryUpload('none')).toEqual({
      ok: false,
      error: 'Only queued evidence can be retried',
    });
  });
});
