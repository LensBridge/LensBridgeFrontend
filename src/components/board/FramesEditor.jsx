import { useState, useMemo, memo } from 'react';
import { 
  Calendar, Image, Quote, Instagram, Clock, 
  Monitor, Users, Info, Play
} from 'lucide-react';

/**
 * FramesEditor - Clean slideshow preview with duration editing
 */
function FramesEditor({ posters, onUpdatePosterDuration, showMessage, boardLocation }) {
  const [selectedLocation, setSelectedLocation] = useState(boardLocation || 'brothers');
  const today = new Date().toISOString().split('T')[0];

  const todayPosters = useMemo(() => {
    return posters.filter(poster => {
      const isActiveToday = (!poster.startDate || poster.startDate <= today) && 
                           (!poster.endDate || poster.endDate >= today);
      const matchesLocation = poster.audience === 'both' || poster.audience === selectedLocation;
      return isActiveToday && matchesLocation;
    });
  }, [posters, today, selectedLocation]);

  const systemFrames = [
    { id: 'week', label: 'Week at a Glance', icon: Calendar, color: 'bg-blue-500' },
    { id: 'today', label: "Today's Schedule", icon: Calendar, color: 'bg-green-500' },
    { id: 'prayer', label: 'Next Prayer', icon: Clock, color: 'bg-amber-500' },
  ];

  const systemFramesEnd = [
    { id: 'quotes', label: 'Islamic Quotes', icon: Quote, color: 'bg-emerald-500' },
    { id: 'social', label: 'Social Media', icon: Instagram, color: 'bg-pink-500' },
  ];

  const totalDuration = useMemo(() => {
    const systemTime = (systemFrames.length + systemFramesEnd.length) * 10000;
    const posterTime = todayPosters.reduce((acc, p) => acc + (p.duration || 10000), 0);
    return systemTime + posterTime;
  }, [todayPosters]);

  const handleDurationChange = (posterId, newDuration) => {
    onUpdatePosterDuration?.(posterId, parseInt(newDuration));
    showMessage('Duration updated');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5 text-indigo-600" />
            <span className="font-semibold text-gray-900">Slideshow Preview</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {3 + todayPosters.length + 2} frames  ~{Math.round(totalDuration / 1000)}s cycle
          </p>
        </div>
        
        {/* Location Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedLocation('brothers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
              selectedLocation === 'brothers' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Users className="h-4 w-4" />
            Brothers
          </button>
          <button
            onClick={() => setSelectedLocation('sisters')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
              selectedLocation === 'sisters' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <Users className="h-4 w-4" />
            Sisters
          </button>
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
          <Monitor className="h-4 w-4" />
          <span>Timeline</span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {systemFrames.map(f => (
            <div key={f.id} className={`h-10 w-12 rounded-lg ${f.color} flex items-center justify-center flex-shrink-0`} title={f.label}>
              <f.icon className="h-4 w-4 text-white" />
            </div>
          ))}
          {todayPosters.map(p => (
            <div 
              key={p.id} 
              className="h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0" 
              style={{ width: Math.max(32, (p.duration || 10000) / 1000 * 4) }}
              title={`${p.title} (${(p.duration || 10000) / 1000}s)`}
            >
              <Image className="h-4 w-4 text-white" />
            </div>
          ))}
          {systemFramesEnd.map(f => (
            <div key={f.id} className={`h-10 w-12 rounded-lg ${f.color} flex items-center justify-center flex-shrink-0`} title={f.label}>
              <f.icon className="h-4 w-4 text-white" />
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-700">
          <p className="font-medium mb-1">How it works</p>
          <p>The slideshow displays in order: system frames (schedules, prayer times), then your posters, then quotes and social media. Posters can have custom durations.</p>
        </div>
      </div>

      {/* Frame List */}
      <div className="space-y-2">
        {/* System Start */}
        {systemFrames.map((frame, i) => (
          <div key={frame.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">{i + 1}</div>
            <div className={`p-2 rounded-lg ${frame.color}`}>
              <frame.icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{frame.label}</p>
              <p className="text-xs text-gray-500">System frame</p>
            </div>
            <span className="text-sm text-gray-400">Auto</span>
          </div>
        ))}

        {/* Posters */}
        {todayPosters.length === 0 ? (
          <div className="text-center py-8 bg-purple-50 rounded-xl border border-purple-100">
            <Image className="h-10 w-10 mx-auto text-purple-300 mb-2" />
            <p className="text-purple-600 font-medium">No active posters today</p>
            <p className="text-sm text-purple-400">Add posters in the Posters tab</p>
          </div>
        ) : (
          todayPosters.map((poster, i) => (
            <div key={poster.id} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-purple-200">
              <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-sm font-bold text-white">
                {systemFrames.length + i + 1}
              </div>
              <div className="w-14 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {poster.imageUrl ? (
                  <img src={poster.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{poster.title}</p>
                <p className="text-xs text-purple-600 capitalize">{poster.audience}</p>
              </div>
              <select
                value={poster.duration || 10000}
                onChange={(e) => handleDurationChange(poster.id, e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 bg-white"
              >
                {[5, 8, 10, 12, 15, 20, 30].map(s => (
                  <option key={s} value={s * 1000}>{s}s</option>
                ))}
              </select>
            </div>
          ))
        )}

        {/* System End */}
        {systemFramesEnd.map((frame, i) => (
          <div key={frame.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
              {systemFrames.length + todayPosters.length + i + 1}
            </div>
            <div className={`p-2 rounded-lg ${frame.color}`}>
              <frame.icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{frame.label}</p>
              <p className="text-xs text-gray-500">System frame</p>
            </div>
            <span className="text-sm text-gray-400">Auto</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(FramesEditor);
