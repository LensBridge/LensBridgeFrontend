import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Settings, Calendar, Image, Play, BookOpen, 
  Crown, ChevronLeft, Save, RotateCcw, Monitor,
  Check, AlertCircle, Loader2, ChevronRight, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import BoardService from '../services/BoardService';

// Import sub-components
import BoardConfigEditor from '../components/board/BoardConfigEditor';
import EventsEditor from '../components/board/EventsEditor';
import PostersEditor from '../components/board/PostersEditor';
import FramesEditor from '../components/board/FramesEditor';
import WeeklyContentEditor from '../components/board/WeeklyContentEditor';

/**
 * BoardManagement - ROOT-only page for managing MusallahBoard configuration
 * Redesigned with improved UX, better navigation, and cleaner save flow
 */
function BoardManagement() {
  const { user, isLoading: authLoading } = useAuth();
  const boardConfigDraftRef = useRef(null);
  const [activeSection, setActiveSection] = useState('config');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Helper function to check if user has ROLE_ROOT permissions
  const hasRootPermissions = () => {
    if (!user) return false;
    return (
      (user.authorities && user.authorities.some(auth => auth.authority === 'ROLE_ROOT')) ||
      (user.roles && user.roles.some(role => role === 'ROLE_ROOT' || role === 'ROOT')) ||
      user.role === 'ROLE_ROOT'
    );
  };

  // Initial data state
  const [boardPayload, setBoardPayload] = useState({
    boardConfig: null,
    events: [],
    posters: [],
    weeklyContent: []
  });

  // Load data from API
  useEffect(() => {
    if (authLoading) return;
    if (!user || !hasRootPermissions()) {
      setLoading(false);
      return;
    }

    const loadBoardData = async () => {
      try {
        setLoading(true);
        const [config, events, posters, weeklyContent] = await Promise.all([
          BoardService.getConfig('brothers').catch(() => null),
          BoardService.getAllEvents().catch(() => []),
          BoardService.getAllPosters().catch(() => []),
          BoardService.getAllWeeklyContent().catch(() => [])
        ]);

        const initialConfig = config || {
          location: {
            city: 'Mississauga',
            country: 'Canada',
            latitude: 43.5890,
            longitude: -79.6441,
            timezone: 'America/Toronto',
            method: 2
          },
          boardLocation: 'brothers',
          posterCycleInterval: 10000,
          refreshAfterIshaMinutes: 30,
          darkModeAfterIsha: true,
          darkModeMinutesAfterIsha: 45,
          enableScrollingMessage: true,
          scrollingMessages: ['Welcome to UTM MSA - Follow us @utmmsa for updates!']
        };

        boardConfigDraftRef.current = initialConfig;
        setBoardPayload({
          boardConfig: initialConfig,
          events: events || [],
          posters: posters || [],
          weeklyContent: weeklyContent || []
        });
        setLoading(false);
      } catch (err) {
        console.error('Failed to load board data:', err);
        showToast('Failed to load board data', 'error');
        setLoading(false);
      }
    };

    loadBoardData();
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Update handlers
  const updateBoardConfig = useCallback((newConfig) => {
    boardConfigDraftRef.current = newConfig;
    setHasUnsavedChanges(true);
  }, []);

  const updateEvents = useCallback((newEvents) => {
    setBoardPayload(prev => ({ ...prev, events: newEvents }));
  }, []);

  const updatePosters = useCallback((newPosters) => {
    setBoardPayload(prev => ({ ...prev, posters: newPosters }));
  }, []);

  const updateWeeklyContent = useCallback((newContent) => {
    setBoardPayload(prev => ({ ...prev, weeklyContent: newContent }));
    setHasUnsavedChanges(true);
  }, []);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!hasRootPermissions()) {
      showToast('Permission denied', 'error');
      return;
    }

    try {
      setSaving(true);
      
      if (boardConfigDraftRef.current || boardPayload.boardConfig) {
        const configToSave = boardConfigDraftRef.current || boardPayload.boardConfig;
        const savedConfig = await BoardService.saveConfig(configToSave.boardLocation, configToSave);
        boardConfigDraftRef.current = savedConfig;
        setBoardPayload(prev => ({ ...prev, boardConfig: savedConfig }));
      }

      if (boardPayload.weeklyContent?.length > 0) {
        await Promise.all(boardPayload.weeklyContent.map(content => BoardService.saveWeeklyContent(content)));
      }
      
      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      showToast('All changes saved!', 'success');
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [boardPayload, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset changes
  const handleReset = useCallback(() => {
    if (confirm('Discard all unsaved changes?')) {
      window.location.reload();
    }
  }, []);

  // Handle location change - re-fetch config for the new musallah
  const handleLocationChange = useCallback(async (newLocation) => {
    try {
      const config = await BoardService.getConfig(newLocation);
      if (config) {
        boardConfigDraftRef.current = config;
        setBoardPayload(prev => ({ ...prev, boardConfig: config }));
        showToast(`Loaded ${newLocation} board config`);
      } else {
        // No config for this location, create default with new location
        const newConfig = {
          ...boardConfigDraftRef.current,
          boardLocation: newLocation
        };
        boardConfigDraftRef.current = newConfig;
        setBoardPayload(prev => ({ ...prev, boardConfig: newConfig }));
        setHasUnsavedChanges(true);
        showToast(`No config found for ${newLocation}, using defaults`);
      }
    } catch (err) {
      console.error('Failed to fetch config for location:', err);
      // Fallback: just update the location locally
      const newConfig = {
        ...boardConfigDraftRef.current,
        boardLocation: newLocation
      };
      boardConfigDraftRef.current = newConfig;
      setBoardPayload(prev => ({ ...prev, boardConfig: newConfig }));
      setHasUnsavedChanges(true);
    }
  }, [showToast]);

  // Refresh boards
  const handleRefreshBoards = useCallback(async () => {
    try {
      setSaving(true);
      await BoardService.refreshBoards();
      showToast('Boards refreshed!', 'success');
    } catch (err) {
      showToast('Refresh failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  // Navigation sections
  const sections = [
    { id: 'config', label: 'Settings', icon: Settings, description: 'Board configuration' },
    { id: 'events', label: 'Events', icon: Calendar, description: 'Manage events' },
    { id: 'posters', label: 'Posters', icon: Image, description: 'Upload posters' },
    { id: 'frames', label: 'Slideshow', icon: Play, description: 'Preview order' },
    { id: 'content', label: 'Weekly', icon: BookOpen, description: 'Verses & Hadith' }
  ];

  // Render section content
  const renderContent = () => {
    switch (activeSection) {
      case 'config':
        return <BoardConfigEditor config={boardPayload.boardConfig} onUpdate={updateBoardConfig} showMessage={showToast} onLocationChange={handleLocationChange} />;
      case 'events':
        return <EventsEditor events={boardPayload.events} onUpdate={updateEvents} showMessage={showToast} />;
      case 'posters':
        return <PostersEditor posters={boardPayload.posters} onUpdate={updatePosters} showMessage={showToast} />;
      case 'frames':
        return (
          <FramesEditor 
            posters={boardPayload.posters}
            boardLocation={boardPayload.boardConfig?.boardLocation || 'brothers'}
            onUpdatePosterDuration={(posterId, newDuration) => {
              updatePosters(boardPayload.posters.map(p => p.id === posterId ? { ...p, duration: newDuration } : p));
            }}
            showMessage={showToast}
          />
        );
      case 'content':
        return <WeeklyContentEditor weeklyContent={boardPayload.weeklyContent} onUpdate={updateWeeklyContent} showMessage={showToast} />;
      default:
        return null;
    }
  };

  // Access denied
  if (!authLoading && !hasRootPermissions()) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">Board Management requires ROOT access.</p>
          <Link to="/admin" className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Loading Board Data</h2>
          <p className="text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Save Banner */}
      {hasUnsavedChanges && (
        <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">You have unsaved changes</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleReset} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-amber-100 rounded-lg transition-colors">Discard</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors">
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving...</> : <><Save className="h-3.5 w-3.5" />Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Header */}
      <div className={`sticky ${hasUnsavedChanges ? 'top-[41px]' : 'top-0'} z-40 bg-white border-b border-gray-200 shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-indigo-600" />
                <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">Musallah Board</h1>
                <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Crown className="h-3 w-3" />ROOT
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleRefreshBoards} disabled={saving} className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <RotateCcw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh Boards</span>
              </button>

              {hasUnsavedChanges && (
                <button onClick={handleReset} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Discard">
                  <X className="h-5 w-5" />
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  hasUnsavedChanges ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                } ${saveSuccess ? 'bg-green-500' : ''}`}
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving...</span></> 
                  : saveSuccess ? <><Check className="h-4 w-4" /><span>Saved!</span></> 
                  : <><Save className="h-4 w-4" /><span>Save</span></>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden lg:sticky lg:top-24">
              {/* Mobile: Horizontal scroll */}
              <div className="lg:hidden flex overflow-x-auto p-2 gap-2 scrollbar-hide">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                        activeSection === section.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Desktop: Vertical list */}
              <div className="hidden lg:block p-2 space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                        isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isActive ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                        <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{section.label}</div>
                        <div className={`text-xs ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}>{section.description}</div>
                      </div>
                      {isActive && <ChevronRight className="h-4 w-4 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="hidden lg:block border-t border-gray-100 p-4 space-y-3">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Events</span><span className="font-semibold">{boardPayload.events.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Posters</span><span className="font-semibold">{boardPayload.posters.length}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Weekly</span><span className="font-semibold">{boardPayload.weeklyContent.length}</span></div>
              </div>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{sections.find(s => s.id === activeSection)?.label}</h2>
                    <p className="text-sm text-gray-500">{sections.find(s => s.id === activeSection)?.description}</p>
                  </div>
                  {hasUnsavedChanges && activeSection === 'config' && (
                    <span className="flex items-center gap-1.5 text-amber-600 text-sm bg-amber-50 px-3 py-1 rounded-full">
                      <AlertCircle className="h-4 w-4" />Unsaved
                    </span>
                  )}
                </div>
              </div>
              <div className="p-6">{renderContent()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-slideUp ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="p-1 hover:bg-white/20 rounded"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Mobile Save Bar */}
      {hasUnsavedChanges && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30 shadow-lg animate-slideUp">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Unsaved changes</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleReset} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Discard</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Save className="h-4 w-4" />Save</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default BoardManagement;
