/**
 * Role display helpers.
 *
 * Two spellings of a role name reach the console: `UserInfoResponse.roles` and
 * `GET /api/admin/roles` return the bare enum name (`BOARD_EDITOR`), while
 * stored sessions and Spring's authority list carry the `ROLE_` prefix. The
 * add-role and remove-role endpoints accept only the bare name, so normalizing
 * on the way in is cheaper than guessing at each call site.
 */

import { ROLE_TONE } from '../../utils/permissions';

/** `ROLE_BOARD_EDITOR` and `BOARD_EDITOR` both become `BOARD_EDITOR`. */
export function bareRoleName(role) {
  return String(role ?? '').replace(/^ROLE_/, '');
}

/** Badge classes per `ROLE_TONE`. */
export const ROLE_TONE_CLASSES = {
  root: 'bg-red-100 text-red-800',
  elevated: 'bg-purple-100 text-purple-800',
  standard: 'bg-blue-100 text-blue-800',
  readonly: 'bg-gray-100 text-gray-700',
};

/**
 * A role the server adds before the console is redeployed still renders, as a
 * plain badge rather than disappearing from the row.
 */
export function roleTone(role) {
  return ROLE_TONE[bareRoleName(role)] ?? 'standard';
}

/**
 * True if the caller could hand out or take away this whole bundle.
 *
 * Mirrors §6.5: a caller may not grant a permission they do not hold, and may
 * not remove one either — demotion is an escalation path of its own. Both rules
 * reduce to the same subset test, so both modals share this.
 */
export function canAssignRole(role, heldPermissions) {
  const held = new Set(heldPermissions);
  return (role.permissions ?? []).every((permission) => held.has(permission));
}
