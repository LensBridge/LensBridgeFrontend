import { useState, memo } from 'react';
import { 
  Plus, Trash2, Edit2, Check, X, Calendar, Clock, 
  MapPin, FileText, ChevronDown, ChevronUp, Search,
  CalendarDays, AlertCircle, Users
} from 'lucide-react';
import BoardService from '../../services/BoardService';

/**
 * EventsEditor - Manage musallah events
 * Add, edit, delete events with full details
 */
function EventsEditor({ events, onUpdate, showMessage }) {
  const [editingEvent, setEditingEvent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('startTimestamp');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterAudience, setFilterAudience] = useState('all');

  // Audience options
  const audienceOptions = [
    { value: 'both', label: 'Everyone', color: 'bg-purple-100 text-purple-700' },
    { value: 'brothers', label: 'Brothers', color: 'bg-blue-100 text-blue-700' },
    { value: 'sisters', label: 'Sisters', color: 'bg-pink-100 text-pink-700' }
  ];

  // New event form state
  const [newEvent, setNewEvent] = useState({
    name: '',
    startTimestamp: Date.now() + 86400000,
    endTimestamp: Date.now() + 90000000,
    location: '',
    description: '',
    allDay: false,
    audience: 'both'
  });

  // Format timestamp to datetime-local input value
  const formatDateTimeLocal = (timestamp) => {
    const date = new Date(timestamp);
    const pad = (value) => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Parse datetime-local input to timestamp
  const parseDateTimeLocal = (value) => {
    return new Date(value).getTime();
  };

  // Format timestamp for display
  const formatDisplayDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDisplayTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Filter and sort events
  const filteredEvents = events
    .filter(event => 
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(event => 
      filterAudience === 'all' || event.audience === filterAudience
    )
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const order = sortOrder === 'asc' ? 1 : -1;
      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * order;
      }
      return (aVal - bVal) * order;
    });

  // Add new event
  const handleAddEvent = async () => {
    if (!newEvent.name.trim()) {
      showMessage('Event name is required', true);
      return;
    }

    try {
      const eventData = {
        ...newEvent,
        name: newEvent.name.trim(),
        location: newEvent.location.trim(),
        description: newEvent.description.trim()
      };

      const createdEvent = await BoardService.createEvent(eventData);
      onUpdate([...events, createdEvent]);
      showMessage('Event added successfully');
      setNewEvent({
        name: '',
        startTimestamp: Date.now() + 86400000,
        endTimestamp: Date.now() + 90000000,
        location: '',
        description: '',
        allDay: false,
        audience: 'both'
      });
      setShowAddForm(false);
    } catch (error) {
      showMessage('Failed to create event: ' + error.message, true);
    }
  };

  // Update existing event
  const handleUpdateEvent = async (updatedEvent) => {
    try {
      const updates = {
        name: updatedEvent.name,
        startTimestamp: updatedEvent.startTimestamp,
        endTimestamp: updatedEvent.endTimestamp,
        location: updatedEvent.location,
        description: updatedEvent.description,
        allDay: updatedEvent.allDay,
        audience: updatedEvent.audience
      };

      const savedEvent = await BoardService.updateEvent(updatedEvent.id, updates);
      onUpdate(events.map(e => e.id === savedEvent.id ? savedEvent : e));
      showMessage('Event updated');
      setEditingEvent(null);
    } catch (error) {
      showMessage('Failed to update event: ' + error.message, true);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      await BoardService.deleteEvent(eventId);
      onUpdate(events.filter(e => e.id !== eventId));
      showMessage('Event deleted');
    } catch (error) {
      showMessage('Failed to delete event: ' + error.message, true);
    }
  };

  // Check if event is upcoming
  const isUpcoming = (timestamp) => timestamp > Date.now();
  const isPast = (timestamp) => timestamp < Date.now();

  // Toggle sort
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Search and Add */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Event Management</h3>
          <p className="text-sm text-gray-500">{events.length} events configured</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search events..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Audience Filter */}
      <div className="flex space-x-2 flex-wrap gap-2">
        <button
          onClick={() => setFilterAudience('all')}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
            filterAudience === 'all'
              ? 'bg-gray-900 text-white scale-105'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({events.length})
        </button>
        {audienceOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setFilterAudience(option.value)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              filterAudience === option.value
                ? 'bg-gray-900 text-white scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option.label} ({events.filter(e => e.audience === option.value).length})
          </button>
        ))}
      </div>

      {/* Add Event Form */}
      {showAddForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 animate-slideDown">
          <h4 className="font-medium text-indigo-900 mb-4">Add New Event</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
              <input
                type="text"
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Weekly Halaqa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date/Time</label>
              <input
                type="datetime-local"
                value={formatDateTimeLocal(newEvent.startTimestamp)}
                onChange={(e) => setNewEvent({ ...newEvent, startTimestamp: parseDateTimeLocal(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date/Time</label>
              <input
                type="datetime-local"
                value={formatDateTimeLocal(newEvent.endTimestamp)}
                onChange={(e) => setNewEvent({ ...newEvent, endTimestamp: parseDateTimeLocal(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Room 2080"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newEvent.allDay}
                  onChange={(e) => setNewEvent({ ...newEvent, allDay: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">All-day event</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <select
                value={newEvent.audience}
                onChange={(e) => setNewEvent({ ...newEvent, audience: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                {audienceOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="Brief description of the event..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddEvent}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Add Event
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
          <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <button 
              onClick={() => toggleSort('name')}
              className="col-span-4 flex items-center space-x-1 hover:text-gray-700"
            >
              <span>Event Name</span>
              {sortBy === 'name' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
            </button>
            <button 
              onClick={() => toggleSort('startTimestamp')}
              className="col-span-3 flex items-center space-x-1 hover:text-gray-700"
            >
              <span>Date & Time</span>
              {sortBy === 'startTimestamp' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
            </button>
            <div className="col-span-2">Location</div>
            <div className="col-span-2">Audience</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
        </div>

        {/* Events */}
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No events found</p>
            {searchTerm && <p className="text-sm">Try adjusting your search</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEvents.map(event => (
              <div key={event.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                {editingEvent === event.id ? (
                  <EventEditForm
                    event={event}
                    onSave={handleUpdateEvent}
                    onCancel={() => setEditingEvent(null)}
                    formatDateTimeLocal={formatDateTimeLocal}
                    parseDateTimeLocal={parseDateTimeLocal}
                  />
                ) : (
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-4">
                      <div className="font-medium text-gray-900">{event.name}</div>
                      {event.description && (
                        <div className="text-sm text-gray-500 truncate">{event.description}</div>
                      )}
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {formatDisplayDate(event.startTimestamp)}
                      </div>
                      {!event.allDay && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1 text-gray-400" />
                          {formatDisplayTime(event.startTimestamp)} - {formatDisplayTime(event.endTimestamp)}
                        </div>
                      )}
                      {event.allDay && (
                        <span className="text-xs text-indigo-600 font-medium">All Day</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {event.location ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                          {event.location}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No location</span>
                      )}
                    </div>
                    <div className="col-span-2">
                      {(() => {
                        const audience = audienceOptions.find(o => o.value === (event.audience || 'both'));
                        return (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${audience?.color || 'bg-purple-100 text-purple-700'}`}>
                            <Users className="h-3 w-3 mr-1" />
                            {audience?.label || 'Everyone'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="col-span-1">
                      {isUpcoming(event.startTimestamp) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Upcoming
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Past
                        </span>
                      )}
                    </div>
                    <div className="col-span-1 flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingEvent(event.id)}
                        className="text-gray-400 hover:text-indigo-600 p-1"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center animate-fadeInUp hover:shadow-md transition-all">
          <div className="text-2xl font-bold text-green-600">
            {events.filter(e => isUpcoming(e.startTimestamp)).length}
          </div>
          <div className="text-sm text-green-700">Upcoming</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center animate-fadeInUp hover:shadow-md transition-all" style={{ animationDelay: '50ms' }}>
          <div className="text-2xl font-bold text-gray-600">
            {events.filter(e => isPast(e.startTimestamp)).length}
          </div>
          <div className="text-sm text-gray-700">Past</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center animate-fadeInUp hover:shadow-md transition-all" style={{ animationDelay: '100ms' }}>
          <div className="text-2xl font-bold text-purple-600">
            {events.filter(e => (e.audience || 'both') === 'both').length}
          </div>
          <div className="text-sm text-purple-700">Everyone</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center animate-fadeInUp hover:shadow-md transition-all" style={{ animationDelay: '150ms' }}>
          <div className="text-2xl font-bold text-blue-600">
            {events.filter(e => e.audience === 'brothers').length}
          </div>
          <div className="text-sm text-blue-700">Brothers</div>
        </div>
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 text-center animate-fadeInUp hover:shadow-md transition-all" style={{ animationDelay: '200ms' }}>
          <div className="text-2xl font-bold text-pink-600">
            {events.filter(e => e.audience === 'sisters').length}
          </div>
          <div className="text-sm text-pink-700">Sisters</div>
        </div>
      </div>
    </div>
  );
}

// Inline edit form component
function EventEditForm({ event, onSave, onCancel, formatDateTimeLocal, parseDateTimeLocal }) {
  const [formData, setFormData] = useState({ ...event });

  return (
    <div className="bg-indigo-50 rounded-lg p-4 -mx-4 -my-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 font-medium"
            placeholder="Event name"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Start</label>
          <input
            type="datetime-local"
            value={formatDateTimeLocal(formData.startTimestamp)}
            onChange={(e) => setFormData({ ...formData, startTimestamp: parseDateTimeLocal(e.target.value) })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">End</label>
          <input
            type="datetime-local"
            value={formatDateTimeLocal(formData.endTimestamp)}
            onChange={(e) => setFormData({ ...formData, endTimestamp: parseDateTimeLocal(e.target.value) })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <input
            type="text"
            value={formData.location || ''}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="Location"
          />
        </div>
        <div className="flex items-center">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allDay || false}
              onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-gray-700">All-day</span>
          </label>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Audience</label>
          <select
            value={formData.audience || 'both'}
            onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="both">Everyone</option>
            <option value="brothers">Brothers</option>
            <option value="sisters">Sisters</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <input
            type="text"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="Description"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2 mt-3">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(formData)}
          className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default memo(EventsEditor);
