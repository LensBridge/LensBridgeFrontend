import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Ban, Check, ChevronLeft, KeyRound, LayoutDashboard, Loader2, Monitor, Pencil, RefreshCcw, Server, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../hooks/useDevice';
import { upsertCommand, useCommandStream } from '../hooks/useCommandStream';
import DeviceService from '../services/DeviceService';
import DeviceStatusBadge from '../components/devices/DeviceStatusBadge';
import TelemetryPanel from '../components/devices/TelemetryPanel';
import BoardStatePanel from '../components/devices/BoardStatePanel';
import CommandLauncher from '../components/devices/CommandLauncher';
import CommandRow from '../components/devices/CommandRow';
import DeviceBoardConfig from '../components/devices/DeviceBoardConfig';
import UsbStickDownloads from '../components/devices/UsbStickDownloads';
import EnrollTokenDialog from '../components/devices/EnrollTokenDialog';
import Can from '../components/Can';
import { audienceLabel, formatDateTime, formatRelativeTime } from '../utils/deviceStatus';
import { PERMISSIONS } from '../utils/permissions';

function DeviceDetail() {
  const { deviceId } = useParams();
  const { user, can } = useAuth();
  const { device, telemetrySamples, loading, error, live, refetch } = useDevice(deviceId);
  const { commands, loading: commandsLoading, error: commandsError, refetch: refetchCommands, setCommands } = useCommandStream(deviceId);
  const [showRevoke, setShowRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [enrollToken, setEnrollToken] = useState(null);
  const [enrollError, setEnrollError] = useState('');

  // The maintainer's path: enroll this board over SSH with a one-time token.
  const issueEnrollToken = async () => {
    setEnrollError('');
    try {
      setEnrollToken(await DeviceService.issueDeviceEnrollmentToken(deviceId));
    } catch (err) {
      setEnrollError(err.message || 'Failed to issue an enrollment token');
    }
  };

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name || name === device?.displayName) {
      setRenaming(false);
      return;
    }
    setSavingName(true);
    setRenameError('');
    try {
      await DeviceService.renameDevice(deviceId, name);
      setRenaming(false);
      refetch();
    } catch (err) {
      setRenameError(err.message || 'Failed to rename the board');
    } finally {
      setSavingName(false);
    }
  };

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
    if (!can(PERMISSIONS.BOARD_DEVICE_REVOKE)) return;
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

  if (loading) {
    return <div className="py-16 text-center text-gray-500 dark:text-gray-400">Loading device...</div>;
  }

  if (error || !device) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-6 text-center text-red-700 dark:text-red-300">
        {error || 'Device not found'}
        <div><Link to="/admin/devices" className="mt-4 inline-flex text-sm font-semibold text-red-800 dark:text-red-200 underline">Back to Devices</Link></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/devices" className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Monitor className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              {renaming ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(event) => { event.preventDefault(); saveName(); }}
                >
                  <input
                    autoFocus
                    value={nameDraft}
                    maxLength={255}
                    disabled={savingName}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onKeyDown={(event) => { if (event.key === 'Escape') setRenaming(false); }}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xl font-semibold text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    aria-label="Board name"
                  />
                  <button type="submit" disabled={savingName || !nameDraft.trim()} className="rounded-lg p-2 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 disabled:opacity-50" title="Save name">
                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => setRenaming(false)} className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" title="Cancel">
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{device.displayName}</h1>
                  <Can permission={PERMISSIONS.BOARD_CONFIG_WRITE}>
                    <button
                      type="button"
                      onClick={() => { setNameDraft(device.displayName || ''); setRenameError(''); setRenaming(true); }}
                      className="rounded-lg p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600"
                      title="Rename board"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </Can>
                </>
              )}
              <DeviceStatusBadge status={device.status} />
            </div>
            <p className="mt-1 font-mono text-sm text-gray-500 dark:text-gray-400">{device.id}</p>
            {renameError && <p className="mt-1 text-sm text-red-700 dark:text-red-300">{renameError}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { refetch(); refetchCommands(); }} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
            <RefreshCcw className="h-4 w-4" />
            Sync
          </button>
          <Can permission={PERMISSIONS.BOARD_DEVICE_REVOKE}>
            <button type="button" onClick={() => setShowRevoke(true)} disabled={Boolean(device.revokedAt)} className="inline-flex items-center gap-2 rounded-lg border border-red-300 dark:border-red-600 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:cursor-not-allowed disabled:opacity-50">
              <Ban className="h-4 w-4" />
              Revoke device
            </button>
          </Can>
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Server className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Identity & Status</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-sm text-gray-500 dark:text-gray-400">Audience</div><div className="mt-1 font-medium text-gray-900 dark:text-white">{audienceLabel(device.audience)}</div></div>
          <div><div className="text-sm text-gray-500 dark:text-gray-400">Hardware</div><div className="mt-1 font-medium text-gray-900 dark:text-white">{device.hardwareModel || 'Unknown'}</div></div>
          <div><div className="text-sm text-gray-500 dark:text-gray-400">Agent</div><div className="mt-1 font-medium text-gray-900 dark:text-white">{device.agentVersion || 'Unknown'}</div></div>
          <div><div className="text-sm text-gray-500 dark:text-gray-400">Last seen</div><div className="mt-1 font-medium text-gray-900 dark:text-white">{formatRelativeTime(device.lastHeartbeat)}</div></div>
          <div><div className="text-sm text-gray-500 dark:text-gray-400">IP</div><div className="mt-1 font-medium text-gray-900 dark:text-white">{device.lastSeenIp || 'Unknown'}</div></div>
          <div><div className="text-sm text-gray-500 dark:text-gray-400">First connected</div><div className="mt-1 font-medium text-gray-900 dark:text-white">{device.enrolledAt ? formatDateTime(device.enrolledAt) : 'Never (USB only)'}</div></div>
          <div><div className="text-sm text-gray-500 dark:text-gray-400">Revoked</div><div className="mt-1 font-medium text-gray-900 dark:text-white">{device.revokedAt ? formatDateTime(device.revokedAt) : 'No'}</div></div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Board</h2>
        </div>
        <BoardStatePanel device={device} />
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Telemetry</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {live
              ? `Patched by \`/topic/devices/${deviceId}\` heartbeat events.`
              : 'Live updates are off for this account; values come from the last fetch.'}
          </p>
        </div>
        <TelemetryPanel device={device} samples={telemetrySamples} live={live} />
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Commands</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {live
              ? 'Issue commands and watch lifecycle updates from the agent.'
              : 'History only — command results arrive on a topic this account cannot subscribe to.'}
          </p>
          <div className="mt-4">
            <CommandLauncher deviceId={deviceId} onIssued={handleIssued} disabled={Boolean(device.revokedAt)} />
          </div>
        </div>

        {commandsError && <div className="m-4 rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">{commandsError}</div>}
        <div>
          {commandsLoading ? (
            <div className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">Loading commands...</div>
          ) : commands.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">No commands issued yet.</div>
          ) : (
            commands.map((command) => <CommandRow key={command.id} command={command} />)
          )}
        </div>
      </section>

      {!device.revokedAt && (
        <Can permission={PERMISSIONS.BOARD_DEVICE_READ}>
          <UsbStickDownloads device={device} />
        </Can>
      )}

      <Can permission={PERMISSIONS.BOARD_CONFIG_READ}>
        <DeviceBoardConfig deviceId={deviceId} disabled={Boolean(device.revokedAt)} />
      </Can>

      {!device.revokedAt && (
        <Can permission={PERMISSIONS.BOARD_DEVICE_ENROLL}>
          <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Maintainers: enroll over SSH</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              A one-time token for <code className="font-mono">musallahboard-agent enroll</code> on this board. It binds the
              board&apos;s key to this board, replacing any key it had (for a replaced SD card). Boards set up with an online
              setup file connect by themselves and need none.
            </p>
            {enrollError && <div className="mt-3 rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">{enrollError}</div>}
            <button type="button" onClick={issueEnrollToken} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
              <KeyRound className="h-4 w-4" />
              Issue enrollment token
            </button>
          </section>
        </Can>
      )}

      {enrollToken && <EnrollTokenDialog tokenResponse={enrollToken} onClose={() => setEnrollToken(null)} />}

      {showRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl dark:shadow-2xl dark:shadow-black/20">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revoke device?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">This kicks any live session and prevents the agent from reconnecting with its current credentials.</p>
            {revokeError && <div className="mt-4 rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">{revokeError}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowRevoke(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
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
