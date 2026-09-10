/**
 * Audit log display maps.
 *
 * Every `AuditAction` the server can emit is listed explicitly rather than
 * matched on a prefix. A new action that nobody added here renders in the
 * neutral tone, which is visible as an omission; a prefix rule would quietly
 * colour `REVOKE_PERMISSION` the same as `REVOKE_DEVICE` and hide the fact that
 * one of them is an escalation event.
 */

/**
 * Tone -> the `<Badge>` tone that renders it.
 *
 * Four categories, not four decorations. `destructive` is the only one that
 * gets a red, and it covers every action that removed something — an upload, a
 * role, a device. Scanning the log for red is how you find what went away.
 */
export const AUDIT_TONE_BADGE = {
  content: 'cool',
  destructive: 'bad',
  fleet: 'ember',
  access: 'warn',
  neutral: 'quiet',
};

const AUDIT_ACTION_TONES = {
  APPROVE_UPLOAD: 'content',
  UNAPPROVE_UPLOAD: 'destructive',
  DELETE_UPLOAD: 'destructive',
  FEATURE_UPLOAD: 'content',
  UNFEATURE_UPLOAD: 'destructive',

  CREATE_EVENT: 'content',
  UPDATE_EVENT: 'content',
  DELETE_EVENT: 'destructive',
  CREATE_CALENDAR_EVENT: 'content',
  UPDATE_CALENDAR_EVENT: 'content',
  DELETE_CALENDAR_EVENT: 'destructive',
  CREATE_POSTER: 'content',
  UPDATE_POSTER: 'content',
  DELETE_POSTER: 'destructive',
  SAVE_WEEKLY_CONTENT: 'content',
  DELETE_WEEKLY_CONTENT: 'destructive',
  UPDATE_BOARD_TICKER: 'content',

  UPDATE_BOARD_CONFIG: 'fleet',
  REFRESH_BOARDS: 'fleet',
  ISSUE_ENROLLMENT_TOKEN: 'access',
  REVOKE_DEVICE: 'destructive',
  ISSUE_DEVICE_COMMAND: 'fleet',

  PROMOTE_USER: 'access',
  DEMOTE_USER: 'destructive',
  DISABLE_USER: 'destructive',
  ENABLE_USER: 'access',
  VERIFY_USER: 'access',
  UNVERIFY_USER: 'destructive',
  RESET_USER_PASSWORD: 'access',
  TRIGGER_PASSWORD_RESET_EMAIL: 'access',
  ADD_USER_ROLE: 'access',
  REMOVE_USER_ROLE: 'destructive',
  GRANT_PERMISSION: 'access',
  REVOKE_PERMISSION: 'destructive',
  ADD_USER: 'access',
  REMOVE_USER: 'destructive',
  UPDATE_USER: 'access',

  VIEW_AUDIT_LOGS: 'neutral',
  EXPORT_DATA: 'neutral',
  SYSTEM_MAINTENANCE: 'neutral',
};

export function auditActionTone(action) {
  return AUDIT_ACTION_TONES[action] ?? 'neutral';
}

/** Human labels for `AuditEntityType`. */
export const AUDIT_ENTITY_LABELS = {
  USER: 'User',
  UPLOAD: 'Upload',
  MUSALLAH_BOARD: 'Board',
  DEVICE: 'Device',
  EVENT: 'Event',
};

/**
 * `ADD_USER_ROLE` -> `Add user role`.
 *
 * The enum name is what the server filters on and what an operator will quote
 * in a ticket, so the raw value stays available; this is only for the places
 * where a row of SHOUTING_CONSTANTS would be the whole visual texture of the
 * page.
 */
export function describeAction(action) {
  if (!action) return 'Unknown';
  const words = String(action).toLowerCase().split('_');
  return words[0].charAt(0).toUpperCase() + words[0].slice(1) + (words.length > 1 ? ' ' + words.slice(1).join(' ') : '');
}
