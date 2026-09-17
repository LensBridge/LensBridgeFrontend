import { Crown } from 'lucide-react';
import { bareRoleName, roleTone, ROLE_TONE_CLASSES } from './roles';

function RoleBadge({ role }) {
  const tone = roleTone(role);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_TONE_CLASSES[tone]}`}
    >
      {tone === 'root' && <Crown className="h-3 w-3 mr-1" />}
      {bareRoleName(role)}
    </span>
  );
}

export default RoleBadge;
