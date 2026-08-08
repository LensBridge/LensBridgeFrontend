/**
 * The permission catalog, mirrored from the backend's `Permission` enum.
 *
 * Authorization on the server is per-permission — every `@PreAuthorize` checks
 * `hasAuthority('domain:resource:verb')`, never a role name. Roles are only named
 * bundles. The console follows the same rule: gate on a permission, never on
 * "is this person ROOT".
 *
 * Two representations exist and they are not interchangeable:
 *
 *   - the **authority** string (`board:poster:write`) is what appears in
 *     `JwtResponse.permissions`, `TokenValidationResponse.permissions`, and
 *     `UserInfoResponse.effectivePermissions`. This is what you check against.
 *   - the **enum name** (`BOARD_POSTER_WRITE`) is what the grant and revoke
 *     endpoints accept as a request body.
 *
 * `GET /api/admin/permissions` returns both, so the grant picker should source
 * its list from there rather than from this file. The constants here exist for
 * compile-time-ish gating at call sites, where a live fetch would be absurd.
 */

/** Authority strings, keyed by the backend enum name. */
export const PERMISSIONS = {
  // Legacy media sharing
  MEDIA_UPLOAD_SELF: 'media:upload:self',
  MEDIA_UPLOAD_MODERATE: 'media:upload:moderate',
  MEDIA_UPLOAD_READ: 'media:upload:read',
  MEDIA_EVENT_WRITE: 'media:event:write',

  // Board content
  BOARD_CONTENT_READ: 'board:content:read',
  BOARD_POSTER_WRITE: 'board:poster:write',
  BOARD_EVENT_WRITE: 'board:event:write',
  BOARD_WEEKLY_WRITE: 'board:weekly:write',
  BOARD_TICKER_WRITE: 'board:ticker:write',

  // Board configuration
  BOARD_CONFIG_READ: 'board:config:read',
  BOARD_CONFIG_WRITE: 'board:config:write',
  BOARD_REFRESH: 'board:refresh',

  // Fleet
  BOARD_DEVICE_READ: 'board:device:read',
  BOARD_DEVICE_ENROLL: 'board:device:enroll',
  BOARD_DEVICE_REVOKE: 'board:device:revoke',
  BOARD_TELEMETRY_SUBSCRIBE: 'board:telemetry:subscribe',

  // Device commands, split by blast radius
  BOARD_COMMAND_BENIGN: 'board:command:benign',
  BOARD_COMMAND_DISRUPTIVE: 'board:command:disruptive',
  BOARD_COMMAND_INSPECT: 'board:command:inspect',

  // Identity and audit
  IAM_USER_READ: 'iam:user:read',
  IAM_USER_WRITE: 'iam:user:write',
  IAM_ROLE_GRANT: 'iam:role:grant',
  AUDIT_READ: 'audit:read',
};

/** Reverse lookup: authority string -> backend enum name, for grant/revoke bodies. */
export const PERMISSION_NAMES = Object.fromEntries(
  Object.entries(PERMISSIONS).map(([name, authority]) => [authority, name])
);

/**
 * Command kind -> the permission required to issue it, mirroring `CommandKind`
 * and `CommandRisk` on the server. The endpoint's `@PreAuthorize` resolves this
 * from the request body, so there is no single permission that gates the button —
 * each command has to be checked on its own.
 */
export const COMMAND_PERMISSIONS = {
  'chrome.reload': PERMISSIONS.BOARD_COMMAND_BENIGN,
  'config.refresh': PERMISSIONS.BOARD_COMMAND_BENIGN,
  'kiosk.restart': PERMISSIONS.BOARD_COMMAND_DISRUPTIVE,
  'system.reboot': PERMISSIONS.BOARD_COMMAND_DISRUPTIVE,
  'chrome.screenshot': PERMISSIONS.BOARD_COMMAND_INSPECT,
  'logs.tail': PERMISSIONS.BOARD_COMMAND_INSPECT,
};

/** Blast radius, for labelling the command UI. Mirrors `CommandRisk`. */
export const COMMAND_RISK = {
  [PERMISSIONS.BOARD_COMMAND_BENIGN]: 'benign',
  [PERMISSIONS.BOARD_COMMAND_DISRUPTIVE]: 'disruptive',
  [PERMISSIONS.BOARD_COMMAND_INSPECT]: 'inspect',
};

/**
 * Roles, for display only. Assignment options come from `GET /api/admin/roles`,
 * which carries each role's description and permission set; this map exists so a
 * role already on a user renders with the right emphasis before that fetch lands.
 */
