import { Circle, Wifi, WifiOff, Ban, Usb } from 'lucide-react';

function DeviceStatusBadge({ status }) {
  const styles = {
    online: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700',
    offline: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700',
    revoked: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700',
    usb: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
  };
  const icons = {
    online: Wifi,
    offline: WifiOff,
    revoked: Ban,
    usb: Usb
  };
  const labels = { usb: 'USB only' };
  const Icon = icons[status] || Circle;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status] || styles.offline}`}>
      <Icon className="h-3.5 w-3.5" />
      {labels[status] || status || 'offline'}
    </span>
  );
}

export default DeviceStatusBadge;
