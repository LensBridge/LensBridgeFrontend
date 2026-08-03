import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Calendar, Image, Play, BookOpen,
  Crown, ChevronLeft, RotateCcw, Monitor,
  Check, AlertCircle, ChevronRight, X, Wifi, WifiOff
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isRoot } from '../utils/auth';
import BoardService from '../services/BoardService';
import { useDeviceList } from '../hooks/useDeviceList';

import EventsEditor from '../components/board/EventsEditor';
import PostersEditor from '../components/board/PostersEditor';
import FramesEditor from '../components/board/FramesEditor';
import WeeklyContentEditor from '../components/board/WeeklyContentEditor';

/**
 * BoardManagement — ROOT-only page for the content that feeds every board.
 *
 * Scope note: everything here is fleet-wide and audience-scoped. Per-device
 * settings (location, night mode, ticker text) live on the device itself —
 * see /admin/devices/:deviceId. The Slideshow tab is the one place the two
 * meet, because frames are assembled per device.
 */

const SECTIONS = [
  { id: 'events', label: 'Events', icon: Calendar, description: 'Calendar entries' },
  { id: 'posters', label: 'Posters', icon: Image, description: 'Uploaded artwork' },
  { id: 'content', label: 'Weekly', icon: BookOpen, description: 'Verse, hadith, Jummah' },
  { id: 'frames', label: 'Slideshow', icon: Play, description: 'Live per-board preview' }
];

const TOAST_MS = 4000;

function BoardManagement() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState('events');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [content, setContent] = useState({ events: [], posters: [], weeklyContent: [] });

  const isRootUser = isRoot(user);
  const { devices, loading: devicesLoading } = useDeviceList();

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
    if (!isRootUser) {
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
  }, [authLoading, isRootUser, showToast]);

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

  if (!authLoading && !isRootUser) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Crown className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h2>
          <p className="mb-6 text-gray-600">Board Management requires ROOT access.</p>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

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

  const section = SECTIONS.find(s => s.id === activeSection);

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
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  <Crown className="h-3 w-3" />ROOT
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={handleRefreshBoards}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                <RotateCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Boards</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-shrink-0 lg:w-64">
            <nav className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:sticky lg:top-24">
              {/* Mobile: horizontal scroll */}
              <div className="scrollbar-hide flex gap-2 overflow-x-auto p-2 lg:hidden">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
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
                {SECTIONS.map(({ id, label, icon: Icon, description }) => {
                  const isActive = activeSection === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveSection(id)}
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
                <Link
                  to="/admin/devices"
                  className="flex justify-between border-t border-gray-100 pt-3 text-sm hover:text-indigo-600"
                >
                  <span className="text-gray-500">Boards</span>
                  <span className="font-semibold">{fleet.total}</span>
                </Link>
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
