import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { PageHeader, Panel, Sheet, Readout, Button, EmptyState, useToast } from '../components/ui';
import Can from '../components/Can';
import RotationStrip from '../components/board/RotationStrip';
import { useAuth } from '../context/AuthContext';
import { useDeviceList } from '../hooks/useDeviceList';
import { PERMISSIONS } from '../utils/permissions';
import { formatRelativeTime } from '../utils/deviceStatus';
import MediaService from '../services/MediaService';
import AuditService from '../services/AuditService';
import BoardService from '../services/BoardService';
import { describeAction } from '../components/admin/audit';

/** `19:42` in the viewer's locale, for the log's left column. */
const clock = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

const dayStamp = (ms) =>
  new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase();

/**
 * The landing page.
 *
 * The thesis is the fleet rail at the top: **these screens are alive, and this
 * is what each of them is showing right now.** That is the one question this
 * whole system exists to answer, and no number in a card can answer it — so
 * each board gets its rotation drawn to scale, with the live frame marked from
 * telemetry. Everything else on the page is smaller than it.
 *
 * What this replaced was four stat tiles over two panels, which is the layout
 * every dashboard generator produces and which told an operator nothing they
 * could act on. The counts that survived — the review queue — are here because
 * a number that means "go and do something" earns its size. Counts that only
 * meant "the system has data in it" were cut.
 *
 * Every section is gated on the permission that makes its content readable, and
 * a section whose fetch would 403 is never mounted. An account with a single
 * grant gets a one-section page, not a grid of error states.
 *
 * Nothing polls. These are audited reads server-side; a dashboard left open on
 * a spare monitor should not write a log entry every thirty seconds. The fleet
 * rail is the exception and it is pushed, not pulled — `useDeviceList`
 * subscribes to the telemetry topic when the account may.
 */