export const ROLE_TONE = {
  ROOT: 'root',
  BOARD_ADMIN: 'elevated',
  BOARD_EDITOR: 'standard',
  BOARD_VIEWER: 'readonly',
  ADMIN: 'elevated',
  USER: 'standard',
};

/** Human labels for the `domain` field `GET /api/admin/permissions` returns. */
export const DOMAIN_LABELS = {
  board: 'MusallahBoard',
  media: 'Media sharing',
  iam: 'Identity & access',
  audit: 'Audit log',
};

/**
 * Short descriptions for the grant picker. Keyed by authority so an unknown
 * permission added server-side still renders — it just renders without a blurb,
 * rather than disappearing from the picker.
 */
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSIONS.MEDIA_UPLOAD_SELF]: 'Upload and manage your own media submissions',
  [PERMISSIONS.MEDIA_UPLOAD_MODERATE]: 'Approve, feature, and delete submissions',
  [PERMISSIONS.MEDIA_UPLOAD_READ]: 'Read the moderation queue and media events',
  [PERMISSIONS.MEDIA_EVENT_WRITE]: 'Create media events',

  [PERMISSIONS.BOARD_CONTENT_READ]: 'View posters, events, and weekly content',
  [PERMISSIONS.BOARD_POSTER_WRITE]: 'Create, edit, and delete posters',
  [PERMISSIONS.BOARD_EVENT_WRITE]: 'Create, edit, and delete calendar events',
  [PERMISSIONS.BOARD_WEEKLY_WRITE]: 'Edit weekly quotes and Jummah times',
  [PERMISSIONS.BOARD_TICKER_WRITE]: 'Edit the scrolling ticker copy',

  [PERMISSIONS.BOARD_CONFIG_READ]: 'View board configuration',
  [PERMISSIONS.BOARD_CONFIG_WRITE]: 'Change location, dark mode, and layout',
  [PERMISSIONS.BOARD_REFRESH]: 'Push a refresh to every board',

  [PERMISSIONS.BOARD_DEVICE_READ]: 'List devices, telemetry, and command history',
  [PERMISSIONS.BOARD_DEVICE_ENROLL]: 'Mint enrollment tokens — grants fleet access',
  [PERMISSIONS.BOARD_DEVICE_REVOKE]: 'Revoke an enrolled device',
  [PERMISSIONS.BOARD_TELEMETRY_SUBSCRIBE]: 'Stream live device telemetry',

  [PERMISSIONS.BOARD_COMMAND_BENIGN]: 'Reload Chrome, refresh config',
  [PERMISSIONS.BOARD_COMMAND_DISRUPTIVE]: 'Restart the kiosk, reboot hardware',
  [PERMISSIONS.BOARD_COMMAND_INSPECT]: 'Screenshot a display, tail device logs',

  [PERMISSIONS.IAM_USER_READ]: 'List users and their grants',
  [PERMISSIONS.IAM_USER_WRITE]: 'Create and verify users',
  [PERMISSIONS.IAM_ROLE_GRANT]: 'Grant roles and permissions to others',
  [PERMISSIONS.AUDIT_READ]: 'Read the audit log',
};

/**
 * Permissions whose grant is itself an escalation or a surveillance capability.
 * The picker flags these; the server enforces the actual rules (§6.5).
 */
export const SENSITIVE_PERMISSIONS = new Set([
  PERMISSIONS.IAM_ROLE_GRANT,
  PERMISSIONS.IAM_USER_WRITE,
  PERMISSIONS.BOARD_DEVICE_ENROLL,
  PERMISSIONS.BOARD_COMMAND_INSPECT,
  PERMISSIONS.BOARD_COMMAND_DISRUPTIVE,
]);

/** Any permission that should let someone through the board section at all. */
export const BOARD_SECTION_PERMISSIONS = [
  PERMISSIONS.BOARD_CONTENT_READ,
  PERMISSIONS.BOARD_CONFIG_READ,
  PERMISSIONS.BOARD_DEVICE_READ,
];

/**
 * Any permission that puts at least one tab on the admin console.
 *
 * Board permissions are deliberately absent: the console's tabs are uploads,
 * media events, audit, and users. A BOARD_VIEWER belongs at /admin/board, and
 * letting them past this gate would land them on a page with nothing on it.
 * A BOARD_ADMIN does get in — it carries `audit:read`, and the audit log now
 * covers the device actions it is responsible for.
 */
export const ADMIN_SECTION_PERMISSIONS = [
  PERMISSIONS.MEDIA_UPLOAD_READ,
  PERMISSIONS.MEDIA_UPLOAD_MODERATE,
  PERMISSIONS.MEDIA_EVENT_WRITE,
  PERMISSIONS.AUDIT_READ,
  PERMISSIONS.IAM_USER_READ,
];
