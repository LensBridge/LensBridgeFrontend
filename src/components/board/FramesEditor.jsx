import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Calendar, Image, Quote, Clock, Monitor, Users, Info,
  Play, RefreshCw, AlertCircle, ExternalLink, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BoardService from '../../services/BoardService';
import { audienceLabel } from '../../utils/deviceStatus';
import {
  FRAME_TYPES, FRAME_SLOTS, frameTypeLabel, frameDurationLabel
} from '../../models/board';

/**
 * FramesEditor — read-only preview of what a board is actually showing.
 *
 * Frames are assembled server-side per device (BoardPayloadAssembler), so this
 * fetches the real payload rather than reconstructing the slideshow from
 * posters. Nothing here is editable: a frame's content is owned by the tab it
 * came from (Posters, Events, Weekly) and its ordering by the assembler.
 */

const FRAME_ICONS = {
  poster: Image,
  event_list: Calendar,
  daily_schedule: Calendar,
  next_prayer: Clock,
  jummah: Users,
  islamic_quote: Quote
};

const FRAME_COLORS = {
  poster: 'bg-purple-500',
  event_list: 'bg-blue-500',
  daily_schedule: 'bg-green-500',
  next_prayer: 'bg-amber-500',
  jummah: 'bg-teal-500',
  islamic_quote: 'bg-emerald-500'
};

function formatTime(iso, timezone) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-CA', {
    hour: 'numeric', minute: '2-digit', timeZone: timezone || undefined
  });
}

/** One-line gist of a frame's payload, per frame type. */
function FrameSummary({ frame, timezone }) {
  const config = frame.frameConfig;
  if (!config) {
    return <p className="text-xs text-gray-500">{FRAME_TYPES[frame.frameType]?.description}</p>;
  }

  switch (frame.frameType) {
    case 'poster':
      return (
        <div className="flex items-center gap-2">
          {config.posterUrl && (
            <img src={config.posterUrl} alt="" className="h-8 w-12 rounded object-cover bg-gray-100" />
          )}
          <span className="text-xs text-gray-500 truncate">{config.title || 'Untitled poster'}</span>
        </div>
      );

    case 'event_list':
    case 'daily_schedule': {
      const events = config.events || [];
      if (events.length === 0) return <p className="text-xs text-gray-400">No events</p>;
      return (
        <p className="text-xs text-gray-500 truncate">
          {events.length} event{events.length === 1 ? '' : 's'}
          {' — '}
          {events.slice(0, 2).map(e => `${e.name}${e.allDay ? '' : ` ${formatTime(e.startTime, timezone)}`}`).join(', ')}
          {events.length > 2 && ` +${events.length - 2} more`}
        </p>
      );
    }

    case 'jummah': {
      const prayers = config.prayers || [];
      if (prayers.length === 0) return <p className="text-xs text-gray-400">No slots set for this week</p>;
      return (
        <p className="text-xs text-gray-500 truncate">
          {prayers.map(p => `${p.prayerTime}${p.room ? ` · ${p.room}` : ''}`).join('  ')}
        </p>
      );
    }

    case 'islamic_quote':
      return (
        <p className="text-xs text-gray-500 truncate">
          <span className="font-medium capitalize">{(config.kind || '').toLowerCase()}</span>
          {config.reference ? ` — ${config.reference}` : ''}
        </p>
      );

    default:
      return <p className="text-xs text-gray-500">{FRAME_TYPES[frame.frameType]?.description}</p>;
  }
}

/**
 * `devices` and `devicesLoading` come from the parent's useDeviceList — calling
 * the hook here too would open a second STOMP subscription and refetch the
 * whole fleet on every reconnect.
 */
