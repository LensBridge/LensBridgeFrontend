import { useState, useRef, memo } from 'react';
import { 
  Plus, Trash2, Edit2, Image, Users, Clock, Calendar,
  Eye, Upload, X, Search, ImagePlus, Link2, FileImage,
  CheckCircle, Loader2
} from 'lucide-react';
import BoardService from '../../services/BoardService';

/**
 * PostersEditor - Manage promotional posters for the board
 * Handles poster images with file upload, durations, date ranges, and audience targeting
 */
function PostersEditor({ posters, onUpdate, showMessage }) {
  const [editingPoster, setEditingPoster] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAudience, setFilterAudience] = useState('all');
  const [previewPoster, setPreviewPoster] = useState(null);
  const [uploadMode, setUploadMode] = useState('upload'); // 'upload' or 'url'
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);

  // New poster form state
  const [newPoster, setNewPoster] = useState({
    title: '',
    image: '',
    duration: 10000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    audience: 'both'
  });

  // Audience options
  const audienceOptions = [
    { value: 'both', label: 'Everyone', icon: Users, color: 'bg-purple-100 text-purple-700' },
    { value: 'brothers', label: 'Brothers', icon: Users, color: 'bg-blue-100 text-blue-700' },
    { value: 'sisters', label: 'Sisters', icon: Users, color: 'bg-pink-100 text-pink-700' }
  ];

  // Filter posters
  const filteredPosters = posters
    .filter(poster => 
      poster.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(poster => 
      filterAudience === 'all' || poster.audience === filterAudience
    );

  // Check if poster is active (within date range)
  const isPosterActive = (poster) => {
    const now = new Date();
    const start = poster.startDate ? new Date(poster.startDate) : null;
    const end = poster.endDate ? new Date(poster.endDate) : null;
    
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  // Handle file upload (converts to data URL for now - mock)
  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showMessage('Please upload a valid image (JPEG, PNG, GIF, or WebP)', true);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('Image must be less than 5MB', true);
      return;
    }

    setIsUploading(true);

    try {
      // Store the file object for later upload
      setImageFile(file);
      
      // Convert to data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewPoster({ ...newPoster, image: e.target.result });
        setIsUploading(false);
        showMessage('✅ Image ready for upload');
      };
      reader.onerror = () => {
        setIsUploading(false);
        showMessage('Failed to read image file', true);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
      showMessage('Failed to upload image', true);
    }
  };

  // Handle file input change
  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // Add new poster
  const handleAddPoster = async () => {
    if (!newPoster.title.trim()) {
      showMessage('Poster title is required', true);
      return;
    }
    if (!imageFile) {
      showMessage('Poster image is required', true);
      return;
    }

    setIsUploading(true);
    try {
      const posterData = {
        title: newPoster.title.trim(),
        duration: newPoster.duration,
        startDate: newPoster.startDate,
        endDate: newPoster.endDate,
        audience: newPoster.audience,
        imageFile: imageFile
      };

      const createdPoster = await BoardService.createPoster(posterData);
      onUpdate([...posters, createdPoster]);
      showMessage('✅ Poster created successfully');
      
      // Reset form
      setNewPoster({
        title: '',
        image: '',
        duration: 10000,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        audience: 'both'
      });
      setImageFile(null);
      setShowAddForm(false);
    } catch (error) {
      showMessage('Failed to create poster: ' + error.message, true);
    } finally {
      setIsUploading(false);
    }
  };

  // Update existing poster
  const handleUpdatePoster = async (updatedPoster) => {
    try {
      const updates = {
        title: updatedPoster.title,
        duration: updatedPoster.duration,
        startDate: updatedPoster.startDate,
        endDate: updatedPoster.endDate,
        audience: updatedPoster.audience
      };
      
      const savedPoster = await BoardService.updatePoster(updatedPoster.id, updates);
      onUpdate(posters.map(p => p.id === savedPoster.id ? savedPoster : p));
      showMessage('✅ Poster updated');
      setEditingPoster(null);
    } catch (error) {
      showMessage('Failed to update poster: ' + error.message, true);
    }
  };

  // Delete poster
  const handleDeletePoster = async (posterId) => {
    if (!confirm('Are you sure you want to delete this poster?')) {
      return;
    }
    
    try {
      await BoardService.deletePoster(posterId);
      onUpdate(posters.filter(p => p.id !== posterId));
      showMessage('🗑️ Poster deleted');
    } catch (error) {
      showMessage('Failed to delete poster: ' + error.message, true);
    }
  };

  // Get audience badge component
  const AudienceBadge = ({ audience }) => {
    const option = audienceOptions.find(o => o.value === audience) || audienceOptions[0];
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
        <option.icon className="h-3 w-3 mr-1" />
        {option.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Poster Management</h3>
          <p className="text-sm text-gray-500">
            {posters.length} posters • {posters.filter(isPosterActive).length} currently active
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search posters..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 flex items-center space-x-2 shadow-md hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            <span>Add Poster</span>
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
          All ({posters.length})
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
            {option.label} ({posters.filter(p => p.audience === option.value).length})
          </button>
        ))}
      </div>

      {/* Add Poster Form */}
      {showAddForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 animate-slideDown shadow-lg">
          <h4 className="font-semibold text-indigo-900 mb-4 flex items-center">
            <ImagePlus className="h-5 w-5 mr-2" />
            Add New Poster
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Poster Title *</label>
              <input
                type="text"
                value={newPoster.title}
                onChange={(e) => setNewPoster({ ...newPoster, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="e.g., Weekly Halaqa"
              />
            </div>

            {/* Image Upload Section */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Poster Image *</label>
              
              {/* Upload Mode Tabs */}
              <div className="flex space-x-2 mb-3">
                <button
                  type="button"
                  onClick={() => setUploadMode('upload')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    uploadMode === 'upload'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    uploadMode === 'url'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Link2 className="h-4 w-4" />
                  <span>Image URL</span>
                </button>
              </div>

              {uploadMode === 'upload' ? (
                // Drag and Drop Upload Zone
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-indigo-500 bg-indigo-100 scale-[1.02]'
                      : newPoster.image
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-3" />
                      <p className="text-indigo-600 font-medium">Uploading...</p>
                    </div>
                  ) : newPoster.image ? (
                    <div className="space-y-3">
                      <div className="relative w-48 h-32 mx-auto rounded-lg overflow-hidden shadow-lg">
                        <img
                          src={newPoster.image}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewPoster({ ...newPoster, image: '' });
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span className="font-medium">Image ready</span>
                      </div>
                      <p className="text-sm text-gray-500">Click or drop to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <FileImage className={`h-16 w-16 mx-auto transition-colors ${
                        dragOver ? 'text-indigo-500' : 'text-gray-400'
                      }`} />
                      <div>
                        <p className="text-gray-700 font-medium">
                          Drop your image here, or <span className="text-indigo-600">browse</span>
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Supports: JPEG, PNG, GIF, WebP (Max 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // URL Input
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newPoster.image}
                    onChange={(e) => setNewPoster({ ...newPoster, image: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="https://example.com/poster.jpg"
                  />
                  {newPoster.image && (
                    <div className="relative w-48 h-32 rounded-lg overflow-hidden bg-gray-100 shadow-lg animate-fadeIn">
                      <img
                        src={newPoster.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23ef4444" font-size="10">Invalid URL</text></svg>';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Duration (seconds)</label>
              <input
                type="number"
                min="5"
                max="60"
                value={newPoster.duration / 1000}
                onChange={(e) => setNewPoster({ ...newPoster, duration: parseInt(e.target.value) * 1000 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <select
                value={newPoster.audience}
                onChange={(e) => setNewPoster({ ...newPoster, audience: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                {audienceOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={newPoster.startDate}
                onChange={(e) => setNewPoster({ ...newPoster, startDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={newPoster.endDate}
                onChange={(e) => setNewPoster({ ...newPoster, endDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewPoster({
                  title: '',
                  image: '',
                  duration: 10000,
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  audience: 'both'
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPoster}
              disabled={!newPoster.title || !newPoster.image}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Poster</span>
            </button>
          </div>
        </div>
      )}

      {/* Posters Grid */}
      {filteredPosters.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200 animate-fadeIn">
          <Image className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>No posters found</p>
          {searchTerm && <p className="text-sm">Try adjusting your search</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosters.map((poster, index) => (
            <div 
              key={poster.id} 
              className={`bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fadeInUp ${
                !isPosterActive(poster) ? 'opacity-60' : ''
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {editingPoster === poster.id ? (
                <PosterEditForm
                  poster={poster}
                  onSave={handleUpdatePoster}
                  onCancel={() => setEditingPoster(null)}
                  audienceOptions={audienceOptions}
                />
              ) : (
                <>
                  {/* Poster Image */}
                  <div 
                    className="relative h-40 bg-gray-100 cursor-pointer group overflow-hidden"
                    onClick={() => setPreviewPoster(poster)}
                  >
                    <img
                      src={poster.image}
                      alt={poster.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f3f4f6" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12">No Image</text></svg>';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Eye className="h-8 w-8 text-white transform scale-0 group-hover:scale-100 transition-transform duration-300" />
                    </div>
                    
                    {/* Status Badge */}
                    <div className="absolute top-2 left-2">
                      {isPosterActive(poster) ? (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">Active</span>
                      ) : (
                        <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full shadow-lg">Inactive</span>
                      )}
                    </div>

                    {/* Audience Badge */}
                    <div className="absolute top-2 right-2">
                      <AudienceBadge audience={poster.audience} />
                    </div>
                  </div>

                  {/* Poster Info */}
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 truncate">{poster.title}</h4>
                    
                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {poster.duration / 1000}s display
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {poster.startDate} → {poster.endDate}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingPoster(poster.id)}
                        className="text-gray-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePoster(poster.id)}
                        className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Poster Preview Modal */}
      {previewPoster && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setPreviewPoster(null)}
        >
          <div className="relative max-w-4xl max-h-full animate-scaleIn">
            <button
              onClick={() => setPreviewPoster(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={previewPoster.image}
              alt={previewPoster.title}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-4 text-center text-white animate-fadeInUp">
              <h3 className="text-xl font-bold">{previewPoster.title}</h3>
              <p className="text-gray-300 mt-1">
                {previewPoster.duration / 1000}s • {previewPoster.startDate} to {previewPoster.endDate}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center animate-fadeInUp hover:shadow-md transition-all">
          <div className="text-2xl font-bold text-green-600">{posters.filter(isPosterActive).length}</div>
          <div className="text-sm text-green-700">Active Now</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center animate-fadeInUp hover:shadow-md transition-all" style={{ animationDelay: '100ms' }}>
          <div className="text-2xl font-bold text-purple-600">{posters.filter(p => p.audience === 'both').length}</div>
          <div className="text-sm text-purple-700">For Everyone</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center animate-fadeInUp hover:shadow-md transition-all" style={{ animationDelay: '200ms' }}>
          <div className="text-2xl font-bold text-blue-600">{posters.filter(p => p.audience === 'brothers').length}</div>
          <div className="text-sm text-blue-700">Brothers Only</div>
        </div>
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-center animate-fadeInUp hover:shadow-md transition-all" style={{ animationDelay: '300ms' }}>
          <div className="text-2xl font-bold text-pink-600">{posters.filter(p => p.audience === 'sisters').length}</div>
          <div className="text-sm text-pink-700">Sisters Only</div>
        </div>
      </div>
    </div>
  );
}

// Inline edit form component
function PosterEditForm({ poster, onSave, onCancel, audienceOptions }) {
  const [formData, setFormData] = useState({ ...poster });
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = (file) => {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) return;
    if (file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData({ ...formData, image: e.target.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 bg-indigo-50 animate-fadeIn">
      <div className="space-y-3">
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm transition-all focus:ring-2 focus:ring-indigo-500"
          placeholder="Poster title"
        />
      
      {/* Image upload in edit mode */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFileUpload(e.dataTransfer.files?.[0]);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`relative h-24 border-2 border-dashed rounded-lg cursor-pointer transition-all overflow-hidden ${
          dragOver ? 'border-indigo-500 bg-indigo-100' : 'border-gray-300 hover:border-indigo-400'
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
          <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Upload className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Duration (s)</label>
          <input
            type="number"
            min="5"
            max="60"
            value={formData.duration / 1000}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) * 1000 })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Audience</label>
          <select
            value={formData.audience}
            onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            {audienceOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Start</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">End</label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
    <div className="flex justify-end space-x-2 mt-3">
      <button
        onClick={onCancel}
        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={() => onSave(formData)}
        className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-all"
      >
        Save
      </button>
    </div>
    </div>
  );
}

export default memo(PostersEditor);
