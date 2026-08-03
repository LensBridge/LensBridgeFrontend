/**
 * Role helpers.
 *
 * The user object's shape depends on where it came from — `/auth/me` returns
 * `authorities: [{ authority }]` (Spring Security's serialization), the JWT
 * claim carries `roles: string[]`, and some older responses carry a bare
 * `role`. Rather than normalizing at every call site, check all three here.
 */

const ROOT = 'ROLE_ROOT';
const ADMIN = 'ROLE_ADMIN';

/** Every role name we can find on a user, uppercased and ROLE_-prefixed. */
function rolesOf(user) {
  if (!user) return [];

  const raw = [
    ...(Array.isArray(user.authorities) ? user.authorities.map(a => a?.authority) : []),
    ...(Array.isArray(user.roles) ? user.roles : []),
    user.role
  ];

  return raw
    .filter(Boolean)
    .map(r => String(r).toUpperCase())
    .map(r => (r.startsWith('ROLE_') ? r : `ROLE_${r}`));
}

/** ROOT is the only role allowed to touch board and device management. */
export function isRoot(user) {
  return rolesOf(user).includes(ROOT);
}

/** ROOT implies ADMIN — it's the strictly higher role, not a sibling. */
export function isAdmin(user) {
  const roles = rolesOf(user);
  return roles.includes(ADMIN) || roles.includes(ROOT);
}
