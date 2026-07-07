export type RouteStatus =
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'delayed'
  | 'cancelled';

export type TransitionResult = { ok: true } | { ok: false; error: string };

export function canStartRoute(
  status: RouteStatus,
  routeCollectorId: number,
  requestingCollectorId: number,
): TransitionResult {
  if (routeCollectorId !== requestingCollectorId) {
    return {
      ok: false,
      error: 'Only the assigned collector can start this route',
    };
  }
  if (status !== 'scheduled') {
    return { ok: false, error: `Cannot start a route that is ${status}` };
  }
  return { ok: true };
}

export function canSetDelayed(
  status: RouteStatus,
  reason: string,
): TransitionResult {
  if (!reason.trim()) {
    return { ok: false, error: 'A reason is required to delay a route' };
  }
  if (status === 'completed' || status === 'cancelled') {
    return { ok: false, error: `Cannot delay a route that is ${status}` };
  }
  return { ok: true };
}

export function canSetCancelled(
  status: RouteStatus,
  reason: string,
): TransitionResult {
  if (!reason.trim()) {
    return { ok: false, error: 'A reason is required to cancel a route' };
  }
  if (status === 'completed' || status === 'cancelled') {
    return { ok: false, error: `Cannot cancel a route that is ${status}` };
  }
  return { ok: true };
}

export function canCompleteRoute(status: RouteStatus): TransitionResult {
  if (status !== 'active') {
    return { ok: false, error: `Cannot complete a route that is ${status}` };
  }
  return { ok: true };
}
