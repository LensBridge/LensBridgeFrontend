const HEARTBEAT_STALE_MS = 90 * 1000;

export const TERMINAL_COMMAND_STATUSES = new Set([
  'SUCCEEDED',
  'FAILED',
  'TIMEOUT',
  'REJECTED',
  'EXPIRED'
]);

export function isHeartbeatFresh(isoString) {
  if (!isoString) return false;
  const time = new Date(isoString).getTime();
  return Number.isFinite(time) && Date.now() - time < HEARTBEAT_STALE_MS;
}

export function getDeviceStatus(device, lifecycle = {}) {
  if (device?.revokedAt) return 'revoked';
  if (lifecycle.online === false) return 'offline';
  if (lifecycle.online === true && isHeartbeatFresh(lifecycle.lastHeartbeat || device?.lastHeartbeat)) return 'online';
  if (isHeartbeatFresh(device?.lastHeartbeat)) return 'online';
  return 'offline';
}

export function formatRelativeTime(isoString) {
  if (!isoString) return 'Never';
  const time = new Date(isoString).getTime();
  if (!Number.isFinite(time)) return 'Unknown';

  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDateTime(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

export function audienceLabel(audience) {
  if (audience === 'BROTHERS') return 'Brothers';
  if (audience === 'SISTERS') return 'Sisters';
  return 'Both';
}
