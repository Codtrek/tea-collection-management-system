import {
  DEFAULT_WEIGHT_MISMATCH_THRESHOLD_KG,
  canConfirmOwner,
  canReceiveCollection,
  isWeightMismatch,
  validateWeightKg,
} from '../collectionRecord';

describe('validateWeightKg', () => {
  test('accepts a positive weight', () => {
    expect(validateWeightKg(12.5)).toEqual({ ok: true });
  });

  test('rejects zero', () => {
    expect(validateWeightKg(0)).toEqual({ ok: false, error: 'Weight must be greater than zero' });
  });

  test('rejects negative weight', () => {
    expect(validateWeightKg(-3)).toEqual({ ok: false, error: 'Weight must be greater than zero' });
  });

  test('rejects a non-numeric weight', () => {
    expect(validateWeightKg(Number.NaN)).toEqual({ ok: false, error: 'Weight must be a number' });
    expect(validateWeightKg(Number.POSITIVE_INFINITY)).toEqual({ ok: false, error: 'Weight must be a number' });
  });
});

describe('canConfirmOwner', () => {
  test('allows confirming an unconfirmed record', () => {
    expect(canConfirmOwner(false)).toEqual({ ok: true });
  });

  test('rejects confirming twice', () => {
    expect(canConfirmOwner(true)).toEqual({ ok: false, error: 'This record is already confirmed by the owner' });
  });
});

describe('canReceiveCollection', () => {
  test('allows receiving a record not yet received', () => {
    expect(canReceiveCollection(false)).toEqual({ ok: true });
  });

  test('rejects receiving the same record twice', () => {
    expect(canReceiveCollection(true)).toEqual({ ok: false, error: 'This record has already been received at the factory' });
  });
});

describe('isWeightMismatch', () => {
  test('no mismatch when weights are equal', () => {
    expect(isWeightMismatch(100, 100)).toBe(false);
  });

  test('no mismatch when difference is within the threshold', () => {
    expect(isWeightMismatch(100, 98.5)).toBe(false);
    expect(isWeightMismatch(98.5, 100)).toBe(false);
  });

  test('no mismatch when difference equals the threshold exactly', () => {
    expect(isWeightMismatch(100, 100 - DEFAULT_WEIGHT_MISMATCH_THRESHOLD_KG)).toBe(false);
  });

  test('mismatch when difference exceeds the threshold in either direction', () => {
    expect(isWeightMismatch(100, 97.9)).toBe(true);
    expect(isWeightMismatch(97.9, 100)).toBe(true);
  });

  test('respects a custom threshold', () => {
    expect(isWeightMismatch(100, 99.5, 0.4)).toBe(true);
    expect(isWeightMismatch(100, 99.5, 0.6)).toBe(false);
  });
});
