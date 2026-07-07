import {
  canAcceptPickup,
  canCancelPickup,
  canDeclinePickup,
  canMarkOnTheWay,
  canMarkPickedUp,
} from './pickup-status.util';

describe('canAcceptPickup', () => {
  it('allows accepting a pending request', () => {
    expect(canAcceptPickup('pending')).toEqual({ ok: true });
  });

  it('rejects accepting a request that is not pending', () => {
    expect(canAcceptPickup('accepted')).toEqual({
      ok: false,
      error: 'Cannot accept a request that is accepted',
    });
  });
});

describe('canDeclinePickup', () => {
  it('requires a reason', () => {
    expect(canDeclinePickup('pending', '')).toEqual({
      ok: false,
      error: 'A reason is required to decline a pickup request',
    });
  });

  it('allows declining a pending request with a reason', () => {
    expect(canDeclinePickup('pending', 'Truck full')).toEqual({ ok: true });
  });
});

describe('canMarkOnTheWay', () => {
  it('only allows from accepted', () => {
    expect(canMarkOnTheWay('accepted')).toEqual({ ok: true });
    expect(canMarkOnTheWay('pending')).toEqual({
      ok: false,
      error: 'Cannot mark on the way from pending',
    });
  });
});

describe('canMarkPickedUp', () => {
  it('only allows from on_the_way', () => {
    expect(canMarkPickedUp('on_the_way')).toEqual({ ok: true });
    expect(canMarkPickedUp('accepted')).toEqual({
      ok: false,
      error: 'Cannot mark picked up from accepted',
    });
  });
});

describe('canCancelPickup', () => {
  it('only allows cancelling a pending request', () => {
    expect(canCancelPickup('pending')).toEqual({ ok: true });
    expect(canCancelPickup('accepted')).toEqual({
      ok: false,
      error: 'Cannot cancel a request that is accepted',
    });
  });
});
