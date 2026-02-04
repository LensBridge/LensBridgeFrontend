import { useState, useEffect, memo, useRef } from 'react';
import { 
  MapPin, Clock, Globe, Users, Sun, Moon, 
  MessageSquare, Plus, Trash2, Info
} from 'lucide-react';

/**
 * BoardConfigEditor - Clean, card-based configuration editor
 * No collapsible sections - everything visible and organized
 */
function BoardConfigEditor({ config, onUpdate, showMessage, onLocationChange }) {
  const [localConfig, setLocalConfig] = useState(config);
  const prevConfigRef = useRef(config);

  useEffect(() => {
    if (config !== prevConfigRef.current) {
      prevConfigRef.current = config;
      setLocalConfig(config);
    }
  }, [config]);

  const updateField = (path, value) => {
    if (!localConfig) return;
    const newConfig = { ...localConfig };
    const keys = path.split('.');
    let current = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setLocalConfig(newConfig);
    if (onUpdate) onUpdate(newConfig);
  };

  const calculationMethods = [
    { value: 0, label: 'Shia Ithna-Ashari' },
    { value: 1, label: 'University of Islamic Sciences, Karachi' },
    { value: 2, label: 'Islamic Society of North America (ISNA)' },
    { value: 3, label: 'Muslim World League' },
    { value: 4, label: 'Umm Al-Qura University, Makkah' },
    { value: 5, label: 'Egyptian General Authority of Survey' },
    { value: 7, label: 'Institute of Geophysics, University of Tehran' },
    { value: 8, label: 'Gulf Region' },
    { value: 9, label: 'Kuwait' },
    { value: 10, label: 'Qatar' },
    { value: 11, label: 'Majlis Ugama Islam Singapura' },
    { value: 12, label: 'Union Organization Islamic de France' },
    { value: 13, label: 'Diyanet Isleri Baskanligi, Turkey' },
    { value: 14, label: 'Spiritual Administration of Muslims of Russia' }
  ];

  const timezones = [
    'America/Toronto', 'America/New_York', 'America/Chicago',
    'America/Denver', 'America/Los_Angeles', 'America/Vancouver',
    'America/Edmonton', 'America/Winnipeg', 'America/Halifax', 'America/St_Johns'
  ];

  if (!localConfig) return null;

  return (
    <div className="space-y-6">
      {/* Board Location Toggle */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Board Location</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              if (localConfig.boardLocation !== 'brothers') {
                onLocationChange?.('brothers');
              }
            }}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
              localConfig.boardLocation === 'brothers'
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              localConfig.boardLocation === 'brothers' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <Users className="h-5 w-5" />
            </div>
            <span className={`font-medium ${localConfig.boardLocation === 'brothers' ? 'text-blue-700' : 'text-gray-600'}`}>
              Brothers
            </span>
          </button>
          <button
            onClick={() => {
              if (localConfig.boardLocation !== 'sisters') {
                onLocationChange?.('sisters');
              }
            }}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
              localConfig.boardLocation === 'sisters'
                ? 'border-pink-500 bg-pink-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              localConfig.boardLocation === 'sisters' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <Users className="h-5 w-5" />
            </div>
            <span className={`font-medium ${localConfig.boardLocation === 'sisters' ? 'text-pink-700' : 'text-gray-600'}`}>
              Sisters
            </span>
          </button>
        </div>
      </div>

      {/* Location Settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Location & Prayer Times</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
              <input
                type="text"
                value={localConfig.location?.city || ''}
                onChange={(e) => updateField('location.city', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                placeholder="Mississauga"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
              <input
                type="text"
                value={localConfig.location?.country || ''}
                onChange={(e) => updateField('location.country', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                placeholder="Canada"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={localConfig.location?.latitude || ''}
                onChange={(e) => updateField('location.latitude', parseFloat(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={localConfig.location?.longitude || ''}
                onChange={(e) => updateField('location.longitude', parseFloat(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
              <select
                value={localConfig.location?.timezone || 'America/Toronto'}
                onChange={(e) => updateField('location.timezone', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white"
              >
                {timezones.map(tz => <option key={tz} value={tz}>{tz.replace('America/', '')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Calculation Method</label>
              <select
                value={localConfig.location?.method || 2}
                onChange={(e) => updateField('location.method', parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white"
              >
                {calculationMethods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-gray-900">Display Settings</h3>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Poster Cycle (seconds)</label>
              <input
                type="number"
                min="5"
                max="60"
                value={(localConfig.posterCycleInterval || 10000) / 1000}
                onChange={(e) => updateField('posterCycleInterval', parseInt(e.target.value) * 1000)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              />
              <p className="text-xs text-gray-500 mt-1">How long each poster shows (5-60s)</p>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Refresh After Isha (min)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={localConfig.refreshAfterIshaMinutes || 30}
                onChange={(e) => updateField('refreshAfterIshaMinutes', parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-refresh delay after Isha</p>
            </div>
          </div>
        </div>
      </div>

      {/* Night Mode */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Night Mode</h3>
          </div>
          <button
            onClick={() => updateField('darkModeAfterIsha', !localConfig.darkModeAfterIsha)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              localConfig.darkModeAfterIsha ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
              localConfig.darkModeAfterIsha ? 'left-6' : 'left-1'
            }`} />
          </button>
        </div>
        {localConfig.darkModeAfterIsha && (
          <div className="p-5 bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Delay After Isha (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={localConfig.darkModeMinutesAfterIsha || 45}
                  onChange={(e) => updateField('darkModeMinutesAfterIsha', parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-indigo-50 px-3 py-2 rounded-lg">
                <Info className="h-4 w-4" />
                <span>Darker theme activates automatically</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scrolling Messages */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Scrolling Messages</h3>
          </div>
          <button
            onClick={() => updateField('enableScrollingMessage', !localConfig.enableScrollingMessage)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              localConfig.enableScrollingMessage ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
              localConfig.enableScrollingMessage ? 'left-6' : 'left-1'
            }`} />
          </button>
        </div>
        {localConfig.enableScrollingMessage && (
          <div className="p-5 space-y-3">
            {(localConfig.scrollingMessages || []).map((message, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => {
                    const updated = [...(localConfig.scrollingMessages || [])];
                    updated[index] = e.target.value;
                    updateField('scrollingMessages', updated);
                  }}
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                  placeholder="Enter message..."
                />
                <button
                  onClick={() => {
                    const updated = (localConfig.scrollingMessages || []).filter((_, i) => i !== index);
                    updateField('scrollingMessages', updated);
                  }}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => updateField('scrollingMessages', [...(localConfig.scrollingMessages || []), ''])}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium py-2"
            >
              <Plus className="h-4 w-4" />
              Add Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(BoardConfigEditor);
