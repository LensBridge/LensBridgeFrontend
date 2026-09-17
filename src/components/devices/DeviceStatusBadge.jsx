import { Circle, Wifi, WifiOff, Ban } from 'lucide-react';

function DeviceStatusBadge({ status }) {
  const styles = {
    online: 'bg-green-100 text-green-700 border-green-200',
    offline: 'bg-gray-100 text-gray-700 border-gray-200',
    revoked: 'bg-red-100 text-red-700 border-red-200'
  };
  const icons = {
    online: Wifi,
    offline: WifiOff,
    revoked: Ban
  };
  const Icon = icons[status] || Circle;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.offline}`}>
      <Icon className="h-3.5 w-3.5" />
      {status || 'offline'}
    </span>
  );
}

export default DeviceStatusBadge;
