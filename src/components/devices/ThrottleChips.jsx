import { decodeThrottle } from '../../utils/throttle';
import Badge from '../ui/Badge';

/**
 * Raspberry Pi throttle flags.
 *
 * A flag that is *currently* asserted is a live fault; one that is only latched
 * happened at some point since boot and may be long over. Those are different
 * problems, so they get different tones — red for now, amber for once.
 */
export default function ThrottleChips({ value }) {
  if (value == null) return <span className="text-[12px] text-faint">No throttle data</span>;

  const flags = decodeThrottle(value);
  if (flags.length === 0) {
    return (
      <Badge tone="good" size="sm">
        Clear
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map((flag) => (
        <Badge key={flag.bit} tone={flag.current ? 'bad' : 'warn'} size="sm">
          {flag.label}
        </Badge>
      ))}
    </div>
  );
}
