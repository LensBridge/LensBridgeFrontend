/**
 * Pins the permission helpers.
 *
 * These are the foundation every gate in the console sits on, and the failure
 * mode is silent: a helper that quietly returns false hides working controls,
 * and one that quietly returns true renders buttons that 403. Neither shows up
 * as a crash.
 *
 * The cases that matter are the shape-normalization ones. `roles` and
 * `permissions` arrive as separate arrays from /auth/signin, but older stored
 * sessions carry a single flat `authorities` array with both in it, and the only
 * thing separating a role from a permission there is the `ROLE_` prefix.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isAdmin,
  isRoot,
  permissionsOf,
  rolesOf,
} from './auth.js';
import { PERMISSIONS } from './permissions.js';

/** What /auth/signin and /auth/validate-token return. */
const boardEditor = {
  roles: ['ROLE_BOARD_EDITOR'],
  permissions: [
    PERMISSIONS.BOARD_CONTENT_READ,
    PERMISSIONS.BOARD_CONFIG_READ,
    PERMISSIONS.BOARD_DEVICE_READ,
    PERMISSIONS.BOARD_TELEMETRY_SUBSCRIBE,
    PERMISSIONS.BOARD_POSTER_WRITE,
    PERMISSIONS.BOARD_EVENT_WRITE,
    PERMISSIONS.BOARD_WEEKLY_WRITE,
    PERMISSIONS.BOARD_TICKER_WRITE,
    PERMISSIONS.BOARD_REFRESH,
  ],
};

/** The legacy shape: one flat authority bag, roles and permissions mixed. */
const legacyAdmin = {
  authorities: [
    { authority: 'ROLE_ADMIN' },
    { authority: PERMISSIONS.MEDIA_UPLOAD_MODERATE },
    { authority: PERMISSIONS.AUDIT_READ },
  ],
};

test('permissionsOf keeps permissions and drops roles', () => {
  assert.deepEqual(permissionsOf(boardEditor).includes('ROLE_BOARD_EDITOR'), false);
  assert.equal(hasPermission(boardEditor, PERMISSIONS.BOARD_POSTER_WRITE), true);
});

test('permissionsOf reads the flat legacy authority bag', () => {
  assert.equal(hasPermission(legacyAdmin, PERMISSIONS.MEDIA_UPLOAD_MODERATE), true);
  assert.equal(permissionsOf(legacyAdmin).includes('ROLE_ADMIN'), false);
});

test('rolesOf does not mistake a permission for a role', () => {
  // Colons are not legal in a role name, which is what makes this cheap.
  assert.deepEqual(rolesOf(legacyAdmin), ['ROLE_ADMIN']);
});

test('rolesOf normalizes a bare role name', () => {
  assert.deepEqual(rolesOf({ roles: ['ROOT'] }), ['ROLE_ROOT']);
  assert.deepEqual(rolesOf({ role: 'admin' }), ['ROLE_ADMIN']);
});

test('an editor holds no command permissions', () => {
  // The whole point of the redesign: content people are not hardware people.
  for (const command of [
    PERMISSIONS.BOARD_COMMAND_BENIGN,
    PERMISSIONS.BOARD_COMMAND_DISRUPTIVE,
    PERMISSIONS.BOARD_COMMAND_INSPECT,
  ]) {
    assert.equal(hasPermission(boardEditor, command), false, command);
  }
  assert.equal(hasPermission(boardEditor, PERMISSIONS.BOARD_CONFIG_WRITE), false);
  assert.equal(hasPermission(boardEditor, PERMISSIONS.IAM_ROLE_GRANT), false);
});

test('hasAnyPermission and hasAllPermissions', () => {
  const some = [PERMISSIONS.BOARD_POSTER_WRITE, PERMISSIONS.IAM_ROLE_GRANT];
  assert.equal(hasAnyPermission(boardEditor, some), true);
  assert.equal(hasAllPermissions(boardEditor, some), false);
  assert.equal(
    hasAllPermissions(boardEditor, [
      PERMISSIONS.BOARD_POSTER_WRITE,
      PERMISSIONS.BOARD_EVENT_WRITE,
    ]),
    true
  );
});

test('empty and absent inputs are refused, not defaulted open', () => {
  assert.equal(hasPermission(null, PERMISSIONS.BOARD_POSTER_WRITE), false);
  assert.equal(hasPermission(boardEditor, undefined), false);
  assert.equal(hasAnyPermission(boardEditor, []), false);
  assert.equal(hasAllPermissions(boardEditor, []), false);
  assert.deepEqual(permissionsOf(undefined), []);
});

test('isAdmin accepts the permission, not just the legacy role', () => {
  // Mirrors AdminController's gate. A ROOT account holds media:upload:moderate
  // through its bundle without ever carrying ROLE_ADMIN, and refusing it there
  // is the bug that forced operators to hold two roles to do one job.
  assert.equal(isAdmin({ roles: ['ROLE_ADMIN'] }), true);
  assert.equal(isAdmin({ roles: ['ROLE_ROOT'] }), true);
  assert.equal(isAdmin({ permissions: [PERMISSIONS.MEDIA_UPLOAD_MODERATE] }), true);
  assert.equal(isAdmin(boardEditor), false);
});

test('isRoot is role-based and does not leak into board access', () => {
  assert.equal(isRoot({ roles: ['ROLE_ROOT'] }), true);
  assert.equal(isRoot(boardEditor), false);
  // A BOARD_ADMIN is not ROOT, but must still reach every board control.
  const boardAdmin = {
    roles: ['ROLE_BOARD_ADMIN'],
    permissions: [PERMISSIONS.BOARD_COMMAND_INSPECT, PERMISSIONS.BOARD_DEVICE_ENROLL],
  };
  assert.equal(isRoot(boardAdmin), false);
  assert.equal(hasPermission(boardAdmin, PERMISSIONS.BOARD_COMMAND_INSPECT), true);
});
