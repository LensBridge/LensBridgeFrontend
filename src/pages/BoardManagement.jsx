import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Calendar, Image, Play, BookOpen,
  Crown, ChevronLeft, RotateCcw, Monitor,
  Check, AlertCircle, ChevronRight, X, Wifi, WifiOff, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rolesOf } from '../utils/auth';
import { PERMISSIONS, ROLE_TONE } from '../utils/permissions';
import BoardService from '../services/BoardService';
import { useDeviceList } from '../hooks/useDeviceList';

import EventsEditor from '../components/board/EventsEditor';
import PostersEditor from '../components/board/PostersEditor';
import FramesEditor from '../components/board/FramesEditor';
import WeeklyContentEditor from '../components/board/WeeklyContentEditor';

/**
 * BoardManagement — the content that feeds every board.
 *
 * Scope note: everything here is fleet-wide and audience-scoped. Per-device
 * settings (location, night mode, ticker text) live on the device itself —
 * see /admin/devices/:deviceId. The Slideshow tab is the one place the two
 * meet, because frames are assembled per device.
 *
 * The route guard decides who gets in at all; every tab, button, and counter
 * below asks for the one permission it actually needs, so a BOARD_VIEWER lands
 * on a coherent read-only page rather than a wall of controls that 403.
 */

const SECTIONS = [
  { id: 'events', label: 'Events', icon: Calendar, description: 'Calendar entries', permission: PERMISSIONS.BOARD_CONTENT_READ },
  { id: 'posters', label: 'Posters', icon: Image, description: 'Uploaded artwork', permission: PERMISSIONS.BOARD_CONTENT_READ },
  { id: 'content', label: 'Weekly', icon: BookOpen, description: 'Verse, hadith, Jummah', permission: PERMISSIONS.BOARD_CONTENT_READ },
  { id: 'frames', label: 'Slideshow', icon: Play, description: 'Live per-board preview', permission: PERMISSIONS.BOARD_CONFIG_READ }
];

/** Most-privileged first, so the badge names the role that explains the page. */
const ROLE_PRECEDENCE = ['ROOT', 'BOARD_ADMIN', 'BOARD_EDITOR', 'BOARD_VIEWER', 'ADMIN'];

const ROLE_BADGE_CLASS = {
  root: 'bg-amber-100 text-amber-700',
  elevated: 'bg-indigo-100 text-indigo-700',
  standard: 'bg-emerald-100 text-emerald-700',
  readonly: 'bg-gray-100 text-gray-600'
};

const TOAST_MS = 4000;

