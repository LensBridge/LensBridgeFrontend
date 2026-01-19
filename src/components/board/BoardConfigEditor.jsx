import { useState, useEffect, memo, useRef } from 'react';
import { 
  MapPin, Clock, Globe, Users, Sun, Moon, 
  MessageSquare, ChevronDown, ChevronUp, Settings, X
} from 'lucide-react';

/**
 * ScrollingMessageInput - Individual message input with local state
 * Prevents losing focus when parent re-renders
 */
const ScrollingMessageInput = memo(({ message, onMessageChange, onRemove }) => {
  const [localValue, setLocalValue] = useState(message);
  const timeoutRef = useRef(null);

  // Sync local state when message prop changes (e.g., after save/reset)
  useEffect(() => {
    setLocalValue(message);
  }, [message]);

  // Debounced update to parent
  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Debounce the parent update to prevent excessive re-renders
    timeoutRef.current = setTimeout(() => {
      onMessageChange(newValue);
    }, 800);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Flush pending changes on blur
  const handleBlur = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (localValue !== message) {
      onMessageChange(localValue);
    }
  };

  return (
    <div className="flex items-start space-x-2">
      <textarea
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        rows={2}
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        placeholder="Enter your scrolling message..."
      />
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-red-500 p-2 transition-colors"
        title="Remove message"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});

ScrollingMessageInput.displayName = 'ScrollingMessageInput';

/**
 * BoardConfigEditor - Edit board configuration settings
 * Handles location, display settings, and scrolling message
 */
