import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Ban, ChevronLeft, RefreshCcw, Terminal } from 'lucide-react';
import {
  PageHeader,
  Panel,
  Button,
  Badge,
  Tabs,
  KeyValue,
  EmptyState,
  ErrorNote,
  ConfirmDialog,
  Skeleton,
  useToast,
} from '../components/ui';
import Can from '../components/Can';
import DeviceStatusBadge from '../components/devices/DeviceStatusBadge';
import TelemetryPanel from '../components/devices/TelemetryPanel';
import CommandLauncher from '../components/devices/CommandLauncher';
import CommandRow from '../components/devices/CommandRow';
import DeviceBoardConfig from '../components/devices/DeviceBoardConfig';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../hooks/useDevice';
import { upsertCommand, useCommandStream } from '../hooks/useCommandStream';
import DeviceService from '../services/DeviceService';
import { audienceLabel, formatDateTime, formatRelativeTime } from '../utils/deviceStatus';
import { PERMISSIONS } from '../utils/permissions';

/**
 * One display: what it is, what it is doing, and what you can do to it.
 *
 * Three tabs rather than one long scroll. The old page stacked identity,
 * telemetry, commands and two config forms into a single column, which meant
 * the config Save button — the control people actually came for — sat below
 * four screens of read-only status.
 */
export default function DisplayDetail() {
  const { deviceId } = useParams();
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const { device, telemetrySamples, loading, error, live, refetch } = useDevice(deviceId);
  const {
    commands,
    loading: commandsLoading,
    error: commandsError,
    refetch: refetchCommands,
    setCommands,
  } = useCommandStream(deviceId);

  const [tab, setTab] = useState('status');
  const [revoking, setRevoking] = useState(false);

  /**
   * Show the command optimistically.
   *
   * Without live telemetry no lifecycle frames arrive, so this row is the only
   * evidence the command was accepted until someone reloads. The shape mirrors
   * `CommandView` so `CommandRow` does not need to know it is a stub.
   */
  const handleIssued = (issued) => {
    setCommands((prev) =>
      upsertCommand(prev, {
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
        errorMessage: null,
      })
    );
  };

  const revoke = async () => {
    setRevoking(true);
    try {
      await DeviceService.revokeDevice(deviceId);
      toast.success('Display revoked.');
      await refetch();
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <>
        <PageHeader title="Display" />
        <ErrorNote onRetry={refetch}>{error || 'That display does not exist.'}</ErrorNote>
        <div className="mt-4">
          <Link to="/board/displays">
            <Button variant="secondary" icon={ChevronLeft}>
              Back to the fleet
            </Button>
          </Link>
        </div>
      </>
    );
  }

  const revoked = Boolean(device.revokedAt);

  return (
    <>
      <div className="mb-3">
        <button
          onClick={() => navigate('/board/displays')}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink transition-colors"
        >
          <ChevronLeft size={13} />
          Displays
        </button>
      </div>

      <PageHeader
        title={
          <span className="inline-flex items-center gap-3 flex-wrap">
            {device.displayName || 'Unnamed display'}
            <DeviceStatusBadge status={device.status} />
            {live ? (
              <Badge tone="quiet" size="sm" dot>
                live
              </Badge>
            ) : null}
          </span>
        }
        description={device.id}
        actions={
          <>
            <Button
              icon={RefreshCcw}
              onClick={() => {
                refetch();
                refetchCommands();
              }}
            >
              Sync
            </Button>
            <Can permission={PERMISSIONS.BOARD_DEVICE_REVOKE}>
              <Button variant="danger" icon={Ban} disabled={revoked} onClick={() => setRevoking('ask')}>
                {revoked ? 'Revoked' : 'Revoke'}
              </Button>
            </Can>
          </>
        }
      />

      {revoked && (
        <div className="mb-5">
          <ErrorNote>
            This display was revoked {formatRelativeTime(device.revokedAt)}. Its credentials no
            longer work, so it cannot reconnect or receive commands. Enrol it again to bring it
            back.
          </ErrorNote>
        </div>
      )}

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'status', label: 'Status' },
          { id: 'commands', label: 'Commands', count: commands.length || undefined },
          {
            id: 'config',
            label: 'Configuration',
            hidden: !can(PERMISSIONS.BOARD_CONFIG_READ),
          },
        ]}
      />

      {tab === 'status' && (
        <div className="space-y-6">
          <Panel caption="Identity" title="This device">
            <div className="grid gap-x-8 md:grid-cols-2">
              <div>
                <KeyValue label="Audience">{audienceLabel(device.audience)}</KeyValue>
                <KeyValue label="Hardware">{device.hardwareModel}</KeyValue>
                <KeyValue label="Agent version" mono>
                  {device.agentVersion}
                </KeyValue>
                <KeyValue label="Device id" mono>
                  {device.id}
                </KeyValue>
              </div>
              <div>
                <KeyValue label="Last heartbeat">
                  {formatRelativeTime(device.lastHeartbeat)}
                </KeyValue>
                <KeyValue label="Last seen IP" mono>
                  {device.lastSeenIp}
                </KeyValue>
                <KeyValue label="Enrolled">{formatDateTime(device.enrolledAt)}</KeyValue>
                <KeyValue label="Revoked">
                  {device.revokedAt ? formatDateTime(device.revokedAt) : 'No'}
                </KeyValue>
              </div>
            </div>
          </Panel>

          <Panel
            caption="Telemetry"
            title={live ? 'Live from the agent' : 'From the last fetch'}
            actions={
              !live && (
                <span className="text-[11px] text-muted">
                  needs <code className="font-mono">board:telemetry:subscribe</code>
                </span>
              )
            }
          >
            <TelemetryPanel device={device} samples={telemetrySamples} live={live} />
          </Panel>
        </div>
      )}

      {tab === 'commands' && (
        <Panel
          padded={false}
          caption="Fleet control"
          title={live ? 'Issue and watch' : 'History only'}
        >
          <div className="px-5 py-4 border-b border-hair">
            {!live && (
              <p className="text-[12px] text-muted mb-3 leading-relaxed">
                Results arrive on a topic this account cannot subscribe to. Commands still run —
                press Sync to see how they finished.
              </p>
            )}
            <CommandLauncher deviceId={deviceId} onIssued={handleIssued} disabled={revoked} />
          </div>

          {commandsError && (
            <div className="p-4">
              <ErrorNote onRetry={refetchCommands}>{commandsError}</ErrorNote>
            </div>
          )}

          {commandsLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : commands.length === 0 ? (
            <EmptyState
              icon={Terminal}
              title="No commands issued"
              body="The 50 most recent commands for this display appear here."
            />
          ) : (
            commands.map((command) => <CommandRow key={command.id} command={command} />)
          )}
        </Panel>
      )}

      {tab === 'config' && (
        <Can
          permission={PERMISSIONS.BOARD_CONFIG_READ}
          fallback={
            <Panel>
              <EmptyState
                title="No access to configuration"
                body="This tab needs board:config:read."
              />
            </Panel>
          }
        >
          <DeviceBoardConfig deviceId={deviceId} disabled={revoked} />
        </Can>
      )}

      <ConfirmDialog
        open={revoking === 'ask'}
        onClose={() => setRevoking(false)}
        onConfirm={revoke}
        title="Revoke this display?"
        confirmLabel="Revoke"
        confirmPhrase={device.displayName || undefined}
        body={
          <>
            The agent's credentials stop working immediately. Any live session is dropped and it
            cannot reconnect — getting the screen back means issuing a new enrollment token and
            running the agent again on the Pi.
          </>
        }
      />
    </>
  );
}
