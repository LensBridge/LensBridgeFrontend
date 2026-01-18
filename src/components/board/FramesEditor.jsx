import { useState, useMemo, useCallback, memo } from 'react';
import { 
  Calendar, Image, Quote, Instagram, Clock, 
  Lock, Monitor, Layers, AlertCircle, CheckCircle, Edit2
} from 'lucide-react';

/**
 * FramesEditor - Display slideshow frame order
 * Shows fixed system frames and posters from backend in predetermined order
 * Allows editing poster durations
 */
function FramesEditor({ posters, onUpdatePosterDuration, showMessage }) {
  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0];

  // Filter posters active today
  const todayPosters = useMemo(() => {
    return posters.filter(poster => {
      const startDate = poster.startDate;
      const endDate = poster.endDate;
      return (!startDate || startDate <= today) && (!endDate || endDate >= today);
    });
  }, [posters, today]);

  // System frames that appear before posters (fixed order, non-editable)
  const systemFramesBefore = [
    { 
      id: 'system-week-at-glance',
      type: 'weekAtGlance', 
      label: 'Week at a Glance', 
      icon: Calendar, 
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      description: 'Shows upcoming events for the week',
      duration: 'auto'
    },
    { 
      id: 'system-today',
      type: 'today', 
      label: "Today's Schedule", 
      icon: Calendar, 
      color: 'bg-green-100 text-green-700 border-green-200',
      description: "Shows today's events and prayer times",
      duration: 'auto'
    },
    { 
      id: 'system-next-prayer',
      type: 'nextPrayer', 
      label: 'Next Prayer', 
      icon: Clock, 
      color: 'bg-amber-100 text-amber-700 border-amber-200',
      description: 'Countdown to the next prayer time',
      duration: 'auto'
    }
  ];

  // System frames that appear after posters (fixed order, non-editable)
  const systemFramesAfter = [
    { 
      id: 'system-quotes',
      type: 'quotes', 
      label: 'Islamic Quotes', 
      icon: Quote, 
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      description: 'Shows verse and hadith of the day',
      duration: 'auto'
    },
    { 
      id: 'system-social',
      type: 'socialMediaPromotion', 
      label: 'Social Media', 
      icon: Instagram, 
      color: 'bg-pink-100 text-pink-700 border-pink-200',
      description: 'Promote social media accounts',
      duration: 'auto'
    }
  ];

  // Audience options for display
  const audienceLabels = {
    both: { label: 'Everyone', color: 'bg-purple-100 text-purple-700' },
    brothers: { label: 'Brothers', color: 'bg-blue-100 text-blue-700' },
    sisters: { label: 'Sisters', color: 'bg-pink-100 text-pink-700' }
  };

  // Calculate total slideshow duration (approximate)
  const totalDuration = useMemo(() => {
    const systemDuration = (systemFramesBefore.length + systemFramesAfter.length) * 10000; // 10s each for auto
    const posterDuration = todayPosters.reduce((acc, p) => acc + (p.duration || 10000), 0);
    return systemDuration + posterDuration;
  }, [todayPosters]);

  // Build complete slideshow sequence for preview
  const slideshowSequence = useMemo(() => {
    const sequence = [];
    
    // Add system frames before
    systemFramesBefore.forEach(frame => {
      sequence.push({ ...frame, isSystem: true });
    });
    
    // Add posters
    todayPosters.forEach(poster => {
      sequence.push({
        id: `poster-${poster.id}`,
        type: 'poster',
        label: poster.title,
        icon: Image,
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        duration: poster.duration || 10000,
        poster: poster,
        isSystem: false
      });
    });
    
    // Add system frames after
    systemFramesAfter.forEach(frame => {
      sequence.push({ ...frame, isSystem: true });
    });
    
    return sequence;
  }, [todayPosters]);

  // System Frame Card Component
  const SystemFrameCard = ({ frame, index }) => {
    const Icon = frame.icon;
    return (
      <div
        className="bg-gray-50 border border-gray-200 rounded-lg p-4 opacity-75 animate-fadeInUp"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-center space-x-4">
          {/* Lock Icon (not draggable) */}
          <div className="text-gray-400">
            <Lock className="h-5 w-5" />
          </div>

          {/* Frame Number */}
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
            {index + 1}
          </div>

          {/* Frame Type Badge */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${frame.color}`}>
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{frame.label}</span>
          </div>

          {/* Description */}
          <div className="flex-1 text-sm text-gray-500">
            {frame.description}
          </div>

          {/* Duration */}
          <div className="flex items-center text-sm text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            <span>Auto</span>
          </div>

          {/* System indicator */}
          <div className="px-2 py-1 bg-gray-200 text-gray-500 text-xs rounded-full font-medium">
            System
          </div>
        </div>
      </div>
    );
  };

  // Duration options for posters
  const durationOptions = [
    { value: 5000, label: '5s' },
    { value: 8000, label: '8s' },
    { value: 10000, label: '10s' },
    { value: 12000, label: '12s' },
    { value: 15000, label: '15s' },
    { value: 20000, label: '20s' },
    { value: 30000, label: '30s' }
  ];

  // Handle poster duration change
  const handleDurationChange = useCallback((posterId, newDuration) => {
    if (onUpdatePosterDuration) {
      onUpdatePosterDuration(posterId, parseInt(newDuration));
      showMessage('✅ Poster duration updated');
    }
  }, [onUpdatePosterDuration, showMessage]);

  // Poster Frame Card Component
  const PosterFrameCard = ({ poster, index }) => {
    const audience = audienceLabels[poster.audience] || audienceLabels.both;
    const [isEditingDuration, setIsEditingDuration] = useState(false);
    
    return (
      <div
        className="bg-white border border-purple-200 rounded-lg p-4 animate-fadeInUp"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex items-center space-x-4">
          {/* Order indicator (not draggable) */}
          <div className="text-purple-400">
            <Image className="h-5 w-5" />
          </div>

          {/* Frame Number */}
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white">
            {index + 1}
          </div>

          {/* Poster Thumbnail */}
          <div className="w-16 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
            <img
              src={poster.image}
              alt={poster.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="10">?</text></svg>';
              }}
            />
          </div>

          {/* Poster Info */}
          <div className="flex-1 min-w-0">
            <h5 className="font-medium text-gray-900 truncate">{poster.title}</h5>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span className={`px-2 py-0.5 rounded-full ${audience.color}`}>
                {audience.label}
              </span>
              {poster.startDate && (
                <span>{poster.startDate} - {poster.endDate || 'ongoing'}</span>
              )}
            </div>
          </div>

          {/* Duration - Editable */}
          <div className="flex items-center space-x-2">
            {isEditingDuration ? (
              <select
                value={poster.duration || 10000}
                onChange={(e) => {
                  handleDurationChange(poster.id, e.target.value);
                  setIsEditingDuration(false);
                }}
                onBlur={() => setIsEditingDuration(false)}
                autoFocus
                className="border border-purple-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                {durationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <button
                onClick={() => setIsEditingDuration(true)}
                className="flex items-center space-x-1 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2 py-1 rounded-lg transition-all group"
                title="Click to edit duration"
              >
                <Clock className="h-4 w-4" />
                <span className="font-medium">{(poster.duration || 10000) / 1000}s</span>
                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          {/* Active indicator */}
          <div className="flex items-center text-green-600">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Slideshow Order</h3>
          <p className="text-sm text-gray-500">
            {slideshowSequence.length} frames • ~{Math.round(totalDuration / 1000)}s total cycle
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-slideDown">
        <div className="flex items-start space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
            <Lock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900">Fixed Slideshow Order</h4>
            <p className="text-sm text-blue-700 mt-1">
              The slideshow displays in a fixed order: system frames first (Week at a Glance, Today's Schedule, Next Prayer), 
              followed by active posters, then Islamic Quotes and Social Media. Poster order is determined by the backend.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Preview */}
      <div className="bg-gray-100 rounded-lg p-4 animate-fadeInUp">
        <div className="flex items-center space-x-2 mb-2">
          <Monitor className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Slideshow Preview</span>
        </div>
        <div className="flex space-x-1 overflow-x-auto pb-2">
          {slideshowSequence.map((frame, index) => {
            const Icon = frame.icon;
            const width = frame.duration === 'auto' 
              ? 10 
              : Math.max(5, Math.min(30, ((frame.duration || 10000) / 1000) * 2));
            
            return (
              <div
                key={frame.id}
                className={`h-8 rounded flex items-center justify-center text-xs font-medium transition-all ${
                  frame.isSystem ? 'opacity-60' : ''
                } ${frame.color}`}
                style={{ minWidth: `${width * 4}px`, animationDelay: `${index * 30}ms` }}
                title={`${frame.label} - ${frame.duration === 'auto' ? 'auto' : `${(frame.duration || 10000) / 1000}s`}`}
              >
                <Icon className="h-3 w-3" />
              </div>
            );
          })}
        </div>
      </div>

      {/* System Frames Before (Fixed) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Lock className="h-4 w-4 text-gray-400" />
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">System Frames (Start)</h4>
        </div>
        <div className="space-y-2">
          {systemFramesBefore.map((frame, index) => (
            <SystemFrameCard key={frame.id} frame={frame} index={index + 1} />
          ))}
        </div>
      </div>

      {/* Posters Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Image className="h-4 w-4 text-purple-500" />
          <h4 className="text-sm font-medium text-purple-700 uppercase tracking-wide">
            Active Posters ({todayPosters.length})
          </h4>
        </div>
        
        {todayPosters.length === 0 ? (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center animate-fadeIn">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-purple-400" />
            <p className="font-medium text-purple-700">No posters scheduled for today</p>
            <p className="text-sm text-purple-500 mt-1">
              Add posters in the Posters tab to display them in the slideshow
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayPosters.map((poster, index) => (
              <PosterFrameCard 
                key={poster.id} 
                poster={poster} 
                index={systemFramesBefore.length + index + 1} 
              />
            ))}
          </div>
        )}
      </div>

      {/* System Frames After (Fixed) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Lock className="h-4 w-4 text-gray-400" />
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">System Frames (End)</h4>
        </div>
        <div className="space-y-2">
          {systemFramesAfter.map((frame, index) => (
            <SystemFrameCard 
              key={frame.id} 
              frame={frame} 
              index={systemFramesBefore.length + todayPosters.length + index + 1} 
            />
          ))}
        </div>
      </div>

      {/* Frame Type Legend */}
      <div className="bg-gray-50 rounded-lg p-4 animate-fadeInUp">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Layers className="h-4 w-4 mr-2" />
          Frame Types
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[...systemFramesBefore, { type: 'poster', label: 'Poster', color: 'bg-purple-100' }, ...systemFramesAfter].map(ft => (
            <div key={ft.type} className="flex items-center space-x-2 text-sm group">
              <div className={`w-4 h-4 rounded transition-transform group-hover:scale-125 ${ft.color.split(' ')[0]}`} />
              <span className="text-gray-600">{ft.label}</span>
              {ft.type === 'poster' && (
                <span className="text-gray-400">({todayPosters.length})</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(FramesEditor);
