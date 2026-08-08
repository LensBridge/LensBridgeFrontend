import { auditActionTone, AUDIT_TONE_CLASSES } from './audit';

function AuditActionBadge({ action }) {
  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded ${AUDIT_TONE_CLASSES[auditActionTone(action)]}`}
    >
      {action}
    </span>
  );
}

export default AuditActionBadge;
