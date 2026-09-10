import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Image as ImageIcon,
  Layers,
  MonitorSmartphone,
  Quote,
  RefreshCw,
  Users,
} from 'lucide-react';
import BoardService from '../../services/BoardService';
import { audienceLabel } from '../../utils/deviceStatus';
import {
  FRAME_TYPES,
  frameDurationLabel,
  frameTypeLabel,
  normalizeFrameType,
} from '../../models/board';
import { Badge, Button, EmptyState, ErrorNote, Select, Skeleton } from '../ui';
import RotationStrip, { RotationLegend } from './RotationStrip';

/**
 * A read-only preview of what one board is actually showing.
 *
 * Frames are assembled server-side per device (`BoardPayloadAssembler`), so this
 * fetches the real payload rather than reconstructing the slideshow from
 * posters and events. Nothing here is editable: a frame's content belongs to
 * the tab it came from, and its ordering to the assembler. What this answers is
 * the question none of the other tabs can — "given everything we have set up,
 * what does the screen in the brothers' musallah look like right now".
 */

// Keyed on the enum name Jackson actually sends — see FRAME_TYPES in
// models/board.js for why that is not what openapi.yaml documents.
const FRAME_ICONS = {
  POSTER: ImageIcon,
  EVENT_LIST: Calendar,
  DAILY_SCHEDULE: Calendar,
  NEXT_PRAYER: Clock,
  JUMMAH: Users,
  ISLAMIC_QUOTE: Quote,
};

function formatTime(iso, timezone) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || undefined,
  });
}

/** One line on what this particular frame is carrying. */
function FrameSummary({ frame, timezone }) {
  const type = normalizeFrameType(frame.frameType);
  const config = frame.frameConfig;

  if (!config) {
    return <p className="text-[12px] text-muted">{FRAME_TYPES[type]?.description}</p>;
  }

  switch (type) {
    case 'POSTER':
      return (
        <div className="flex items-center gap-2.5">
          {config.posterUrl && (
            <img
              src={config.posterUrl}
              alt=""
              className="h-9 w-12 rounded-sm object-cover bg-raised shrink-0"
            />
          )}
          <span className="text-[12px] text-muted truncate">
            {config.title || 'Untitled poster'}
          </span>
        </div>
      );

    case 'EVENT_LIST':
    case 'DAILY_SCHEDULE': {
      const events = config.events || [];
      if (events.length === 0) return <p className="text-[12px] text-faint">No events</p>;
      return (
        <p className="text-[12px] text-muted truncate">
          {events.length} event{events.length === 1 ? '' : 's'} —{' '}
          {events
            .slice(0, 2)
            .map((e) => `${e.name}${e.allDay ? '' : ` ${formatTime(e.startTime, timezone)}`}`)
            .join(', ')}
          {events.length > 2 && ` +${events.length - 2} more`}
        </p>
      );
    }

    case 'JUMMAH': {
      const prayers = config.prayers || [];
      if (prayers.length === 0)
        return <p className="text-[12px] text-faint">No slots set for this week</p>;
      return (
        <p className="text-[12px] text-muted truncate">
          {prayers.map((p) => `${p.prayerTime}${p.room ? ` · ${p.room}` : ''}`).join('   ')}
        </p>
      );
    }

    case 'ISLAMIC_QUOTE':
      return (
        <p className="text-[12px] text-muted truncate">
          <span className="capitalize text-soft">{(config.kind || '').toLowerCase()}</span>
          {config.reference ? ` — ${config.reference}` : ''}
          {config.translation && <span className="text-faint"> — “{config.translation}”</span>}
        </p>
      );

    default:
      return <p className="text-[12px] text-muted">{FRAME_TYPES[type]?.description}</p>;
  }
}

/**
 * `devices` and `devicesLoading` come from the parent's `useDeviceList` —
 * calling the hook here too would open a second STOMP subscription and refetch
 * the whole fleet on every reconnect.
 */
export default function FramesEditor({ devices = [], devicesLoading = false }) {
  const [deviceId, setDeviceId] = useState('');
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Memoized so the default-selection effect below does not re-run every render.
  const active = useMemo(() => devices.filter((d) => !d.revokedAt), [devices]);

  useEffect(() => {
    if (!deviceId && active.length > 0) setDeviceId(active[0].id);
  }, [active, deviceId]);

  const load = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError('');
    try {
      setPayload(await BoardService.getDevicePayload(deviceId));
    } catch (err) {
      setError(err.message || 'Failed to load the board payload.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    load();
  }, [load]);

  const frames = payload?.frames ?? [];
  const timezone = payload?.deviceConfig?.location?.timezone;

  if (devicesLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <EmptyState
        icon={MonitorSmartphone}
        title="No boards enrolled"
        body="Frames are assembled per device, so there is nothing to preview until at least one screen has joined the fleet."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-72">
          <label htmlFor="frames-device" className="block mb-1.5 text-[12px] text-soft">
            Preview which board
          </label>
          <Select id="frames-device" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            {active.map((device) => (
              <option key={device.id} value={device.id}>
                {device.displayName || 'Unnamed'} · {audienceLabel(device.audience)}
              </option>
            ))}
          </Select>
        </div>
        <Button icon={RefreshCw} onClick={load} loading={loading} className="ml-auto">
          Reload preview
        </Button>
      </div>

      {error && <ErrorNote onRetry={load}>{error}</ErrorNote>}

      {/* The loop, drawn to scale. Three summary tiles used to sit here saying
          "6 frames / 92s / America/Toronto", which is the same information with
          the shape taken out of it. */}
      {frames.length > 0 && !loading && (
        <div>
          <RotationStrip frames={frames} />
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
            <RotationLegend />
            <span className="val text-[11px] text-muted">{timezone}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : frames.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="This board has nothing to show"
          body="The assembler produced no frames. Usually that means no poster, event or weekly content matches this board's audience and today's date."
        />
      ) : (
        <ol className="space-y-2">
          {frames.map((frame, index) => {
            const type = normalizeFrameType(frame.frameType);
            const Icon = FRAME_ICONS[type] ?? Layers;
            return (
              <li
                key={frame.key ?? `${type}-${index}`}
                className="bg-surface border border-hair rounded-lg shadow-sm px-4 py-3 flex items-start gap-3.5"
              >
                <span className="shrink-0 w-7 h-7 rounded-md bg-raised border border-hair grid place-items-center text-[11px] font-mono text-muted tabular">
                  {index + 1}
                </span>
                <span className="shrink-0 mt-1 text-ember">
                  <Icon size={15} strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] text-ink">{frameTypeLabel(frame.frameType)}</span>
                    {frame.slot && (
                      <Badge tone="quiet" size="sm">
                        {frame.slot}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1">
                    <FrameSummary frame={frame} timezone={timezone} />
                  </div>
                </div>
                <span className="shrink-0 text-[12px] text-muted tabular">
                  {frameDurationLabel(frame.durationInSeconds)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-[12px] text-muted leading-relaxed">
        Assembled by the server for this device, not reconstructed here — this is what the screen
        is being sent. Nothing on this tab is editable: a frame's content belongs to the tab it came
        from, and its position to the assembler.
      </p>
    </div>
  );
}
