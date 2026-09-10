import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitorSmartphone, Plus, RefreshCcw, Thermometer, WifiOff } from 'lucide-react';
import {
  PageHeader,
  Panel,
  DataTable,
  Button,
  Readout,
  EmptyState,
  ErrorNote,
  SearchInput,
} from '../components/ui';
import Can from '../components/Can';
import DeviceStatusBadge from '../components/devices/DeviceStatusBadge';
import EnrollDialog from '../components/devices/EnrollDialog';
import { useDeviceList } from '../hooks/useDeviceList';
import { audienceLabel, formatRelativeTime } from '../utils/deviceStatus';
import { PERMISSIONS } from '../utils/permissions';

/**
 * The display fleet.
 *
 * `useDeviceList` subscribes to `/topic/devices` when the account holds
 * `board:telemetry:subscribe` and falls back to a 30-second poll when it does
 * not. The banner says which of the two is happening, because "the temperature
 * column hasn't moved in ten minutes" has a very different meaning in each case.
 */
export default function Displays() {
  const { devices, loading, error, live, refetch } = useDeviceList();
  const navigate = useNavigate();
  const [enrolling, setEnrolling] = useState(false);
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const rows = needle
    ? devices.filter((d) =>
        [d.displayName, d.id, d.hardwareModel, d.agentVersion, d.lastSeenIp]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle))
      )
    : devices;

  const online = devices.filter((d) => d.status === 'online').length;
  const offline = devices.filter((d) => d.status === 'offline').length;
  const revoked = devices.filter((d) => d.status === 'revoked').length;

  const columns = [
    {
      key: 'displayName',
      header: 'Display',
      render: (device) => (
        <div className="min-w-0">
          <p className="text-[13px] text-ink truncate">
            {device.displayName || 'Unnamed display'}
          </p>
          <p className="text-[11px] text-faint font-mono truncate">{device.id}</p>
        </div>
      ),
    },
    {
      key: 'audience',
      header: 'Audience',
      width: '8rem',
      render: (device) => (
        <span className="text-[12px] text-muted">{audienceLabel(device.audience)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '7.5rem',
      render: (device) => <DeviceStatusBadge status={device.status} size="sm" />,
    },
    {
      key: 'lastHeartbeat',
      header: 'Last seen',
      width: '8rem',
      render: (device) => (
        <span className="text-[12px] text-muted tabular">
          {formatRelativeTime(device.lastHeartbeat)}
        </span>
      ),
    },
    {
      key: 'cpu',
      header: 'CPU',
      width: '6rem',
      render: (device) => {
        const temp = device.telemetry?.cpuTempC;
        return (
          <span
            className={`inline-flex items-center gap-1.5 text-[12px] tabular ${
              temp >= 80 ? 'text-bad' : temp >= 70 ? 'text-warn' : 'text-muted'
            }`}
          >
            <Thermometer size={11} className="text-faint" />
            {temp != null ? `${temp}°C` : '—'}
          </span>
        );
      },
    },
    {
      key: 'agentVersion',
      header: 'Agent',
      width: '7rem',
      render: (device) => (
        <span className="text-[12px] text-muted font-mono">{device.agentVersion || '—'}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Displays"
        description="Every enrolled screen, its telemetry, and the commands you can send it."
        actions={
          <>
            <Button icon={RefreshCcw} onClick={refetch}>
              Refresh
            </Button>
            <Can permission={PERMISSIONS.BOARD_DEVICE_ENROLL}>
              <Button variant="primary" icon={Plus} onClick={() => setEnrolling(true)}>
                Enroll display
              </Button>
            </Can>
          </>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorNote onRetry={refetch}>{error}</ErrorNote>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-x-12 gap-y-6 mb-8">
        <Readout
          label="Reporting"
          value={`${online}/${online + offline}`}
          tone={online === 0 && offline > 0 ? 'bad' : 'ink'}
          note={
            offline > 0
              ? `${offline} enrolled ${offline === 1 ? 'screen is' : 'screens are'} not sending heartbeats.`
              : 'Every enrolled screen is reporting.'
          }
        />
        {revoked > 0 && (
          <Readout
            size="sm"
            label="Revoked"
            value={revoked}
            tone="faint"
            note="Credentials withdrawn. Cannot reconnect."
          />
        )}
      </div>

      {!live && (
        <div className="flex items-start gap-2.5 bg-surface border border-hair rounded-md shadow-xs px-4 py-3 mb-5">
          <WifiOff size={14} className="text-muted mt-0.5 shrink-0" />
          <p className="text-[12px] text-muted leading-relaxed">
            Live telemetry is off — this account does not hold{' '}
            <code className="font-mono text-[11px] text-soft">board:telemetry:subscribe</code>. The
            table refetches every 30 seconds instead, so values here can be up to half a minute
            stale.
          </p>
        </div>
      )}

      <Panel
        padded={false}
        caption={`${devices.length} enrolled`}
        title="Fleet"
        actions={
          <SearchInput value={query} onChange={setQuery} placeholder="Filter" className="w-52" />
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          onRowClick={(device) => navigate(`/board/displays/${device.id}`)}
          empty={
            <EmptyState
              icon={MonitorSmartphone}
              title={query ? 'No display matches' : 'No displays enrolled'}
              body={
                query
                  ? undefined
                  : 'A display joins the fleet by exchanging a one-time enrollment token for an identity. Refer to the documentation for more info.'
              }
              action={
                !query && (
                  <Can permission={PERMISSIONS.BOARD_DEVICE_ENROLL}>
                    <Button variant="primary" icon={Plus} onClick={() => setEnrolling(true)}>
                      Enroll display
                    </Button>
                  </Can>
                )
              }
            />
          }
        />
      </Panel>

      <EnrollDialog open={enrolling} onClose={() => setEnrolling(false)} onEnrolled={refetch} />
    </>
  );
}
