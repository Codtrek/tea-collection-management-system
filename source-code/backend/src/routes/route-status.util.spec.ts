import {
  canCompleteRoute,
  canSetCancelled,
  canSetDelayed,
  canStartRoute,
} from './route-status.util';

describe('canStartRoute', () => {
  it('allows the assigned collector to start a scheduled route', () => {
    expect(canStartRoute('scheduled', 1, 1)).toEqual({ ok: true });
  });

  it('rejects a different collector starting the route', () => {
    expect(canStartRoute('scheduled', 1, 2)).toEqual({
      ok: false,
      error: 'Only the assigned collector can start this route',
    });
  });

  it('rejects starting a route that is already active', () => {
    expect(canStartRoute('active', 1, 1)).toEqual({
      ok: false,
      error: 'Cannot start a route that is active',
    });
  });
});

describe('canSetDelayed', () => {
  it('requires a reason', () => {
    expect(canSetDelayed('scheduled', '')).toEqual({
      ok: false,
      error: 'A reason is required to delay a route',
    });
  });

  it('rejects delaying a completed route', () => {
    expect(canSetDelayed('completed', 'Heavy rain')).toEqual({
      ok: false,
      error: 'Cannot delay a route that is completed',
    });
  });

  it('allows delaying with a reason', () => {
    expect(canSetDelayed('active', 'Heavy rain')).toEqual({ ok: true });
  });
});

describe('canSetCancelled', () => {
  it('requires a reason', () => {
    expect(canSetCancelled('scheduled', '   ')).toEqual({
      ok: false,
      error: 'A reason is required to cancel a route',
    });
  });

  it('rejects cancelling an already cancelled route', () => {
    expect(canSetCancelled('cancelled', 'Road closed')).toEqual({
      ok: false,
      error: 'Cannot cancel a route that is cancelled',
    });
  });
});

describe('canCompleteRoute', () => {
  it('only allows completing an active route', () => {
    expect(canCompleteRoute('scheduled')).toEqual({
      ok: false,
      error: 'Cannot complete a route that is scheduled',
    });
    expect(canCompleteRoute('active')).toEqual({ ok: true });
  });
});
