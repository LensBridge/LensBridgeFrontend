import { Ban, Circle, Wifi, WifiOff } from 'lucide-react';
import Badge from '../ui/Badge';

const TONES = { online: 'good', offline: 'quiet', revoked: 'bad' };
const ICONS = { online: Wifi, offline: WifiOff, revoked: Ban };

export default function DeviceStatusBadge({ status, size }) {
  return (
    <Badge tone={TONES[status] ?? 'quiet'} size={size} icon={ICONS[status] ?? Circle}>
      {status || 'offline'}
    </Badge>
  );
}
