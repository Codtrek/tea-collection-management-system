import { canSetCancelled, canSetDelayed, canStartRoute, canCompleteRoute } from '../routeStatus';

describe('canStartRoute', () => {
  test('allows the assigned collector to start a scheduled route', () => {
    expect(canStartRoute('scheduled', 'collector-1', 'collector-1')).toEqual({ ok: true });
  });

  test('rejects a different collector starting the route', () => {
    const result = canStartRoute('scheduled', 'collector-1', 'collector-2');
    expect(result).toEqual({ ok: false, error: 'Only the assigned collector can start this route' });
  });

  test('rejects starting a route that is already active', () => {
    const result = canStartRoute('active', 'collector-1', 'collector-1');
    expect(result).toEqual({ ok: false, error: 'Cannot start a route that is active' });
  });
});

describe('canSetDelayed', () => {
  test('allows delaying a scheduled route with a reason', () => {
    expect(canSetDelayed('scheduled', 'Heavy rain')).toEqual({ ok: true });
  });

  test('rejects delaying without a reason', () => {
    const result = canSetDelayed('active', '');
    expect(result).toEqual({ ok: false, error: 'A reason is required to delay a route' });
  });

  test('rejects delaying a completed route', () => {
    const result = canSetDelayed('completed', 'Heavy rain');
    expect(result).toEqual({ ok: false, error: 'Cannot delay a route that is completed' });
  });
});

describe('canSetCancelled', () => {
  test('allows cancelling an active route with a reason', () => {
    expect(canSetCancelled('active', 'Vehicle breakdown')).toEqual({ ok: true });
  });

  test('rejects cancelling without a reason', () => {
    const result = canSetCancelled('scheduled', '   ');
    expect(result).toEqual({ ok: false, error: 'A reason is required to cancel a route' });
  });

  test('rejects cancelling an already cancelled route', () => {
    const result = canSetCancelled('cancelled', 'Road closed');
    expect(result).toEqual({ ok: false, error: 'Cannot cancel a route that is cancelled' });
  });
});

describe('canCompleteRoute', () => {
  test('allows completing an active route', () => {
    expect(canCompleteRoute('active')).toEqual({ ok: true });
  });

  test('rejects completing a route that is not active', () => {
    const result = canCompleteRoute('scheduled');
    expect(result).toEqual({ ok: false, error: 'Cannot complete a route that is scheduled' });
  });
});