function BoardManagement() {
  const { user, isLoading: authLoading, can } = useAuth();
  const [requestedSection, setRequestedSection] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState({ events: [], posters: [], weeklyContent: [] });

  const canReadContent = can(PERMISSIONS.BOARD_CONTENT_READ);
  const canReadDevices = can(PERMISSIONS.BOARD_DEVICE_READ);

  const { devices, loading: devicesLoading } = useDeviceList({ enabled: canReadDevices });

  const sections = useMemo(() => SECTIONS.filter(s => can(s.permission)), [can]);
  const activeSection = sections.some(s => s.id === requestedSection)
    ? requestedSection
    : sections[0]?.id;

  const roleBadge = useMemo(() => {
    const held = new Set(rolesOf(user));
    return ROLE_PRECEDENCE.find(role => held.has(`ROLE_${role}`)) ?? null;
  }, [user]);

  const fleet = useMemo(() => {
    const active = devices.filter(d => !d.revokedAt);
    return { total: active.length, online: active.filter(d => d.status === 'online').length };
  }, [devices]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!canReadContent) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Each section degrades independently — one failing endpoint shouldn't
    // blank the whole page, so failures resolve to an empty list and the
    // corresponding tab just shows its empty state.
    (async () => {
      const [events, posters, weeklyContent] = await Promise.all([
        BoardService.getAllEvents().catch(() => null),
        BoardService.getAllPosters().catch(() => null),
        BoardService.getAllWeeklyContent().catch(() => null)
      ]);

      if (cancelled) return;

      setContent({
        events: events ?? [],
        posters: posters ?? [],
        weeklyContent: weeklyContent ?? []
      });
      if (events === null || posters === null || weeklyContent === null) {
        showToast('Some board data failed to load', 'error');
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [authLoading, canReadContent, showToast]);

  const updateEvents = useCallback((events) => {
    setContent(prev => ({ ...prev, events }));
  }, []);

  const updatePosters = useCallback((posters) => {
    setContent(prev => ({ ...prev, posters }));
  }, []);

  // Weekly content persists itself per-week via the editor
  // (PUT /weekly-content/{year}/{week}); this only mirrors server state.
  const updateWeeklyContent = useCallback((weeklyContent) => {
    setContent(prev => ({ ...prev, weeklyContent }));
  }, []);

  const handleRefreshBoards = useCallback(async () => {
    setRefreshing(true);
    try {
      await BoardService.refreshBoards();
      showToast('Refresh pushed to all boards');
    } catch (err) {
      showToast(`Refresh failed: ${err.message}`, 'error');
    } finally {
      setRefreshing(false);
    }
  }, [showToast]);

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <h2 className="mb-1 text-xl font-semibold text-gray-900">Loading Board Data</h2>
          <p className="text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  const section = sections.find(s => s.id === activeSection);

  const renderContent = () => {
    switch (activeSection) {
      case 'events':
        return <EventsEditor events={content.events} onUpdate={updateEvents} showMessage={showToast} />;
      case 'posters':
        return <PostersEditor posters={content.posters} onUpdate={updatePosters} showMessage={showToast} />;
      case 'content':
        return <WeeklyContentEditor weeklyContent={content.weeklyContent} onUpdate={updateWeeklyContent} showMessage={showToast} />;
      case 'frames':
        return <FramesEditor devices={devices} devicesLoading={devicesLoading} showMessage={showToast} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="rounded-lg p-2 transition-colors hover:bg-gray-100">
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-indigo-600" />
                <h1 className="hidden text-lg font-semibold text-gray-900 sm:block">Musallah Board</h1>
                {roleBadge && (
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      ROLE_BADGE_CLASS[ROLE_TONE[roleBadge]] || ROLE_BADGE_CLASS.readonly
                    }`}
                    title="What this account can do here is decided per permission, not by this name"
                  >
                    {roleBadge === 'ROOT'
                      ? <Crown className="h-3 w-3" />
                      : <ShieldCheck className="h-3 w-3" />}
                    {roleBadge.replace('BOARD_', '')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canReadDevices && (
                <Link
                  to="/admin/devices"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100"
                  title="Manage enrolled boards"
                >
                  {fleet.online > 0
                    ? <Wifi className="h-4 w-4 text-green-600" />
                    : <WifiOff className="h-4 w-4 text-gray-400" />}
                  <span className="hidden sm:inline">{fleet.online}/{fleet.total} online</span>
                </Link>
              )}
              {can(PERMISSIONS.BOARD_REFRESH) && (
                <button
                  type="button"
                  onClick={handleRefreshBoards}
                  disabled={refreshing}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
                >
                  <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh Boards</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {sections.length === 0 ? (
          // Reachable with `board:device:read` alone — every tab here needs a
          // content or config read, so send them where their grant is useful.
          <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <Monitor className="mx-auto mb-4 h-10 w-10 text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900">Nothing to edit here</h2>
            <p className="mt-2 text-sm text-gray-500">
              Your account can see the device fleet but not board content or configuration.
            </p>
            <Link
              to="/admin/devices"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              Go to devices
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex-shrink-0 lg:w-64">
              <nav className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-24">
                {/* Mobile: horizontal scroll */}
                <div className="scrollbar-hide flex gap-2 overflow-x-auto p-2 lg:hidden">
                  {sections.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRequestedSection(id)}
                      className={`flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2 font-medium transition-all ${
                        activeSection === id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {/* Desktop: vertical list */}
                <div className="hidden space-y-1 p-2 lg:block">
                  {sections.map(({ id, label, icon: Icon, description }) => {
                    const isActive = activeSection === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRequestedSection(id)}
                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                          isActive ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`rounded-lg p-2 ${isActive ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                          <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{label}</div>
                          <div className={`text-xs ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}>{description}</div>
                        </div>
                        {isActive && <ChevronRight className="h-4 w-4 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>

                <div className="hidden space-y-3 border-t border-gray-100 p-4 lg:block">
                  {canReadContent && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Events</span>
                        <span className="font-semibold">{content.events.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Posters</span>
                        <span className="font-semibold">{content.posters.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Weeks filled</span>
                        <span className="font-semibold">{content.weeklyContent.length}</span>
                      </div>
                    </>
                  )}
                  {canReadDevices && (
                    <Link
                      to="/admin/devices"
                      className={`flex justify-between text-sm hover:text-indigo-600 ${
                        canReadContent ? 'border-t border-gray-100 pt-3' : ''
                      }`}
                    >
                      <span className="text-gray-500">Boards</span>
                      <span className="font-semibold">{fleet.total}</span>
                    </Link>
                  )}
                </div>
              </nav>
            </div>

            <div className="min-w-0 flex-1">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                  <h2 className="text-lg font-semibold text-gray-900">{section?.label}</h2>
                  <p className="text-sm text-gray-500">{section?.description}</p>
                </div>
                <div className="p-6">{renderContent()}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className={`animate-fadeInUp fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="rounded p-1 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default BoardManagement;