function BoardConfigEditor({ config, onUpdate, showMessage }) {
  const [expandedSection, setExpandedSection] = useState('location');
  const [localConfig, setLocalConfig] = useState(config);
  const prevConfigRef = useRef(config);

  // Only update local config when the config prop reference changes
  // (meaning a save or reset happened in the parent)
  // Don't update during user editing to prevent the fade-in animation from replaying
  useEffect(() => {
    if (config !== prevConfigRef.current) {
      prevConfigRef.current = config;
      setLocalConfig(config);
    }
  }, [config]);

  // Update local config and notify parent immediately
  const updateField = (path, value) => {
    if (!localConfig) {
      return;
    }
    const newConfig = { ...localConfig };
    const keys = path.split('.');
    let current = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setLocalConfig(newConfig);
    // Notify parent immediately so hasUnsavedChanges gets set
    if (onUpdate) {
      onUpdate(newConfig);
    }
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Calculation method options
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
    { value: 13, label: 'Diyanet İşleri Başkanlığı, Turkey' },
    { value: 14, label: 'Spiritual Administration of Muslims of Russia' }
  ];

  // Common timezones for North America
  const timezones = [
    'America/Toronto',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Vancouver',
    'America/Edmonton',
    'America/Winnipeg',
    'America/Halifax',
    'America/St_Johns'
  ];

  // Section component for collapsible sections
  const Section = ({ id, title, icon: Icon, children, badge }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 text-indigo-600" />
          <span className="font-medium text-gray-900">{title}</span>
          {badge && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expandedSection === id ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {expandedSection === id && (
        <div className="p-4 bg-white border-t border-gray-200 animate-slideDown">
          {children}
        </div>
      )}
    </div>
  );

  if (!localConfig) {
    return null;
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Board Location Selection */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Board Location
        </label>
        <div className="flex space-x-4">
          <button
            onClick={() => updateField('boardLocation', 'brothers')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              localConfig.boardLocation === 'brothers'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users className={`h-5 w-5 ${localConfig.boardLocation === 'brothers' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`font-medium ${localConfig.boardLocation === 'brothers' ? 'text-blue-700' : 'text-gray-600'}`}>
                Brothers Musallah
              </span>
            </div>
          </button>
          <button
            onClick={() => updateField('boardLocation', 'sisters')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              localConfig.boardLocation === 'sisters'
                ? 'border-pink-500 bg-pink-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users className={`h-5 w-5 ${localConfig.boardLocation === 'sisters' ? 'text-pink-600' : 'text-gray-400'}`} />
              <span className={`font-medium ${localConfig.boardLocation === 'sisters' ? 'text-pink-700' : 'text-gray-600'}`}>
                Sisters Musallah
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Location Settings */}
      <Section id="location" title="Location Settings" icon={MapPin}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={localConfig.location.city}
              onChange={(e) => updateField('location.city', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Mississauga"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input
              type="text"
              value={localConfig.location.country}
              onChange={(e) => updateField('location.country', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Canada"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
            <input
              type="number"
              step="0.0001"
              value={localConfig.location.latitude}
              onChange={(e) => updateField('location.latitude', parseFloat(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
            <input
              type="number"
              step="0.0001"
              value={localConfig.location.longitude}
              onChange={(e) => updateField('location.longitude', parseFloat(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={localConfig.location.timezone}
              onChange={(e) => updateField('location.timezone', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Method</label>
            <select
              value={localConfig.location.method}
              onChange={(e) => updateField('location.method', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {calculationMethods.map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      {/* Display Settings */}
      <Section id="display" title="Display Settings" icon={Settings}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Poster Cycle Interval (seconds)
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={localConfig.posterCycleInterval / 1000}
              onChange={(e) => updateField('posterCycleInterval', parseInt(e.target.value) * 1000)}
              className="w-full md:w-48 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">How long each poster displays (5-60 seconds)</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refresh After Isha (minutes)
            </label>
            <input
              type="number"
              min="0"
              max="120"
              value={localConfig.refreshAfterIshaMinutes}
              onChange={(e) => updateField('refreshAfterIshaMinutes', parseInt(e.target.value))}
              className="w-full md:w-48 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">Minutes after Isha to refresh the board</p>
          </div>
        </div>
      </Section>

      {/* Dark Mode Settings */}
      <Section id="darkmode" title="Night Mode Settings" icon={Moon}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Enable Night Mode After Isha</div>
              <div className="text-sm text-gray-500">Automatically switch to dark theme after Isha prayer</div>
            </div>
            <button
              onClick={() => updateField('darkModeAfterIsha', !config.darkModeAfterIsha)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                localConfig.darkModeAfterIsha ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                localConfig.darkModeAfterIsha ? 'translate-x-7' : 'translate-x-1'
              }`}>
                {localConfig.darkModeAfterIsha ? (
                  <Moon className="h-4 w-4 text-indigo-600 m-1" />
                ) : (
                  <Sun className="h-4 w-4 text-yellow-500 m-1" />
                )}
              </div>
            </button>
          </div>
          
          {localConfig.darkModeAfterIsha && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delay After Isha (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={localConfig.darkModeMinutesAfterIsha}
                onChange={(e) => updateField('darkModeMinutesAfterIsha', parseInt(e.target.value))}
                className="w-full md:w-48 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">Minutes after Isha to enable night mode</p>
            </div>
          )}
        </div>
      </Section>

      {/* Scrolling Message */}
      <Section id="message" title="Scrolling Message" icon={MessageSquare}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Enable Scrolling Message</div>
              <div className="text-sm text-gray-500">Show a scrolling message bar at the bottom</div>
            </div>
            <button
              onClick={() => updateField('enableScrollingMessage', !config.enableScrollingMessage)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                localConfig.enableScrollingMessage ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                localConfig.enableScrollingMessage ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          {localConfig.enableScrollingMessage && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Messages
                </label>
                <p className="text-xs text-gray-500">
                  Messages rotate in the scrolling bar.
                </p>
              </div>
              {(localConfig.scrollingMessages || []).map((message, index) => (
                <ScrollingMessageInput
                  key={`msg-${index}`}
                  message={message}
                  onMessageChange={(newValue) => {
                    const updated = [...(localConfig.scrollingMessages || [])];
                    updated[index] = newValue;
                    updateField('scrollingMessages', updated);
                  }}
                  onRemove={() => {
                    const updated = (localConfig.scrollingMessages || []).filter((_, i) => i !== index);
                    updateField('scrollingMessages', updated);
                  }}
                />
              ))}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => updateField('scrollingMessages', [...(localConfig.scrollingMessages || []), ''])}
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  + Add message
                </button>
                <span className="text-xs text-gray-500">
                  {(localConfig.scrollingMessages || []).length} message{(localConfig.scrollingMessages || []).length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

export default memo(BoardConfigEditor);
