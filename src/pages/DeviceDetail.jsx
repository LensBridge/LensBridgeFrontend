import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Ban, ChevronLeft, Loader2, Monitor, RefreshCcw, Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../hooks/useDevice';
import { upsertCommand, useCommandStream } from '../hooks/useCommandStream';
import DeviceService from '../services/DeviceService';
import DeviceStatusBadge from '../components/devices/DeviceStatusBadge';
import TelemetryPanel from '../components/devices/TelemetryPanel';
import CommandLauncher from '../components/devices/CommandLauncher';
import CommandRow from '../components/devices/CommandRow';
import DeviceBoardConfig from '../components/devices/DeviceBoardConfig';
import { audienceLabel, formatDateTime, formatRelativeTime } from '../utils/deviceStatus';

function hasRootPermissions(user) {
  return Boolean(
    user?.authorities?.some((auth) => auth.authority === 'ROLE_ROOT') ||
    user?.roles?.some((role) => role === 'ROLE_ROOT' || role === 'ROOT') ||
    user?.role === 'ROLE_ROOT'
  );
}

function DeviceDetail() {
  const { deviceId } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const { device, telemetrySamples, loading, error, refetch } = useDevice(deviceId);
  const { commands, loading: commandsLoading, error: commandsError, refetch: refetchCommands, setCommands } = useCommandStream(deviceId);
  const [showRevoke, setShowRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  const handleIssued = (issued) => {
    setCommands((prev) => upsertCommand(prev, {
      id: issued.commandId,
      commandId: issued.commandId,
      deviceId: issued.deviceId,
      kind: issued.kind,
      status: issued.status,
      issuedAt: issued.issuedAt,
      issuedBy: user?.email || 'You',
      payload: null,
      deadlineMs: 30000,
      deliveredAt: null,
      ackedAt: null,
      startedAt: null,
      finishedAt: null,
      output: null,
      errorMessage: null
    }));
  };

  const revokeDevice = async () => {
    try {
      setRevoking(true);
      setRevokeError('');
      await DeviceService.revokeDevice(deviceId);
      setShowRevoke(false);
      await refetch();
    } catch (err) {
      setRevokeError(err.message || 'Failed to revoke device');
    } finally {
      setRevoking(false);
    }
  };

  if (!authLoading && !hasRootPermissions(user)) {
    return (
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">ROOT access required</h2>
        <Link to="/admin/devices" className="mt-6 inline-flex rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">Back to Devices</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="py-16 text-center text-gray-500">Loading device...</div>;
  }

  if (error || !device) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error || 'Device not found'}
        <div><Link to="/admin/devices" className="mt-4 inline-flex text-sm font-semibold text-red-800 underline">Back to Devices</Link></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/devices" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Monitor className="h-5 w-5 text-indigo-600" />
              <h1 className="text-2xl font-semibold text-gray-900">{device.displayName}</h1>
              <DeviceStatusBadge status={device.status} />
            </div>
            <p className="mt-1 font-mono text-sm text-gray-500">{device.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { refetch(); refetchCommands(); }} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCcw className="h-4 w-4" />
            Sync
          </button>
          <button type="button" onClick={() => setShowRevoke(true)} disabled={Boolean(device.revokedAt)} className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
            <Ban className="h-4 w-4" />
            Revoke device
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Server className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Identity & Status</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-sm text-gray-500">Audience</div><div className="mt-1 font-medium text-gray-900">{audienceLabel(device.audience)}</div></div>
          <div><div className="text-sm text-gray-500">Hardware</div><div className="mt-1 font-medium text-gray-900">{device.hardwareModel || 'Unknown'}</div></div>
          <div><div className="text-sm text-gray-500">Agent</div><div className="mt-1 font-medium text-gray-900">{device.agentVersion || 'Unknown'}</div></div>
          <div><div className="text-sm text-gray-500">Last seen</div><div className="mt-1 font-medium text-gray-900">{formatRelativeTime(device.lastHeartbeat)}</div></div>
          <div><div className="text-sm text-gray-500">IP</div><div className="mt-1 font-medium text-gray-900">{device.lastSeenIp || 'Unknown'}</div></div>
          <div><div className="text-sm text-gray-500">Enrolled</div><div className="mt-1 font-medium text-gray-900">{formatDateTime(device.enrolledAt)}</div></div>
          <div><div className="text-sm text-gray-500">Revoked</div><div className="mt-1 font-medium text-gray-900">{device.revokedAt ? formatDateTime(device.revokedAt) : 'No'}</div></div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Live Telemetry</h2>
          <p className="text-sm text-gray-500">Patched by `/topic/devices/{deviceId}` heartbeat events.</p>
        </div>
        <TelemetryPanel device={device} samples={telemetrySamples} />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Commands</h2>
          <p className="mt-1 text-sm text-gray-500">Issue commands and watch lifecycle updates from the agent.</p>
          <div className="mt-4">
            <CommandLauncher deviceId={deviceId} onIssued={handleIssued} disabled={Boolean(device.revokedAt)} />
          </div>
        </div>

        {commandsError && <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{commandsError}</div>}
        <div>
          {commandsLoading ? (
            <div className="px-4 py-10 text-center text-gray-500">Loading commands...</div>
          ) : commands.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-500">No commands issued yet.</div>
          ) : (
            commands.map((command) => <CommandRow key={command.id} command={command} />)
          )}
        </div>
      </section>

      <DeviceBoardConfig deviceId={deviceId} disabled={Boolean(device.revokedAt)} />

      {showRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Revoke device?</h3>
            <p className="mt-2 text-sm text-gray-600">This kicks any live session and prevents the agent from reconnecting with its current credentials.</p>
            {revokeError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{revokeError}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowRevoke(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
              <button type="button" onClick={revokeDevice} disabled={revoking} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {revoking && <Loader2 className="h-4 w-4 animate-spin" />}
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeviceDetail;
