import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Monitor, Plus, RefreshCcw, Thermometer, WifiOff } from 'lucide-react';
import { useDeviceList } from '../hooks/useDeviceList';
import Can from '../components/Can';
import DeviceStatusBadge from '../components/devices/DeviceStatusBadge';
import { audienceLabel, formatRelativeTime } from '../utils/deviceStatus';
import { PERMISSIONS } from '../utils/permissions';

function DeviceList() {
  const { devices, loading, error, live, refetch } = useDeviceList();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-indigo-600" />
              <h1 className="text-2xl font-semibold text-gray-900">Board Devices</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">Live enrollment, telemetry, and command control for MusallahBoard agents.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={refetch} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
          <Can permission={PERMISSIONS.BOARD_DEVICE_ENROLL}>
            <Link to="/admin/devices/enroll" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              Enroll new device
            </Link>
          </Can>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!live && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          Live telemetry is off — this account doesn&apos;t hold
          <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">board:telemetry:subscribe</code>.
          The table refreshes on a timer instead.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Device</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Audience</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Last heartbeat</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">CPU</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-gray-500">Loading devices...</td></tr>
              ) : devices.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-12 text-center text-gray-500">No devices enrolled yet.</td></tr>
              ) : devices.map((device) => (
                <tr key={device.id} onClick={() => navigate(`/admin/devices/${device.id}`)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900">{device.displayName}</div>
                    <div className="font-mono text-xs text-gray-500">{device.id}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700">{audienceLabel(device.audience)}</td>
                  <td className="px-5 py-4"><DeviceStatusBadge status={device.status} /></td>
                  <td className="px-5 py-4 text-sm text-gray-700">{formatRelativeTime(device.lastHeartbeat)}</td>
                  <td className="px-5 py-4 text-sm text-gray-700">
                    <span className="inline-flex items-center gap-1">
                      <Thermometer className="h-4 w-4 text-gray-400" />
                      {device.telemetry?.cpuTempC ? `${device.telemetry.cpuTempC} C` : 'Unknown'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-700">{device.agentVersion || 'Unknown'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DeviceList;
