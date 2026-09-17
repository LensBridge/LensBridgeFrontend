/**
 * Authorization helpers.
 *
 * The server checks permissions, not roles — every `@PreAuthorize` is
 * `hasAuthority('domain:resource:verb')`. The console mirrors that: gate on the
 * permission a control actually needs, so a BOARD_EDITOR sees the poster editor
 * without also being handed the reboot button.
 *
 * Hidden controls are UX, not security. The server check stays authoritative;
 * this only stops us rendering buttons that were always going to 403.
 *
 * The user object's shape depends on where it came from — `/auth/signin` and
 * `/auth/validate-token` both return `roles: string[]` plus `permissions:
 * string[]`, while some older stored sessions carry `authorities: [{ authority }]`
 * or a bare `role`. Rather than normalizing at every call site, read all of them
 * here.
 */

// Extension is explicit so this module loads under bare Node for auth.test.mjs.
import { PERMISSIONS } from './permissions.js';

const ROOT = 'ROLE_ROOT';
const ADMIN = 'ROLE_ADMIN';

/**
 * Every authority on the user, unmodified. This is a flat bag containing both
 * `ROLE_*` entries and permission strings, because that is how Spring serializes
 * `authorities` and how older sessions were stored.
 */
function authoritiesOf(user) {
  if (!user) return [];

  return [
    ...(Array.isArray(user.authorities) ? user.authorities.map((a) => a?.authority) : []),
    ...(Array.isArray(user.permissions) ? user.permissions : []),
    ...(Array.isArray(user.effectivePermissions) ? user.effectivePermissions : []),
    ...(Array.isArray(user.roles) ? user.roles : []),
    user.role,
  ].filter(Boolean);
}

/**
 * The user's effective permissions as authority strings.
 *
 * Permissions are distinguished from roles by the absence of a `ROLE_` prefix —
 * that is the same discriminator the backend uses when it splits the authority
 * list into `roles` and `permissions` on sign-in.
 */
export function permissionsOf(user) {
  return authoritiesOf(user)
    .map(String)
    .filter((a) => !a.startsWith('ROLE_'));
}

/** Every role name on the user, uppercased and `ROLE_`-prefixed. */
export function rolesOf(user) {
  if (!user) return [];

  const raw = [
    ...(Array.isArray(user.authorities) ? user.authorities.map((a) => a?.authority) : []),
    ...(Array.isArray(user.roles) ? user.roles : []),
    user.role,
  ];

  return raw
    .filter(Boolean)
    .map((r) => String(r).toUpperCase())
    // A permission string can reach `authorities` on an older stored session;
    // colons are not legal in a role name, so they identify one cheaply.
    .filter((r) => !r.includes(':'))
    .map((r) => (r.startsWith('ROLE_') ? r : `ROLE_${r}`));
}

/** True if the user holds this exact permission. */
export function hasPermission(user, permission) {
  if (!permission) return false;
  return permissionsOf(user).includes(permission);
}

/** True if the user holds at least one of these permissions. */
export function hasAnyPermission(user, permissions) {
  if (!Array.isArray(permissions) || permissions.length === 0) return false;
  const held = new Set(permissionsOf(user));
  return permissions.some((p) => held.has(p));
}

/** True if the user holds every one of these permissions. */
export function hasAllPermissions(user, permissions) {
  if (!Array.isArray(permissions) || permissions.length === 0) return false;
  const held = new Set(permissionsOf(user));
  return permissions.every((p) => held.has(p));
}

/**
 * ROOT, by role name.
 *
 * Kept for the few places that genuinely mean "the apex account" — badges, and
 * the copy explaining why a grant was refused. It is **not** an authorization
 * check: use `hasPermission` for those. Gating on this is what made every board
 * feature ROOT-only in the first place.
 */
export function isRoot(user) {
  return rolesOf(user).includes(ROOT);
}

/**
 * Whether the user can reach the media moderation console.
 *
 * Mirrors `AdminController`'s class-level gate, which accepts the legacy role or
 * the permission — a ROOT account holds `media:upload:moderate` through its
 * bundle without ever carrying `ROLE_ADMIN`.
 */
export function isAdmin(user) {
  const roles = rolesOf(user);
  return (
    roles.includes(ADMIN) ||
    roles.includes(ROOT) ||
    hasPermission(user, PERMISSIONS.MEDIA_UPLOAD_MODERATE)
  );
}