function FramesEditor({ devices = [], devicesLoading = false, showMessage }) {
  const [deviceId, setDeviceId] = useState('');
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Memoized so the default-selection effect below doesn't re-run every render.
  const activeDevices = useMemo(() => devices.filter(d => !d.revokedAt), [devices]);

  // Default to the first live device once the fleet loads.
  useEffect(() => {
    if (!deviceId && activeDevices.length > 0) setDeviceId(activeDevices[0].id);
  }, [activeDevices, deviceId]);

  const loadPayload = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError('');
    try {
      setPayload(await BoardService.getDevicePayload(deviceId));
    } catch (err) {
      setError(err.message || 'Failed to load board payload');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => { loadPayload(); }, [loadPayload]);

  const handleRefresh = () => {
    loadPayload();
    showMessage?.('Preview reloaded');
  };

  const frames = payload?.frames || [];
  const timezone = payload?.deviceConfig?.location?.timezone;

  // `durationInSeconds: null` means the board decides, so a cycle total is only
  // meaningful as a floor — say so rather than inventing a number for it.
  const fixedSeconds = frames.reduce((acc, f) => acc + (f.durationInSeconds || 0), 0);
  const autoCount = frames.filter(f => f.durationInSeconds == null).length;

  if (devicesLoading) {
    return (
      <div className="py-12 text-center text-gray-500">
        <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />
        Loading devices...
      </div>
    );
  }

  if (activeDevices.length === 0) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-8 text-center">
        <Monitor className="mx-auto mb-3 h-10 w-10 text-amber-400" />
        <p className="font-medium text-amber-800">No enrolled boards</p>
        <p className="mb-4 text-sm text-amber-600">
          Frames are assembled per device, so there is nothing to preview yet.
        </p>
        <Link
          to="/admin/devices/enroll"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Enroll a board
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Device selector + summary */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-gray-900">Live Slideshow</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Fetching...' : (
              <>
                {frames.length} frame{frames.length === 1 ? '' : 's'}
                {fixedSeconds > 0 && ` · ${fixedSeconds}s fixed`}
                {autoCount > 0 && ` · ${autoCount} auto-timed`}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          >
            {activeDevices.map(device => (
              <option key={device.id} value={device.id}>
                {device.displayName || device.id.slice(0, 8)}
                {device.audience ? ` (${audienceLabel(device.audience)})` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
            title="Reload preview"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Timeline */}
      {frames.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
            <Monitor className="h-4 w-4" />
            <span>Timeline</span>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {frames.map((frame, i) => {
              const Icon = FRAME_ICONS[frame.frameType] || Layers;
              return (
                <div
                  key={`${frame.frameType}-${i}`}
                  className={`flex h-10 flex-shrink-0 items-center justify-center rounded-lg ${FRAME_COLORS[frame.frameType] || 'bg-gray-400'}`}
                  style={{ width: Math.max(40, (frame.durationInSeconds || 10) * 4) }}
                  title={`${frameTypeLabel(frame.frameType)} — ${frameDurationLabel(frame.durationInSeconds)}`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Frame list */}
      {loading ? (
        <div className="py-10 text-center text-gray-500">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" />
          Loading payload...
        </div>
      ) : frames.length === 0 && !error ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 py-10 text-center">
          <Layers className="mx-auto mb-2 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-600">This board has nothing to show</p>
          <p className="text-sm text-gray-400">Add posters, events, or weekly content.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {frames.map((frame, i) => {
            const Icon = FRAME_ICONS[frame.frameType] || Layers;
            const meta = FRAME_TYPES[frame.frameType];
            return (
              <div
                key={`${frame.frameType}-${i}`}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-3"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-500">
                  {i + 1}
                </div>
                <div className={`flex-shrink-0 rounded-lg p-2 ${FRAME_COLORS[frame.frameType] || 'bg-gray-400'}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{frameTypeLabel(frame.frameType)}</p>
                    {meta?.source && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                        {meta.source}
                      </span>
                    )}
                  </div>
                  <FrameSummary frame={frame} timezone={timezone} />
                </div>
                <div className="flex flex-shrink-0 items-center gap-3 text-right">
                  {frame.slot && (
                    <span
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      title={FRAME_SLOTS[frame.slot]?.description}
                    >
                      {FRAME_SLOTS[frame.slot]?.label || frame.slot}
                    </span>
                  )}
                  {frame.priority != null && (
                    <span className="text-xs text-gray-400" title="Higher shows first within a slot">
                      P{frame.priority}
                    </span>
                  )}
                  <span className="w-10 text-sm text-gray-400">
                    {frameDurationLabel(frame.durationInSeconds)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(FramesEditor);
