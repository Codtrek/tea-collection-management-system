import type { PortalRole, SystemUserActions } from './admin-map';

/**
 * Users & Roles safety rules (Users-Roles-Addendum §5) — pure, so the service, the list's
 * per-row "why is this disabled" reasons and the tests all share one source of truth.
 * Every function answers `null` when allowed, else the human reason it isn't.
 */

export interface RuleActor {
  id: number;
  role: PortalRole;
}

export interface RuleTarget {
  id: number;
  role: PortalRole;
  active: boolean;
  locked: boolean;
}

/** Roles the actor may assign when creating or editing a user. Only an Administrator manages users. */
export function assignableRoles(actor: RuleActor): PortalRole[] {
  return actor.role === 'Administrator'
    ? ['Administrator', 'Manager', 'Officer']
    : [];
}

export function manageRefusal(actor: RuleActor): string | null {
  return actor.role === 'Administrator'
    ? null
    : 'Only an Administrator can manage users.';
}

/** Creating (or assigning) a role. */
export function assignRoleRefusal(
  actor: RuleActor,
  role: PortalRole,
): string | null {
  if (role === 'Administrator' && actor.role !== 'Administrator') {
    return 'Only an Administrator can create or change Administrators.';
  }
  if (!assignableRoles(actor).includes(role)) {
    return `You can’t assign the ${role} role.`;
  }
  return null;
}

/** Editing name / phone / email. */
export function editRefusal(
  actor: RuleActor,
  target: RuleTarget,
): string | null {
  const m = manageRefusal(actor);
  if (m) return m;
  if (target.role === 'Administrator' && actor.role !== 'Administrator') {
    return 'Only an Administrator can change an Administrator.';
  }
  return null;
}

/**
 * Changing a user's role. `activeAdmins` = active Administrators right now (including the target
 * when it is one).
 */
export function roleChangeRefusal(
  actor: RuleActor,
  target: RuleTarget,
  newRole: PortalRole | null,
  activeAdmins: number,
): string | null {
  const e = editRefusal(actor, target);
  if (e) return e;
  if (actor.id === target.id) return 'You can’t change your own role.';
  if (newRole !== null) {
    const a = assignRoleRefusal(actor, newRole);
    if (a) return a;
  }
  if (
    target.role === 'Administrator' &&
    target.active &&
    newRole !== 'Administrator' &&
    activeAdmins <= 1
  ) {
    return 'This is the last active Administrator; make another user an Administrator first.';
  }
  return null;
}

export function deactivateRefusal(
  actor: RuleActor,
  target: RuleTarget,
  activeAdmins: number,
): string | null {
  const e = editRefusal(actor, target);
  if (e) return e;
  if (actor.id === target.id) return 'You can’t deactivate your own account.';
  if (!target.active) return 'This user is already inactive.';
  if (target.role === 'Administrator' && activeAdmins <= 1) {
    return 'This is the last active Administrator; it can’t be deactivated.';
  }
  return null;
}

export function reactivateRefusal(
  actor: RuleActor,
  target: RuleTarget,
): string | null {
  const e = editRefusal(actor, target);
  if (e) return e;
  if (actor.id === target.id) return 'You can’t change your own status.';
  if (target.active) return 'This user is already active.';
  return null;
}

export function resetRefusal(
  actor: RuleActor,
  target: RuleTarget,
): string | null {
  const e = editRefusal(actor, target);
  if (e) return e;
  if (actor.id === target.id) {
    return 'Change your own password from your profile instead.';
  }
  if (!target.active) return 'Reactivate the user first.';
  return null;
}

export function unlockRefusal(
  actor: RuleActor,
  target: RuleTarget,
): string | null {
  const e = editRefusal(actor, target);
  if (e) return e;
  if (!target.locked) return 'This account isn’t locked.';
  return null;
}

/** Everything the System Users row needs to enable / disable (with the reason) its controls. */
export function actionsFor(
  actor: RuleActor,
  target: RuleTarget,
  activeAdmins: number,
): SystemUserActions {
  return {
    edit: editRefusal(actor, target),
    changeRole: roleChangeRefusal(actor, target, null, activeAdmins),
    deactivate: deactivateRefusal(actor, target, activeAdmins),
    reactivate: reactivateRefusal(actor, target),
    resetPassword: resetRefusal(actor, target),
    unlock: unlockRefusal(actor, target),
  };
}
