export type PickupStatus = 'pending' | 'accepted' | 'on_the_way' | 'picked_up' | 'completed' | 'expired' | 'cancelled';

export type TransitionResult = { ok: true } | { ok: false; error: string };

export function canAcceptPickup(status: PickupStatus): TransitionResult {
  if (status !== 'pending') {
    return { ok: false, error: `Cannot accept a request that is ${status}` };
  }
  return { ok: true };
}

export function canDeclinePickup(status: PickupStatus, reason: string): TransitionResult {
  if (!reason.trim()) {
    return { ok: false, error: 'A reason is required to decline a pickup request' };
  }
  if (status !== 'pending') {
    return { ok: false, error: `Cannot decline a request that is ${status}` };
  }
  return { ok: true };
}

export function canMarkOnTheWay(status: PickupStatus): TransitionResult {
  if (status !== 'accepted') {
    return { ok: false, error: `Cannot mark on the way from ${status}` };
  }
  return { ok: true };
}

export function canMarkPickedUp(status: PickupStatus): TransitionResult {
  if (status !== 'on_the_way') {
    return { ok: false, error: `Cannot mark picked up from ${status}` };
  }
  return { ok: true };
}

export function canCancelPickup(status: PickupStatus): TransitionResult {
  if (status !== 'pending') {
    return { ok: false, error: `Cannot cancel a request that is ${status}` };
  }
  return { ok: true };
}