export default function Overview() {
  const { user, can, canAny } = useAuth();
  const toast = useToast();

  const canSeeFleet = can(PERMISSIONS.BOARD_DEVICE_READ);
  const { devices, loading: devicesLoading } = useDeviceList({ enabled: canSeeFleet });

  const [rotations, setRotations] = useState({});
  const [pending, setPending] = useState(null);
  const [events, setEvents] = useState(null);
  const [activity, setActivity] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const live = devices.filter((d) => !d.revokedAt);

  useEffect(() => {
    if (canAny([PERMISSIONS.MEDIA_UPLOAD_READ, PERMISSIONS.MEDIA_UPLOAD_MODERATE])) {
      MediaService.list({ filter: 'pending', size: 1 })
        .then((p) => setPending(p.totalElements))
        .catch(() => setPending(0));
    }
    if (can(PERMISSIONS.BOARD_CONTENT_READ)) {
      BoardService.getAllEvents().then(setEvents).catch(() => setEvents([]));
    }
    if (can(PERMISSIONS.AUDIT_READ)) {
      AuditService.query({ size: 7 })
        .then((p) => setActivity(p.content))
        .catch(() => setActivity([]));
    }
  }, [can, canAny]);

  /**
   * One assembled payload per live board, so the rail can draw each rotation to
   * scale. Keyed by device id and fetched once — the payload only changes when
   * content does, and the rail is a glance, not a monitor.
   */
  useEffect(() => {
    let cancelled = false;
    for (const device of live.slice(0, 8)) {
      if (rotations[device.id]) continue;
      BoardService.getDevicePayload(device.id)
        .then((payload) => {
          if (!cancelled) {
            setRotations((r) => ({ ...r, [device.id]: payload?.frames ?? [] }));
          }
        })
        .catch(() => {
          if (!cancelled) setRotations((r) => ({ ...r, [device.id]: [] }));
        });
    }
    return () => {
      cancelled = true;
    };
    // `live` is derived from `devices`; keying on the id list avoids refetching
    // on every heartbeat, which mutates `devices` but never its membership.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.map((d) => d.id).join(','), rotations]);

  const upcoming = (events ?? [])
    .filter((e) => (e.endEpochMs ?? e.startEpochMs ?? 0) >= Date.now())
    .sort((a, b) => a.startEpochMs - b.startEpochMs)
    .slice(0, 4);

  const pushRefresh = async () => {
    setRefreshing(true);
    try {
      await BoardService.refreshBoards();
      toast.success('Every board has been told to reload.');
    } catch (e) {
      toast.error('Could not push the refresh.', { detail: e.message });
    } finally {
      setRefreshing(false);
    }
  };

  const canSeeQueue = canAny([PERMISSIONS.MEDIA_UPLOAD_READ, PERMISSIONS.MEDIA_UPLOAD_MODERATE]);
  const canSeeEvents = can(PERMISSIONS.BOARD_CONTENT_READ);
  const canSeeLog = can(PERMISSIONS.AUDIT_READ);
  const hasAnything = canSeeFleet || canSeeQueue || canSeeEvents || canSeeLog;

  return (
    <>
      <PageHeader
        title={`Assalamu alaikum, ${user?.firstName || 'friend'}`}
        description="Welcome back to Minbar"
        actions={
          <Can permission={PERMISSIONS.BOARD_REFRESH}>
            <Button icon={RefreshCw} loading={refreshing} onClick={pushRefresh}>
              Refresh boards
            </Button>
          </Can>
        }
      />

      {!hasAnything ? (
        <EmptyState
          title="Nothing has been shared with you yet"
          body="Your account is active but carries no grants. Ask whoever administers this console for the permissions your role needs — they can add them from the People page."
        />
      ) : (
        <Sheet>
          {canSeeFleet && (
            <Panel
              caption="On screen"
              actions={
                <Link to="/board/displays" className="cap text-soft hover:text-ember transition-colors">
                  All displays →
                </Link>
              }
            >
              {devicesLoading ? (
                <div className="space-y-6">
                  {Array.from({ length: 2 }, (_, i) => (
                    <div key={i} className="shimmer h-6 bg-raised" />
                  ))}
                </div>
              ) : live.length === 0 ? (
                <p className="text-[13px] text-muted">
                  No displays enrolled. A screen joins the fleet by exchanging a one-time token for
                  an identity.
                </p>
              ) : (
                <ul className="space-y-6">
                  {live.map((device, i) => {
                    const frames = rotations[device.id];
                    const temp = device.telemetry?.cpuTempC;
                    const online = device.status === 'online';
                    return (
                      <li key={device.id} className="anim-stagger" style={{ '--i': Math.min(i, 8) }}>
                        <Link to={`/board/displays/${device.id}`} className="group block">
                          <div className="flex items-baseline gap-3 mb-2">
                            {/* `currentColor` drives both the dot and the ring
                                it throws, so one class sets the pair. */}
                            <span
                              aria-hidden
                              className={`w-1.5 h-1.5 rounded-full shrink-0 bg-current ${
                                online ? 'text-good heartbeat' : 'text-faint'
                              }`}
                            />
                            <span className="text-[13px] text-ink group-hover:text-ember transition-colors">
                              {device.displayName || 'Unnamed display'}
                            </span>
                            <span className="flex-1 border-b border-dotted border-hair -translate-y-[3px] min-w-4" />
                            <span className="val text-[11px] text-muted whitespace-nowrap">
                              {temp != null && `${Math.round(temp)}°C · `}
                              {formatRelativeTime(device.lastHeartbeat).toLowerCase()}
                            </span>
                          </div>

                          {frames ? (
                            <RotationStrip
                              size="sm"
                              frames={frames}
                              currentKey={
                                device.telemetry?.displayedFrameKey ??
                                device.telemetry?.displayedFrameId
                              }
                            />
                          ) : (
                            <div className="shimmer h-1.5 bg-raised" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          )}

          {canSeeQueue && (
            <Panel caption="Review">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <Readout
                  label="Awaiting review"
                  value={pending ?? '—'}
                  tone={pending > 0 ? 'ember' : 'faint'}
                  note={
                    pending === 0
                      ? 'The queue is clear.'
                      : 'Media submitted from the app, not yet approved.'
                  }
                />
                {pending > 0 && (
                  <Link to="/media">
                    <Button variant="primary">Open the queue</Button>
                  </Link>
                )}
              </div>
            </Panel>
          )}

          {canSeeEvents && (
            <Panel
              caption="Next up"
              actions={
                <Link to="/board/content" className="cap text-soft hover:text-ember transition-colors">
                  All content →
                </Link>
              }
            >
              {upcoming.length === 0 ? (
                <p className="text-[13px] text-muted">
                  {events ? 'Nothing on the calendar ahead of today.' : 'Loading the calendar.'}
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {upcoming.map((event) => (
                    <li key={event.id} className="flex items-baseline gap-3">
                      <span className="val text-[11px] text-muted w-14 shrink-0">
                        {dayStamp(event.startEpochMs)}
                      </span>
                      <span className="text-[13px] text-ink truncate">{event.name}</span>
                      <span className="flex-1 border-b border-dotted border-hair -translate-y-[3px] min-w-4" />
                      <span className="val text-[11px] text-muted whitespace-nowrap">
                        {event.location}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {canSeeLog && (
            <Panel
              caption="Log"
              actions={
                <Link to="/access/audit" className="cap text-soft hover:text-ember transition-colors">
                  Full audit log →
                </Link>
              }
            >
              {!activity ? (
                <div className="shimmer h-4 bg-raised w-2/3" />
              ) : activity.length === 0 ? (
                <p className="text-[13px] text-muted">Nothing recorded yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {activity.map((entry) => (
                    <li key={entry.id} className="flex items-baseline gap-3 text-[12px]">
                      <span className="val text-[11px] text-faint w-10 shrink-0">
                        {clock(entry.timestamp)}
                      </span>
                      <span className="text-soft truncate">{describeAction(entry.action)}</span>
                      {entry.adminName ? (
                        <span className="text-faint truncate hidden sm:inline">
                          {entry.adminName}
                        </span>
                      ) : (
                        <span className="val text-[11px] text-faint truncate hidden sm:inline">
                          {entry.adminEmail || 'system'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </Sheet>
      )}
    </>
  );
}
