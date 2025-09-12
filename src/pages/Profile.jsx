import { useState, useEffect } from 'react';
import {
  User,
  Edit2,
  Save,
  X,
  Image,
  Video,
  Star,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Mail,
  Instagram,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Trophy,
  Camera,
  Trash2,
  Lock
} from 'lucide-react';
import ChangePassword from '../components/ChangePassword';
import { useAuth } from '../context/AuthContext';
import API_CONFIG from '../config/api';

function Profile() {
  const { user, makeAuthenticatedRequest, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadsLoading, setUploadsLoading] = useState(true);
  const [userUploads, setUserUploads] = useState([]);
  const [stats, setStats] = useState({
    totalUploads: 0,
    approvedUploads: 0,
    featuredUploads: 0,
    pendingUploads: 0
  });
  const [editForm, setEditForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [deletingUpload, setDeletingUpload] = useState(null);

  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName || '',
        lastName: user.lastName || ''
      });
      fetchUserUploads();
    }
  }, [user]);

  const fetchUserUploads = async () => {
    try {
      setUploadsLoading(true);
      
      // Fetch uploads and stats in parallel
      const [uploadsResponse, statsResponse] = await Promise.all([
        makeAuthenticatedRequest(
          `${API_CONFIG.BASE_URL}/api/user/uploads?page=0&size=100&sort=date,desc`
        ),
        makeAuthenticatedRequest(
          `${API_CONFIG.BASE_URL}/api/user/stats`
        )
      ]);

      if (!uploadsResponse.ok) {
        throw new Error('Failed to fetch uploads');
      }

      const uploadsData = await uploadsResponse.json();
      setUserUploads(uploadsData.content || []);
      
      // Use stats from dedicated endpoint if available, otherwise calculate
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        // Fallback to calculating stats from uploads data
        const total = uploadsData.content?.length || 0;
        const approved = uploadsData.content?.filter(upload => upload.approved === true).length || 0;
        const featured = uploadsData.content?.filter(upload => upload.featured === true).length || 0;
        const pending = uploadsData.content?.filter(upload => upload.approved === false).length || 0;

        setStats({
          totalUploads: total,
          approvedUploads: approved,
          featuredUploads: featured,
          pendingUploads: pending
        });
      }
    } catch (error) {
      console.error('Error fetching user uploads:', error);
      setErrors({ fetch: 'Failed to load your uploads' });
    } finally {
      setUploadsLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchUserUploads();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // First name validation
    if (!editForm.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (editForm.firstName.length > 20) {
      newErrors.firstName = 'First name must be 20 characters or less';
    } else if (!/^[A-Za-z]+([ '-][A-Za-z]+)*$/.test(editForm.firstName)) {
      newErrors.firstName = 'First name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Last name validation
    if (!editForm.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (editForm.lastName.length > 20) {
      newErrors.lastName = 'Last name must be 20 characters or less';
    } else if (!/^[A-Za-z]+([ '-][A-Za-z]+)*$/.test(editForm.lastName)) {
      newErrors.lastName = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.BASE_URL}/api/user/profile`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();
      await updateUser(updatedUser);
      
      setSuccess('Profile updated successfully! 🎉');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || ''
    });
    setErrors({});
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    try {
      // Handle both date-only strings (YYYY-MM-DD) and full datetime strings
      const date = new Date(dateString);
      
      // Check if it's just a date string (no time component)
      if (dateString && dateString.length === 10) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      // Full datetime
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString || 'Unknown date';
    }
  };

  const openMediaViewer = (upload) => {
    setSelectedMedia(upload);
    setShowMediaViewer(true);
  };

  const closeMediaViewer = () => {
    setSelectedMedia(null);
    setShowMediaViewer(false);
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const deleteUpload = async (uploadId, uploadTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${uploadTitle || 'this upload'}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingUpload(uploadId);
    try {
      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.BASE_URL}/api/user/uploads/${uploadId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete upload');
      }

      // Remove the upload from the local state
      setUserUploads(prev => prev.filter(upload => upload.id !== uploadId));
      
      // Update stats
      await refreshData();
      
      setSuccess('Upload deleted successfully! 🗑️');
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error deleting upload:', error);
      setErrors({ submit: error.message });
      setTimeout(() => setErrors({}), 5000);
    } finally {
      setDeletingUpload(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Sign In</h2>
          <p className="text-gray-600">You need to be signed in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 opacity-60"></div>
        <div className="relative text-center py-12">
          <div className="mb-4">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              <User className="h-4 w-4" />
              <span>Your Profile</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text mb-4">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-gray-600">
            Manage your profile information and view your uploaded content
          </p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700">{success}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700">{errors.submit}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information and Security */}
        <div className="lg:col-span-1 space-y-8">
          {/* Profile Information */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Edit2 className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            <div className="text-center mb-6">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 rounded-full blur-sm opacity-20"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-green-600 p-4 rounded-full">
                  <User className="h-12 w-12 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mt-4">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-gray-600">{user.email}</p>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={editForm.firstName}
                    onChange={handleInputChange}
                    maxLength={20}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.firstName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={editForm.lastName}
                    onChange={handleInputChange}
                    maxLength={20}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.lastName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                {user.studentNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student Number
                    </label>
                    <input
                      type="text"
                      value={user.studentNumber}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Student number cannot be changed</p>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>

                {user.studentNumber && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <User className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Student Number</p>
                      <p className="text-sm text-gray-600">{user.studentNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="mt-8">
            <ChangePassword />
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mt-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Your Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Camera className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{stats.totalUploads}</div>
                <div className="text-xs text-blue-700">Total Uploads</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{stats.approvedUploads}</div>
                <div className="text-xs text-green-700">Approved</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Star className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">{stats.featuredUploads}</div>
                <div className="text-xs text-purple-700">Featured</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-600">{stats.pendingUploads}</div>
                <div className="text-xs text-orange-700">Pending</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Uploads */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Your Uploads</h2>
              <button
                onClick={refreshData}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>

            {uploadsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={`skeleton-${i}`} className="bg-gray-100 rounded-lg p-4 animate-pulse">
                    <div className="flex space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : userUploads.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No uploads yet</h3>
                <p className="text-gray-600 mb-6">
                  Start sharing your memories with the community!
                </p>
                <a
                  href="/upload"
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-lg hover:scale-105 transition-all duration-200 font-semibold"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Upload Now</span>
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {userUploads.map((upload) => (
                  <div key={upload.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex space-x-4">
                      {/* Thumbnail */}
                      <div 
                        className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity relative group"
                        onClick={() => openMediaViewer(upload)}
                      >
                        {upload.type === 'image' ? (
                          <img 
                            src={upload.thumbnail || upload.src} 
                            alt={upload.title} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <Video className="h-8 w-8 text-gray-500" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-6 w-6 text-white" />
                        </div>
                      </div>

                      {/* Upload Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {upload.title || 'Untitled'}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {upload.event || 'No Event'} • {formatDate(upload.date)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {upload.type.toUpperCase()} • by {upload.author}
                            </p>
                          </div>
                          
                          {/* Status & Actions */}
                          <div className="flex items-center space-x-2">
                            {upload.featured && (
                              <div className="flex items-center space-x-1 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                                <Star className="h-3 w-3" />
                                <span>Featured</span>
                              </div>
                            )}
                            
                            {/* Show approval status */}
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                              upload.approved
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {upload.approved ? (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Approved</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3" />
                                  <span>Pending</span>
                                </>
                              )}
                            </div>

                            <button
                              onClick={() => downloadFile(upload.src, `${upload.title || 'download'}.${upload.type === 'image' ? 'jpg' : 'mp4'}`)}
                              className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => deleteUpload(upload.id, upload.title)}
                              disabled={deletingUpload === upload.id}
                              className="p-1 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete"
                            >
                              {deletingUpload === upload.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Media Viewer Modal */}
      {showMediaViewer && selectedMedia && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={closeMediaViewer}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Media Content */}
            <div className="relative max-w-full max-h-full">
              {selectedMedia.type === 'image' ? (
                <img
                  src={selectedMedia.src}
                  alt={selectedMedia.title}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <video
                  src={selectedMedia.src}
                  controls
                  autoPlay
                  className="max-w-full max-h-full object-contain rounded-lg"
                  style={{ maxHeight: '80vh' }}
                >
                  Your browser does not support the video tag.
                </video>
              )}
            </div>

            {/* Media Info Overlay */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{selectedMedia.title || 'Untitled'}</h3>
                  <p className="text-sm text-gray-300 mb-2">
                    By {selectedMedia.author}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                    <span>Event: {selectedMedia.event || 'No Event'}</span>
                    <span>Uploaded: {formatDate(selectedMedia.date)}</span>
                    <span>Type: {selectedMedia.type.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedMedia.featured && (
                    <div className="flex items-center space-x-1 bg-purple-600 px-2 py-1 rounded-full text-xs">
                      <Star className="h-3 w-3" />
                      <span>Featured</span>
                    </div>
                  )}
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                    selectedMedia.approved ? 'bg-green-600' : 'bg-orange-600'
                  }`}>
                    {selectedMedia.approved ? (
                      <>
                        <CheckCircle className="h-3 w-3" />
                        <span>Approved</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3" />
                        <span>Pending</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => downloadFile(selectedMedia.src, `${selectedMedia.title || 'download'}.${selectedMedia.type === 'image' ? 'jpg' : 'mp4'}`)}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => {
                      closeMediaViewer();
                      deleteUpload(selectedMedia.id, selectedMedia.title);
                    }}
                    disabled={deletingUpload === selectedMedia.id}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingUpload === selectedMedia.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
