/**
 * Audit log display maps.
 *
 * Every `AuditAction` the server can emit is listed explicitly rather than
 * matched on a prefix. A new action that nobody added here renders in the
 * neutral tone, which is visible as an omission; a prefix rule would quietly
 * colour `REVOKE_PERMISSION` the same as `REVOKE_DEVICE` and hide the fact that
 * one of them is an escalation event.
 */

/** Badge classes per tone. */
export const AUDIT_TONE_CLASSES = {
  content: 'bg-blue-100 text-blue-800',
  destructive: 'bg-red-100 text-red-800',
  fleet: 'bg-indigo-100 text-indigo-800',
  access: 'bg-amber-100 text-amber-800',
  neutral: 'bg-gray-100 text-gray-700',
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
