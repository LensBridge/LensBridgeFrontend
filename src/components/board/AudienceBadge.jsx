import Badge from '../ui/Badge';
import { AUDIENCE_LABELS } from '../../models/board';

/**
 * Audience is the single most important attribute of any piece of board
 * content — it decides which prayer room sees it — so it gets its own tone per
 * value rather than a shared neutral chip. `both` stays quiet: it is the
 * default, and the two that need to stand out are the ones that do not go
 * everywhere.
 */
const TONES = { brothers: 'cool', sisters: 'ember', both: 'quiet' };

export default function AudienceBadge({ audience, size = 'sm' }) {
  const key = String(audience ?? 'both').toLowerCase();
  return (
    <Badge tone={TONES[key] ?? 'neutral'} size={size}>
      {AUDIENCE_LABELS[key] ?? audience}
    </Badge>
  );
}
