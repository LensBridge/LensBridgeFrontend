import { useState, useRef, memo } from 'react';
import { 
  Plus, Trash2, Edit2, Image, Users, Clock, Calendar,
  Eye, Upload, X, Search, Loader2, CheckCircle
} from 'lucide-react';
import BoardService from '../../services/BoardService';

/**
 * PostersEditor - Grid-based poster management with drag-drop upload
 */
function PostersEditor({ posters = [], onUpdate, showMessage }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAudience, setFilterAudience] = useState('all');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  // Ensure posters is always an array
  const safePosters = Array.isArray(posters) ? posters : [];

  const [formData, setFormData] = useState({
    title: '',
    image: '',
    duration: 10000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    audience: 'both'
  });

  const audienceOptions = [
    { value: 'both', label: 'Everyone', color: 'bg-purple-100 text-purple-700' },
    { value: 'brothers', label: 'Brothers', color: 'bg-blue-100 text-blue-700' },
    { value: 'sisters', label: 'Sisters', color: 'bg-pink-100 text-pink-700' }
  ];

  const resetForm = () => {
    setFormData({
      title: '',
      image: '',
      duration: 10000,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      audience: 'both'
    });
    setImageFile(null);
  };

  const filteredPosters = safePosters
    .filter(p => p.title?.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(p => filterAudience === 'all' || p.audience === filterAudience);

  const isPosterActive = (poster) => {
    const now = new Date();
    const start = poster.startDate ? new Date(poster.startDate) : null;
    const end = poster.endDate ? new Date(poster.endDate) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showMessage('Invalid file type. Use JPEG, PNG, GIF, or WebP', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showMessage('Image must be under 5MB', 'error');
      return;
    }
    
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setFormData(prev => ({ ...prev, image: e.target.result }));
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files?.[0]);
  };

  const handleSave = async (isNew) => {
    if (!formData.title.trim()) {
      showMessage('Title is required', 'error');
      return;
    }
    if (isNew && !imageFile) {
      showMessage('Image is required', 'error');
      return;
    }

    setIsUploading(true);
    try {
      if (isNew) {
        const created = await BoardService.createPoster({ ...formData, imageFile });
        onUpdate([...safePosters, created]);
        showMessage('Poster created!');
        setShowAddForm(false);
      } else {
        const updated = await BoardService.updatePoster(editingId, formData);
        onUpdate(safePosters.map(p => p.id === editingId ? updated : p));
        showMessage('Poster updated!');
        setEditingId(null);
      }
      resetForm();
    } catch (err) {
      showMessage('Failed: ' + err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this poster?')) return;
    try {
      await BoardService.deletePoster(id);
      onUpdate(safePosters.filter(p => p.id !== id));
      showMessage('Poster deleted');
    } catch (err) {
      showMessage('Failed: ' + err.message, 'error');
    }
  };

  const startEdit = (poster) => {
    setFormData({
      title: poster.title,
      duration: poster.duration || 10000,
      startDate: poster.startDate || '',
      endDate: poster.endDate || '',
      audience: poster.audience || 'both'
    });
    setEditingId(poster.id);
    setShowAddForm(false);
  };

  const getAudienceBadge = (audience) => {
    const opt = audienceOptions.find(o => o.value === audience) || audienceOptions[0];
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${opt.color}`}>{opt.label}</span>;
  };

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
            placeholder="Search posters..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <button
          onClick={() => { setShowAddForm(true); setEditingId(null); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Poster
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterAudience('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            filterAudience === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({safePosters.length})
        </button>
        {audienceOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterAudience(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filterAudience === opt.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label} ({safePosters.filter(p => p.audience === opt.value).length})
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500 py-1.5">
          {safePosters.filter(isPosterActive).length} active now
        </span>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className={`rounded-xl border-2 p-5 ${showAddForm ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">{showAddForm ? 'New Poster' : 'Edit Poster'}</h4>
            <button 
              onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Image Upload (only for new) */}
            {showAddForm && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`aspect-video rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center transition-all ${
                  dragOver ? 'border-indigo-500 bg-indigo-100' : formData.image ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white hover:border-indigo-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  className="hidden"
                />
                {formData.image ? (
                  <div className="relative w-full h-full">
                    <img src={formData.image} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Drop image or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">JPEG, PNG, GIF, WebP (max 5MB)</p>
                  </>
                )}
              </div>
            )}
            
            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="Poster title"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (seconds)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={formData.duration / 1000}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) * 1000 })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
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
                        formData.audience === opt.value ? opt.color + ' border-current' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }}
              className="px-4 py-2 text-gray-600 hover:bg-white rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(showAddForm)}
              disabled={isUploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
            >
              {isUploading ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading...</> : showAddForm ? 'Create Poster' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Posters Grid */}
      {filteredPosters.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <Image className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No posters found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosters.map(poster => (
            <div
              key={poster.id}
              className={`bg-white rounded-xl border overflow-hidden group hover:shadow-lg transition-all ${
                isPosterActive(poster) ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              {/* Image */}
              <div className="aspect-video bg-gray-100 relative">
                {poster.imageUrl ? (
                  <img src={poster.imageUrl} alt={poster.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPreviewUrl(poster.imageUrl)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100"
                  >
                    <Eye className="h-5 w-5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => startEdit(poster)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100"
                  >
                    <Edit2 className="h-5 w-5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => handleDelete(poster.id)}
                    className="p-2 bg-white rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="h-5 w-5 text-red-500" />
                  </button>
                </div>
                
                {/* Status Badge */}
                {isPosterActive(poster) && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    Active
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-medium text-gray-900 line-clamp-1">{poster.title}</h4>
                  {getAudienceBadge(poster.audience)}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {(poster.duration || 10000) / 1000}s
                  </span>
                  {poster.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(poster.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <img src={previewUrl} alt="Preview" className="max-w-full max-h-full rounded-lg" />
          <button onClick={() => setPreviewUrl(null)} className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100">
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(PostersEditor);
