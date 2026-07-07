import {
  DEFAULT_WEIGHT_MISMATCH_THRESHOLD_KG,
  canConfirmOwner,
  canReceiveCollection,
  isWeightMismatch,
  validateWeightKg,
} from './collection-status.util';

describe('validateWeightKg', () => {
  it('accepts a positive weight', () => {
    expect(validateWeightKg(12.5)).toEqual({ ok: true });
  });

  it('rejects zero and negative weights', () => {
    expect(validateWeightKg(0)).toEqual({
      ok: false,
      error: 'Weight must be greater than zero',
    });
    expect(validateWeightKg(-3)).toEqual({
      ok: false,
      error: 'Weight must be greater than zero',
    });
  });

  it('rejects non-numeric weights', () => {
    expect(validateWeightKg(Number.NaN)).toEqual({
      ok: false,
      error: 'Weight must be a number',
    });
  });
});

describe('canConfirmOwner', () => {
  it('allows confirming an unconfirmed record', () => {
    expect(canConfirmOwner(false)).toEqual({ ok: true });
  });

  it('rejects confirming twice', () => {
    expect(canConfirmOwner(true)).toEqual({
      ok: false,
      error: 'This record is already confirmed by the owner',
    });
  });
});

describe('canReceiveCollection', () => {
  it('allows receiving a record not yet received', () => {
    expect(canReceiveCollection(false)).toEqual({ ok: true });
  });

  it('rejects receiving the same record twice', () => {
    expect(canReceiveCollection(true)).toEqual({
      ok: false,
      error: 'This record has already been received at the factory',
    });
  });
});

describe('isWeightMismatch', () => {
  it('is false at or within the threshold', () => {
    expect(isWeightMismatch(100, 100)).toBe(false);
    expect(
      isWeightMismatch(100, 100 - DEFAULT_WEIGHT_MISMATCH_THRESHOLD_KG),
    ).toBe(false);
  });

  it('is true beyond the threshold in either direction', () => {
    expect(isWeightMismatch(100, 97.9)).toBe(true);
    expect(isWeightMismatch(97.9, 100)).toBe(true);
  });

  it('respects a custom threshold', () => {
    expect(isWeightMismatch(100, 99.5, 0.4)).toBe(true);
    expect(isWeightMismatch(100, 99.5, 0.6)).toBe(false);
  });
});
