import { useState, memo } from 'react';
import { 
  Plus, Trash2, Edit2, Clock, MapPin,
  Calendar, ChevronDown, ChevronUp, Sunrise,
  CalendarDays, Copy, Check
} from 'lucide-react';

/**
 * JummahEditor - Manage Jummah prayer schedules
 * Allows specifying which Friday(s) the timings apply to
 */
function JummahEditor({ jummahSchedules, onUpdate, showMessage }) {
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState(null);

  // Get upcoming Fridays for the next 8 weeks
  const getUpcomingFridays = () => {
    const fridays = [];
    const today = new Date();
    let current = new Date(today);
    
    // Find the next Friday
    const dayOfWeek = current.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    current.setDate(current.getDate() + daysUntilFriday);
    
    // Get next 8 Fridays
    for (let i = 0; i < 8; i++) {
      fridays.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    
    return fridays;
  };

  const upcomingFridays = getUpcomingFridays();

  // Format date for display
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatShortDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // New schedule form state
  const [newSchedule, setNewSchedule] = useState({
    id: null,
    date: upcomingFridays[0]?.toISOString().split('T')[0] || '',
    isRecurring: true,
    prayers: [
      { time: '12:30 PM', khatib: '', location: '' }
    ]
  });

  // Check if a date already has a schedule
  const hasScheduleForDate = (date) => {
    const dateStr = new Date(date).toISOString().split('T')[0];
    return jummahSchedules.some(s => s.date === dateStr);
  };

  // Get schedule status (past, today, upcoming)
  const getScheduleStatus = (schedule) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduleDate = new Date(schedule.date);
    scheduleDate.setHours(0, 0, 0, 0);
    
    if (scheduleDate.getTime() === today.getTime()) return 'today';
    if (scheduleDate < today) return 'past';
    return 'upcoming';
  };

  // Add new schedule
  const handleAddSchedule = () => {
    if (!newSchedule.date) {
      showMessage('Please select a date', true);
      return;
    }
    if (newSchedule.prayers.length === 0) {
      showMessage('At least one prayer time is required', true);
      return;
    }
    if (hasScheduleForDate(newSchedule.date) && !newSchedule.isRecurring) {
      showMessage('A schedule already exists for this date', true);
      return;
    }

    const schedule = {
      id: Date.now(),
      date: newSchedule.date,
      isRecurring: newSchedule.isRecurring,
      prayers: newSchedule.prayers.map((p, i) => ({ ...p, id: Date.now() + i }))
    };

    onUpdate([...jummahSchedules, schedule]);
    showMessage('✅ Jummah schedule added');
    setNewSchedule({
      id: null,
      date: upcomingFridays[0]?.toISOString().split('T')[0] || '',
      isRecurring: true,
      prayers: [{ time: '12:30 PM', khatib: '', location: '' }]
    });
    setShowAddForm(false);
  };

  // Update schedule
  const handleUpdateSchedule = (updatedSchedule) => {
    onUpdate(jummahSchedules.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
    showMessage('✅ Schedule updated');
    setEditingSchedule(null);
  };

  // Delete schedule
  const handleDeleteSchedule = (scheduleId) => {
    if (confirm('Are you sure you want to delete this Jummah schedule?')) {
      onUpdate(jummahSchedules.filter(s => s.id !== scheduleId));
      showMessage('🗑️ Schedule deleted');
    }
  };

  // Duplicate schedule for another date
  const handleDuplicateSchedule = (schedule) => {
    // Find next available Friday
    const existingDates = jummahSchedules.map(s => s.date);
    const nextFriday = upcomingFridays.find(f => 
      !existingDates.includes(f.toISOString().split('T')[0])
    );
    
    if (!nextFriday) {
      showMessage('No available Fridays in the next 8 weeks', true);
      return;
    }

    const newSched = {
      ...schedule,
      id: Date.now(),
      date: nextFriday.toISOString().split('T')[0],
      prayers: schedule.prayers.map((p, i) => ({ ...p, id: Date.now() + i }))
    };

    onUpdate([...jummahSchedules, newSched]);
    showMessage('✅ Schedule duplicated for ' + formatShortDate(nextFriday));
  };

  // Add prayer to new schedule form
  const addPrayerToNewSchedule = () => {
    if (newSchedule.prayers.length >= 5) {
      showMessage('Maximum 5 prayers per schedule', true);
      return;
    }
    setNewSchedule({
      ...newSchedule,
      prayers: [...newSchedule.prayers, { time: '', khatib: '', location: '' }]
    });
  };

  // Update prayer in new schedule form
  const updateNewSchedulePrayer = (index, field, value) => {
    const prayers = [...newSchedule.prayers];
    prayers[index] = { ...prayers[index], [field]: value };
    setNewSchedule({ ...newSchedule, prayers });
  };

  // Remove prayer from new schedule form
  const removeNewSchedulePrayer = (index) => {
    if (newSchedule.prayers.length <= 1) return;
    setNewSchedule({
      ...newSchedule,
      prayers: newSchedule.prayers.filter((_, i) => i !== index)
    });
  };

  // Sort schedules by date
  const sortedSchedules = [...jummahSchedules].sort((a, b) => 
    new Date(a.date) - new Date(b.date)
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Jummah Prayer Schedule</h3>
          <p className="text-sm text-gray-500">
            {jummahSchedules.length} schedule{jummahSchedules.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 flex items-center space-x-2 shadow-md hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          <span>Add Schedule</span>
        </button>
      </div>

      {/* Upcoming Fridays Quick View */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-3">
          <CalendarDays className="h-5 w-5 text-amber-600" />
          <span className="font-medium text-amber-900">Upcoming Fridays</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {upcomingFridays.slice(0, 6).map((friday, index) => {
            const dateStr = friday.toISOString().split('T')[0];
            const hasSchedule = jummahSchedules.some(s => s.date === dateStr);
            return (
              <div
                key={index}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  hasSchedule 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {formatShortDate(friday)}
                {hasSchedule && <Check className="h-3 w-3 inline ml-1" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Schedule Form */}
      {showAddForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 animate-slideDown">
          <h4 className="font-semibold text-indigo-900 mb-4 flex items-center">
            <Sunrise className="h-5 w-5 mr-2" />
            Add New Jummah Schedule
          </h4>
          
          <div className="space-y-4">
            {/* Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <select
                  value={newSchedule.date}
                  onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                  {upcomingFridays.map((friday, index) => {
                    const dateStr = friday.toISOString().split('T')[0];
                    const hasSchedule = hasScheduleForDate(friday);
                    return (
                      <option 
                        key={index} 
                        value={dateStr}
                        disabled={hasSchedule}
                      >
                        {formatDate(friday)} {hasSchedule ? '(Already scheduled)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newSchedule.isRecurring}
                    onChange={(e) => setNewSchedule({ ...newSchedule, isRecurring: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Use as default for future Fridays</span>
                </label>
              </div>
            </div>

            {/* Prayer Times */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prayer Times</label>
              <div className="space-y-3">
                {newSchedule.prayers.map((prayer, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-gray-200 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Time *</label>
                        <input
                          type="text"
                          value={prayer.time}
                          onChange={(e) => updateNewSchedulePrayer(index, 'time', e.target.value)}
                          placeholder="12:30 PM"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Khatib</label>
                        <input
                          type="text"
                          value={prayer.khatib}
                          onChange={(e) => updateNewSchedulePrayer(index, 'khatib', e.target.value)}
                          placeholder="Sheikh Ahmad"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Location</label>
                        <input
                          type="text"
                          value={prayer.location}
                          onChange={(e) => updateNewSchedulePrayer(index, 'location', e.target.value)}
                          placeholder="Main Hall"
                          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => removeNewSchedulePrayer(index)}
                          disabled={newSchedule.prayers.length <= 1}
                          className="text-gray-400 hover:text-red-500 p-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {newSchedule.prayers.length < 5 && (
                  <button
                    onClick={addPrayerToNewSchedule}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-2 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Prayer Time</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSchedule}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-all hover:shadow-lg flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Schedule</span>
            </button>
          </div>
        </div>
      )}

      {/* Schedules List */}
      {sortedSchedules.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center animate-fadeIn">
          <Sunrise className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No Jummah schedules configured</p>
          <p className="text-sm text-gray-400 mt-1">Add a schedule for upcoming Fridays</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedSchedules.map((schedule, index) => {
            const status = getScheduleStatus(schedule);
            const isExpanded = expandedSchedule === schedule.id;
            
            return (
              <div
                key={schedule.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all animate-fadeInUp hover:shadow-md ${
                  status === 'today' ? 'border-green-300 ring-2 ring-green-100' :
                  status === 'past' ? 'border-gray-200 opacity-60' :
                  'border-gray-200'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Schedule Header */}
                <div 
                  className={`p-4 cursor-pointer ${
                    status === 'today' ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                  onClick={() => setExpandedSchedule(isExpanded ? null : schedule.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        status === 'today' ? 'bg-green-100' : 
                        status === 'past' ? 'bg-gray-100' : 'bg-amber-100'
                      }`}>
                        <Calendar className={`h-5 w-5 ${
                          status === 'today' ? 'text-green-600' : 
                          status === 'past' ? 'text-gray-400' : 'text-amber-600'
                        }`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {formatDate(schedule.date)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {schedule.prayers.length} prayer{schedule.prayers.length !== 1 ? 's' : ''} scheduled
                          {schedule.isRecurring && (
                            <span className="ml-2 text-indigo-600">• Default template</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {status === 'today' && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          Today
                        </span>
                      )}
                      {status === 'past' && (
                        <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded-full font-medium">
                          Past
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 border-t border-gray-200 animate-slideDown">
                    {editingSchedule === schedule.id ? (
                      <ScheduleEditForm
                        schedule={schedule}
                        onSave={handleUpdateSchedule}
                        onCancel={() => setEditingSchedule(null)}
                        showMessage={showMessage}
                      />
                    ) : (
                      <>
                        {/* Prayer Times List */}
                        <div className="space-y-2 mb-4">
                          {schedule.prayers.map((prayer, pIndex) => (
                              <div 
                                key={pIndex}
                                className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-lg">
                                  {prayer.time}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {prayer.khatib || 'Khatib TBA'}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    {prayer.location || 'Location TBA'}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleDuplicateSchedule(schedule)}
                            className="text-gray-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all flex items-center space-x-1 text-sm"
                          >
                            <Copy className="h-4 w-4" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            onClick={() => setEditingSchedule(schedule.id)}
                            className="text-gray-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all flex items-center space-x-1 text-sm"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all flex items-center space-x-1 text-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center animate-fadeInUp hover:shadow-md transition-all">
          <div className="text-2xl font-bold text-amber-600">
            {jummahSchedules.filter(s => getScheduleStatus(s) === 'upcoming').length}
          </div>
          <div className="text-sm text-amber-700">Upcoming</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center animate-fadeInUp hover:shadow-md transition-all" style={{ animationDelay: '50ms' }}>
          <div className="text-2xl font-bold text-green-600">
            {jummahSchedules.filter(s => getScheduleStatus(s) === 'today').length}
          </div>
          <div className="text-sm text-green-700">Today</div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center animate-fadeInUp hover:shadow-md transition-all" style={{ animationDelay: '100ms' }}>
          <div className="text-2xl font-bold text-indigo-600">
            {jummahSchedules.reduce((acc, s) => acc + s.prayers.length, 0)}
          </div>
          <div className="text-sm text-indigo-700">Total Prayers</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center animate-fadeInUp hover:shadow-md transition-all" style={{ animationDelay: '150ms' }}>
          <div className="text-2xl font-bold text-purple-600">
            {jummahSchedules.filter(s => s.isRecurring).length}
          </div>
          <div className="text-sm text-purple-700">Templates</div>
        </div>
      </div>
    </div>
  );
}

// Inline edit form component
function ScheduleEditForm({ schedule, onSave, onCancel, showMessage }) {
  const [formData, setFormData] = useState({ ...schedule });

  const updatePrayer = (index, field, value) => {
    const prayers = [...formData.prayers];
    prayers[index] = { ...prayers[index], [field]: value };
    setFormData({ ...formData, prayers });
  };

  const addPrayer = () => {
    if (formData.prayers.length >= 5) {
      showMessage('Maximum 5 prayers per schedule', true);
      return;
    }
    setFormData({
      ...formData,
      prayers: [...formData.prayers, { id: Date.now(), time: '', khatib: '', location: '' }]
    });
  };

  const removePrayer = (index) => {
    if (formData.prayers.length <= 1) return;
    setFormData({
      ...formData,
      prayers: formData.prayers.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex items-center space-x-2 mb-2">
        <input
          type="checkbox"
          checked={formData.isRecurring}
          onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
          className="w-4 h-4 text-indigo-600 rounded"
        />
        <span className="text-sm text-gray-700">Use as default template</span>
      </div>

      <div className="space-y-3">
        {formData.prayers.map((prayer, index) => (
          <div key={prayer.id || index} className="bg-indigo-50 rounded-lg p-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Time</label>
                <input
                  type="text"
                  value={prayer.time}
                  onChange={(e) => updatePrayer(index, 'time', e.target.value)}
                  placeholder="12:30 PM"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Khatib</label>
                <input
                  type="text"
                  value={prayer.khatib}
                  onChange={(e) => updatePrayer(index, 'khatib', e.target.value)}
                  placeholder="Sheikh Ahmad"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Location</label>
                <input
                  type="text"
                  value={prayer.location}
                  onChange={(e) => updatePrayer(index, 'location', e.target.value)}
                  placeholder="Main Hall"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => removePrayer(index)}
                  disabled={formData.prayers.length <= 1}
                  className="text-gray-400 hover:text-red-500 p-2 disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {formData.prayers.length < 5 && (
          <button
            onClick={addPrayer}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-2 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Prayer</span>
          </button>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-3">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(formData)}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm hover:bg-indigo-700 transition-all"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

export default memo(JummahEditor);
