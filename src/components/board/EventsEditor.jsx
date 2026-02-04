import { useState, memo } from 'react';
import { 
  Plus, Trash2, Edit2, Check, X, Calendar, Clock, 
  MapPin, Users, Search, CalendarDays
} from 'lucide-react';
import BoardService from '../../services/BoardService';

/**
 * EventsEditor - Clean card-based event management
 */
function EventsEditor({ events, onUpdate, showMessage }) {
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAudience, setFilterAudience] = useState('all');
  const [hidePastEvents, setHidePastEvents] = useState(true);
  const [formData, setFormData] = useState(getEmptyEvent());

  function getEmptyEvent() {
    return {
      name: '',
      startTimestamp: Date.now() + 86400000,
      endTimestamp: Date.now() + 90000000,
      location: '',
      description: '',
      allDay: false,
      audience: 'both'
    };
  }

  const audienceOptions = [
    { value: 'both', label: 'Everyone', color: 'bg-purple-100 text-purple-700', border: 'border-purple-200' },
    { value: 'brothers', label: 'Brothers', color: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
    { value: 'sisters', label: 'Sisters', color: 'bg-pink-100 text-pink-700', border: 'border-pink-200' }
  ];

  const formatDateTimeLocal = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatDisplayDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
  };

  const formatDisplayTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  const filteredEvents = events
    .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 e.location?.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(e => filterAudience === 'all' || e.audience === filterAudience)
    .filter(e => !hidePastEvents || e.startTimestamp > Date.now())
    .sort((a, b) => a.startTimestamp - b.startTimestamp);

  const handleSave = async (isNew = false) => {
    if (!formData.name.trim()) {
      showMessage('Event name is required', 'error');
      return;
    }

    try {
      if (isNew) {
        const created = await BoardService.createEvent(formData);
        onUpdate([...events, created]);
        showMessage('Event created!');
        setShowAddForm(false);
      } else {
        const updated = await BoardService.updateEvent(editingId, formData);
        onUpdate(events.map(e => e.id === editingId ? updated : e));
        showMessage('Event updated!');
        setEditingId(null);
      }
      setFormData(getEmptyEvent());
    } catch (err) {
      showMessage('Failed: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return;
    try {
      await BoardService.deleteEvent(id);
      onUpdate(events.filter(e => e.id !== id));
      showMessage('Event deleted');
    } catch (err) {
      showMessage('Failed: ' + err.message, 'error');
    }
  };

  const startEdit = (event) => {
    setFormData({ ...event });
    setEditingId(event.id);
    setShowAddForm(false);
  };

  const isUpcoming = (timestamp) => timestamp > Date.now();
  const getAudienceBadge = (audience) => {
    const opt = audienceOptions.find(o => o.value === audience) || audienceOptions[0];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${opt.color}`}>{opt.label}</span>;
  };

  const EventForm = ({ isNew }) => (
    <div className={`rounded-xl border-2 p-5 space-y-4 ${isNew ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">{isNew ? 'New Event' : 'Edit Event'}</h4>
        <button onClick={() => { isNew ? setShowAddForm(false) : setEditingId(null); setFormData(getEmptyEvent()); }} className="p-1 hover:bg-gray-200 rounded">
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            placeholder="e.g., Weekly Halaqa"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
          <input
            type="datetime-local"
            value={formatDateTimeLocal(formData.startTimestamp)}
            onChange={(e) => setFormData({ ...formData, startTimestamp: new Date(e.target.value).getTime() })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
          <input
            type="datetime-local"
            value={formatDateTimeLocal(formData.endTimestamp)}
            onChange={(e) => setFormData({ ...formData, endTimestamp: new Date(e.target.value).getTime() })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            placeholder="e.g., Room 2080"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
          <div className="flex gap-2">
            {audienceOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFormData({ ...formData, audience: opt.value })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                  formData.audience === opt.value ? `${opt.color} ${opt.border}` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            placeholder="Brief description..."
          />
        </div>
        
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="allDay"
            checked={formData.allDay}
            onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
            className="w-4 h-4 text-indigo-600 rounded"
          />
          <label htmlFor="allDay" className="text-sm text-gray-700">All-day event</label>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={() => { isNew ? setShowAddForm(false) : setEditingId(null); setFormData(getEmptyEvent()); }}
          className="px-4 py-2 text-gray-600 hover:bg-white rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={() => handleSave(isNew)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
        >
          {isNew ? 'Create Event' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <button
          onClick={() => { setShowAddForm(true); setEditingId(null); setFormData(getEmptyEvent()); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Event
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterAudience('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filterAudience === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({events.length})
          </button>
          {audienceOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterAudience(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterAudience === opt.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label} ({events.filter(e => e.audience === opt.value).length})
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none ml-auto">
          <input
            type="checkbox"
            checked={hidePastEvents}
            onChange={(e) => setHidePastEvents(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
          />
          Hide past events
        </label>
      </div>

      {/* Add Form */}
      {showAddForm && <EventForm isNew={true} />}

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No events found</p>
          {searchTerm && <p className="text-sm text-gray-400 mt-1">Try a different search</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map(event => (
            editingId === event.id ? (
              <EventForm key={event.id} isNew={false} />
            ) : (
              <div
                key={event.id}
                className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${
                  isUpcoming(event.startTimestamp) ? 'border-gray-200' : 'border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-semibold text-gray-900">{event.name}</h4>
                      {getAudienceBadge(event.audience)}
                      {!isUpcoming(event.startTimestamp) && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Past</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDisplayDate(event.startTimestamp)}
                      </span>
                      {!event.allDay && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {formatDisplayTime(event.startTimestamp)} - {formatDisplayTime(event.endTimestamp)}
                        </span>
                      )}
                      {event.allDay && <span className="text-indigo-600 font-medium">All Day</span>}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    
                    {event.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">{event.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(event)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(EventsEditor);
