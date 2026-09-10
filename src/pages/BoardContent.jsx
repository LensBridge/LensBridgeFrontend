import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Image as ImageIcon, Layers, RefreshCw, Share2 } from 'lucide-react';
import { PageHeader, Panel, Tabs, Button, ErrorNote, Skeleton, useToast } from '../components/ui';
import Can from '../components/Can';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/permissions';
import BoardService from '../services/BoardService';
import { useDeviceList } from '../hooks/useDeviceList';

import EventsEditor from '../components/board/EventsEditor';
import PostersEditor from '../components/board/PostersEditor';
import SocialsEditor from '../components/board/SocialsEditor';
import WeeklyContentEditor from '../components/board/WeeklyContentEditor';
import FramesEditor from '../components/board/FramesEditor';

/**
 * The content that feeds every board.
 *
 * Scope: everything on this page is fleet-wide and audience-scoped. Per-device
 * settings — coordinates, night mode, the ticker — belong to the device and
 * live under Displays. The Slideshow tab is the one place the two meet, because
 * frames are assembled per device.
 *
 * The route guard decides who gets through the door; every tab below asks for
 * the narrowest permission that makes it worth opening, so a BOARD_VIEWER lands
 * on a coherent read-only page rather than a wall of controls that 403.
 *
 * All four content types are fetched once, up front, and held here. They are
 * small lists that every tab wants and the tabs mutate them in place, so a
 * per-tab fetch would mean refetching a list the user just edited.
 */
const TABS = [
  {
    id: 'events',
    label: 'Events',
    icon: CalendarDays,
    permission: PERMISSIONS.BOARD_CONTENT_READ,
  },
  { id: 'posters', label: 'Posters', icon: ImageIcon, permission: PERMISSIONS.BOARD_CONTENT_READ },
  { id: 'socials', label: 'Socials', icon: Share2, permission: PERMISSIONS.BOARD_CONTENT_READ },
  { id: 'weekly', label: 'Weekly', icon: BookOpen, permission: PERMISSIONS.BOARD_CONTENT_READ },
  { id: 'frames', label: 'Slideshow', icon: Layers, permission: PERMISSIONS.BOARD_CONFIG_READ },
];

export default function BoardContent() {
  const { can } = useAuth();
  const toast = useToast();

  const canReadContent = can(PERMISSIONS.BOARD_CONTENT_READ);
  const canReadDevices = can(PERMISSIONS.BOARD_DEVICE_READ);

  const { devices, loading: devicesLoading } = useDeviceList({ enabled: canReadDevices });

  const [content, setContent] = useState({ events: [], posters: [], socials: [], weekly: [] });
  const [loading, setLoading] = useState(canReadContent);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = useMemo(() => TABS.filter((t) => can(t.permission)), [can]);
  const [requested, setRequested] = useState(null);
  const active = tabs.some((t) => t.id === requested) ? requested : tabs[0]?.id;

  const load = useCallback(async () => {
    if (!canReadContent) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [events, posters, socials, weekly] = await Promise.all([
        BoardService.getAllEvents(),
        BoardService.getAllPosters(),
        BoardService.getAllSocials(),
        BoardService.getAllWeeklyContent(),
      ]);
      setContent({ events, posters, socials, weekly });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [canReadContent]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (key) => (next) => setContent((c) => ({ ...c, [key]: next }));

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

  const counts = {
    events: content.events.length,
    posters: content.posters.length,
    socials: content.socials.length,
    weekly: content.weekly.length,
  };

  return (
    <>
      <PageHeader
        title="Content"
        description="Manage content across MinbarApp and MusallahBoard"
        actions={
          <Can permission={PERMISSIONS.BOARD_REFRESH}>
            <Button icon={RefreshCw} loading={refreshing} onClick={pushRefresh}>
              Refresh boards
            </Button>
          </Can>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorNote onRetry={load}>{error}</ErrorNote>
        </div>
      )}

      <Tabs
        className="mb-6"
        value={active}
        onChange={setRequested}
        tabs={tabs.map((t) => ({ ...t, count: counts[t.id] }))}
      />

      {loading && active !== 'frames' ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {active === 'events' && (
            <EventsEditor events={content.events} onUpdate={patch('events')} />
          )}
          {active === 'posters' && (
            <PostersEditor posters={content.posters} onUpdate={patch('posters')} />
          )}
          {active === 'socials' && (
            <SocialsEditor socials={content.socials} onUpdate={patch('socials')} />
          )}
          {active === 'weekly' && (
            <WeeklyContentEditor weeklyContent={content.weekly} onUpdate={patch('weekly')} />
          )}
          {active === 'frames' &&
            (canReadDevices ? (
              <FramesEditor devices={devices} devicesLoading={devicesLoading} />
            ) : (
              <Panel>
                <p className="text-[13px] text-muted">
                  The slideshow preview needs <code className="font-mono">board:device:read</code>{' '}
                  as well — frames are assembled per device, so there is no fleet-wide preview to
                  show.
                </p>
              </Panel>
            ))}
        </>
      )}
    </>
  );
}
