import { useState, useCallback, memo, useEffect } from 'react';
import { 
  Settings, Calendar, Image, Play, BookOpen, 
  Crown, ChevronLeft, Save, RotateCcw, Monitor,
  MapPin, Clock, Users, Sun, Moon, MessageSquare, Sunrise, Loader
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
import JummahEditor from '../components/board/JummahEditor';

/**
 * BoardManagement - ROOT-only page for managing MusallahBoard configuration
 * Provides comprehensive editing for board config, events, posters, frames, and daily content
 */
function BoardManagement() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('config');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Helper function to check if user has ROLE_ROOT permissions
  const hasRootPermissions = () => {
    if (!user) return false;
    return (
      (user.authorities && user.authorities.some(auth => auth.authority === 'ROLE_ROOT')) ||
      (user.roles && user.roles.some(role => role === 'ROLE_ROOT' || role === 'ROOT')) ||
      user.role === 'ROLE_ROOT'
    );
  };

  // Initial data state (will be populated from API)
  const [boardPayload, setBoardPayload] = useState({
    boardConfig: null,
    jummahSchedules: [],
    events: [],
    posters: [],
    weeklyContent: []
  });

  // Load data from API
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user || !hasRootPermissions()) {
      setError('You do not have permission to access this page');
      setLoading(false);
      return;
    }

    const loadBoardData = async () => {
      try {
        setLoading(true);
        
        // Load all data in parallel
        const [config, events, posters, weeklyContent] = await Promise.all([
          BoardService.getConfig('brothers').catch(() => null), // Default to brothers, will add selector later
          BoardService.getAllEvents().catch(() => []),
          BoardService.getAllPosters().catch(() => []),
          BoardService.getAllWeeklyContent().catch(() => [])
        ]);

        setBoardPayload({
          boardConfig: config || {
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
            scrollingMessage: 'Welcome to UTM MSA - Follow us @utmmsa for updates!'
          },
          jummahSchedules: [], // Will be part of weeklyContent now
          events: events || [],
          posters: posters || [],
          weeklyContent: weeklyContent || []
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load board data:', err);
        showMessage('Failed to load board data: ' + err.message, true);
        setLoading(false);
      }
    };

    loadBoardData();
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMessage = useCallback((message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  }, []);

  // Update handlers that mark changes as unsaved
  const updateBoardConfig = useCallback((newConfig) => {
    setBoardPayload(prev => ({
      ...prev,
      boardConfig: newConfig
    }));
    setHasUnsavedChanges(true);
  }, []);

  const updateJummahSchedules = useCallback((newSchedules) => {
    setBoardPayload(prev => ({
      ...prev,
      jummahSchedules: newSchedules
    }));
    setHasUnsavedChanges(true);
  }, []);

  const updateEvents = useCallback((newEvents) => {
    setBoardPayload(prev => ({
      ...prev,
      events: newEvents
    }));
    setHasUnsavedChanges(true);
  }, []);

  const updatePosters = useCallback((newPosters) => {
    setBoardPayload(prev => ({
      ...prev,
      posters: newPosters
    }));
    setHasUnsavedChanges(true);
  }, []);

  const updateFrames = useCallback((newFrames) => {
    setBoardPayload(prev => ({
      ...prev,
      frames: newFrames
    }));
    setHasUnsavedChanges(true);
  }, []);

  const updateWeeklyContent = useCallback((newContent) => {
    setBoardPayload(prev => ({
      ...prev,
      weeklyContent: newContent
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Save all changes to API
  const handleSave = useCallback(async () => {
    if (!hasRootPermissions()) {
      showMessage('You do not have permission to save changes', true);
      return;
    }

    try {
      setSaving(true);
      
      // Save board config
      if (boardPayload.boardConfig) {
        await BoardService.saveConfig(
          boardPayload.boardConfig.boardLocation,
          boardPayload.boardConfig
        );
      }

      // Save all weekly content
      if (boardPayload.weeklyContent && boardPayload.weeklyContent.length > 0) {
        await Promise.all(
          boardPayload.weeklyContent.map(content => 
            BoardService.saveWeeklyContent(content)
          )
        );
      }

      // Note: Events and posters should be saved individually through their editors
      // as they are created/updated/deleted with immediate API calls
      
      showMessage('✅ All changes saved successfully');
      setHasUnsavedChanges(false);
      setSaving(false);
    } catch (err) {
      console.error('Failed to save:', err);
      showMessage('Failed to save changes: ' + err.message, true);
      setSaving(false);
    }
  }, [boardPayload, showMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to initial state by reloading from API
  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to discard all unsaved changes and reload from the server?')) {
      window.location.reload(); // Simple approach: reload the page
    }
  }, []);

  // Tab definitions
  const tabs = [
    { id: 'config', label: 'Board Config', icon: Settings, description: 'Location and display options' },
    { id: 'jummah', label: 'Jummah', icon: Sunrise, description: 'Friday prayer schedules' },
    { id: 'events', label: 'Events', icon: Calendar, description: 'Upcoming events and schedule' },
    { id: 'posters', label: 'Posters', icon: Image, description: 'Promotional posters and media' },
    { id: 'frames', label: 'Slideshow', icon: Play, description: 'Frame order and timing' },
    { id: 'content', label: 'Weekly Content', icon: BookOpen, description: 'Verse and Hadith for each week of the year' }
  ];

  // Render the appropriate tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'config':
        return (
          <BoardConfigEditor 
            config={boardPayload.boardConfig} 
            onUpdate={updateBoardConfig}
            showMessage={showMessage}
          />
        );
      case 'jummah':
        return (
          <JummahEditor 
            jummahSchedules={boardPayload.jummahSchedules} 
            onUpdate={updateJummahSchedules}
            showMessage={showMessage}
          />
        );
      case 'events':
        return (
          <EventsEditor 
            events={boardPayload.events} 
            onUpdate={updateEvents}
            showMessage={showMessage}
          />
        );
      case 'posters':
        return (
          <PostersEditor 
            posters={boardPayload.posters} 
            onUpdate={updatePosters}
            showMessage={showMessage}
          />
        );
      case 'frames':
        return (
          <FramesEditor 
            posters={boardPayload.posters}
            onUpdatePosterDuration={(posterId, newDuration) => {
              updatePosters(
                boardPayload.posters.map(p => 
                  p.id === posterId ? { ...p, duration: newDuration } : p
                )
              );
            }}
            showMessage={showMessage}
          />
        );
      case 'content':
        return (
          <WeeklyContentEditor 
            weeklyContent={boardPayload.weeklyContent} 
            onUpdate={updateWeeklyContent}
            showMessage={showMessage}
          />
        );
      default:
        return null;
    }
  };

  if (!authLoading && !hasRootPermissions()) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <Crown className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">
            Board Management requires ROOT access. Please contact a system administrator.
          </p>
          <Link
            to="/admin"
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <div className="animate-spin h-16 w-16 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Board Configuration</h2>
          <p className="text-gray-600">Please wait while we fetch the board data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/admin"
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <Monitor className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Musallah Board Management</h1>
                <Crown className="h-5 w-5 text-yellow-300" title="ROOT Access Required" />
              </div>
              <p className="text-white/80 mt-1">
                Configure display boards for the prayer hall
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {hasUnsavedChanges && (
              <span className="bg-yellow-500/20 text-yellow-100 px-3 py-1 rounded-full text-sm font-medium">
                Unsaved Changes
              </span>
            )}
            <button
              onClick={handleReset}
              disabled={!hasUnsavedChanges}
              className="bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
              className="bg-white text-indigo-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Current Board Location Indicator */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${boardPayload.boardConfig.boardLocation === 'brothers' ? 'bg-blue-100' : 'bg-pink-100'}`}>
              <Users className={`h-5 w-5 ${boardPayload.boardConfig.boardLocation === 'brothers' ? 'text-blue-600' : 'text-pink-600'}`} />
            </div>
            <div>
              <span className="text-sm text-gray-500">Editing Board:</span>
              <span className="ml-2 font-semibold text-gray-900 capitalize">
                {boardPayload.boardConfig.boardLocation} Musallah
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4" />
              <span>{boardPayload.boardConfig.location.city}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{boardPayload.boardConfig.location.timezone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-1 p-2 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon, description }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                  activeTab === id
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">{boardPayload.events.length}</div>
          <div className="text-sm text-gray-500">Events</div>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{boardPayload.posters.length}</div>
          <div className="text-sm text-gray-500">Posters</div>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{boardPayload.weeklyContent.length}</div>
          <div className="text-sm text-gray-500">Days Configured</div>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{boardPayload.jummahSchedules.length}</div>
          <div className="text-sm text-gray-500">Jummah Schedules</div>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
          <div className={`text-2xl font-bold ${boardPayload.boardConfig.darkModeAfterIsha ? 'text-gray-800' : 'text-yellow-500'}`}>
            {boardPayload.boardConfig.darkModeAfterIsha ? <Moon className="h-6 w-6 mx-auto" /> : <Sun className="h-6 w-6 mx-auto" />}
          </div>
          <div className="text-sm text-gray-500">Night Mode</div>
        </div>
      </div>
    </div>
  );
}

export default BoardManagement;
