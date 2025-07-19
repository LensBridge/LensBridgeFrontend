import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Users, Image, BarChart3, Settings, Crown, 
  ChevronLeft, ChevronRight, CheckCircle, X, Star, 
  Calendar, Activity, AlertTriangle, Plus, Filter,
  Search, Download, Eye, Trash2, Instagram, ExternalLink,
  Play, Pause, Volume2, VolumeX, Maximize, DownloadIcon
} from 'lucide-react';
import API_CONFIG from '../config/api';

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('uploads');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload Management State
  const [uploads, setUploads] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [uploadPage, setUploadPage] = useState(0);
  const [uploadSize] = useState(20);
  const [uploadFilter, setUploadFilter] = useState('all'); // all, pending, approved, featured

  // Event Management State
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ eventName: '', eventDate: '', status: 'ONGOING' });
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // Audit State
  const [audits, setAudits] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [auditPage, setAuditPage] = useState(0);
  const [auditSize] = useState(20);
  const [auditActions, setAuditActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Stats State
  const [stats, setStats] = useState({
    totalUploads: 0,
    approvedUploads: 0,
    featuredUploads: 0,
    totalEvents: 0
  });

  // Media Viewer State
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);

  useEffect(() => {
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user info:', error);
      }
    }
    
    // Load initial data
    fetchUploads();
    fetchEvents();
    fetchAuditActions();
    if (activeTab === 'audit') {
      fetchAudits();
    }
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...API_CONFIG.HEADERS
    };
  };

  const showMessage = (message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess('');
    } else {
      setSuccess(message);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  };

  // Upload Management Functions
  const fetchUploads = useCallback(async (page = uploadPage, filter = uploadFilter) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        size: uploadSize.toString(),
        sort: 'createdDate,desc'
      });

      let endpoint = '/api/admin/uploads';
      switch (filter) {
        case 'pending':
          endpoint = '/api/admin/uploads/pending';
          break;
        case 'approved':
          endpoint = '/api/admin/uploads/approved';
          break;
        case 'featured':
          endpoint = '/api/admin/uploads/featured';
          break;
        default:
          endpoint = '/api/admin/uploads';
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}?${queryParams}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch uploads');

      const data = await response.json();
      setUploads(data);
      
      // Calculate stats from all uploads (only when fetching 'all')
      if (filter === 'all') {
        setStats(prev => ({
          ...prev,
          totalUploads: data.totalElements,
          approvedUploads: data.content.filter(u => u.approved).length,
          featuredUploads: data.content.filter(u => u.featured).length
        }));
      }
    } catch (error) {
      showMessage('Failed to fetch uploads', true);
    } finally {
      setLoading(false);
    }
  }, [uploadPage, uploadSize, uploadFilter]);

  const approveUpload = async (uploadId) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/upload/${uploadId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const result = await response.json();
      showMessage(result.message);
      fetchUploads();
    } catch (error) {
      showMessage(error.message, true);
    }
  };

  const deleteUpload = async (uploadId) => {
    if (!confirm('Are you sure you want to delete this upload?')) return;
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/upload/${uploadId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to delete upload');

      const result = await response.json();
      showMessage(result.message);
      fetchUploads();
    } catch (error) {
      showMessage('Failed to delete upload', true);
    }
  };

  const featureUpload = async (uploadId) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/feature-upload/${uploadId}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const result = await response.json();
      showMessage(result.message);
      fetchUploads();
    } catch (error) {
      showMessage(error.message, true);
    }
  };

  // Event Management Functions
  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/events`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();
      setEvents(data);
      setStats(prev => ({ ...prev, totalEvents: data.length }));
    } catch (error) {
      showMessage('Failed to fetch events', true);
    }
  };

  const createEvent = async () => {
    try {
      const formData = new URLSearchParams();
      formData.append('eventName', newEvent.eventName);
      formData.append('eventDate', newEvent.eventDate);
      formData.append('status', newEvent.status);

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/create-event`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          ...API_CONFIG.HEADERS
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to create event');

      const result = await response.json();
      showMessage(result.message);
      setNewEvent({ eventName: '', eventDate: '', status: 'ONGOING' });
      setShowCreateEvent(false);
      fetchEvents();
    } catch (error) {
      showMessage('Failed to create event', true);
    }
  };

  // Audit Functions
  const fetchAudits = useCallback(async (page = auditPage) => {
    setLoading(true);
    try {
      let url = `${API_CONFIG.BASE_URL}/api/admin/audit`;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        size: auditSize.toString(),
        sort: 'timestamp,desc'
      });

      if (selectedAction) {
        url = `${API_CONFIG.BASE_URL}/api/admin/audit/action/${selectedAction}`;
      } else if (dateRange.start && dateRange.end) {
        url = `${API_CONFIG.BASE_URL}/api/admin/audit/daterange`;
        queryParams.append('start', dateRange.start);
        queryParams.append('end', dateRange.end);
      }

      const response = await fetch(`${url}?${queryParams}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data = await response.json();
      setAudits(data);
    } catch (error) {
      showMessage('Failed to fetch audit logs', true);
    } finally {
      setLoading(false);
    }
  }, [auditPage, auditSize, selectedAction, dateRange]);

  const fetchAuditActions = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/admin/audit/actions`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch audit actions');

      const data = await response.json();
      setAuditActions(data);
    } catch (error) {
      showMessage('Failed to fetch audit actions', true);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAudits();
    }
  }, [activeTab, fetchAudits]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDisplayName = (upload) => {
    if (upload.anon) {
      return "Anonymous";
    }
    
    const fullName = `${upload.uploaderFirstName || ''} ${upload.uploaderLastName || ''}`.trim();
    if (!fullName) return "Unknown User";
    
    if (upload.uploaderStudentNumber) {
      return `${fullName} (${upload.uploaderStudentNumber})`;
    }
    
    return fullName;
  };

  const getTooltipText = (upload) => {
    if (upload.anon) {
      const fullName = `${upload.uploaderFirstName || ''} ${upload.uploaderLastName || ''}`.trim();
      if (fullName) {
        return `Anonymous upload by: ${fullName}${upload.uploaderStudentNumber ? ` (${upload.uploaderStudentNumber})` : ''}${upload.uploaderEmail ? `\nEmail: ${upload.uploaderEmail}` : ''}`;
      }
      return 'Anonymous upload - no author information';
    }
    return null;
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
      showMessage('File downloaded successfully');
    } catch (error) {
      showMessage('Failed to download file', true);
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

  const StatusBadge = ({ approved, featured }) => (
    <div className="flex gap-2">
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
        approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
      }`}>
        {approved ? 'Approved' : 'Pending'}
      </span>
      {featured && (
        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
          Featured
        </span>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Header */}
      <div className="relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-60"></div>
        <div className="relative text-center py-12">
          <div className="mb-4">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              <Crown className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">LensBridge Admin</span>
          </h1>
          <p className="text-lg text-gray-600">
            Welcome back, {user?.firstName || 'Admin'}! Manage your platform
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-full p-3 w-fit mx-auto mb-3">
            <Image className="h-6 w-6" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalUploads}</div>
          <div className="text-sm text-gray-600">Total Uploads</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-full p-3 w-fit mx-auto mb-3">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.approvedUploads}</div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
          <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full p-3 w-fit mx-auto mb-3">
            <Star className="h-6 w-6" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.featuredUploads}</div>
          <div className="text-sm text-gray-600">Featured</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
          <div className="bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-full p-3 w-fit mx-auto mb-3">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalEvents}</div>
          <div className="text-sm text-gray-600">Events</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'uploads', label: 'Upload Management', icon: Image },
              { id: 'events', label: 'Event Management', icon: Calendar },
              { id: 'audit', label: 'Audit Logs', icon: Activity }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">{renderTabContent()}</div>
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
              {selectedMedia.contentType === 'IMAGE' ? (
                <img
                  src={selectedMedia.fileUrl}
                  alt={selectedMedia.fileName}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : selectedMedia.contentType === 'VIDEO' ? (
                <video
                  src={selectedMedia.fileUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-full object-contain rounded-lg"
                  style={{ maxHeight: '80vh' }}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="bg-white p-8 rounded-lg">
                  <div className="text-center">
                    <Image className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {selectedMedia.fileName}
                    </p>
                    <p className="text-gray-600 mb-4">
                      Preview not available for this file type
                    </p>
                    <button
                      onClick={() => downloadFile(selectedMedia.fileUrl, selectedMedia.fileName)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 mx-auto"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      <span>Download File</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Media Info Overlay */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{selectedMedia.fileName}</h3>
                  <p className="text-sm text-gray-300 mb-2">
                    {selectedMedia.uploadDescription || 'No description'}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                    <span>Type: {selectedMedia.contentType}</span>
                    <span>Uploaded: {formatDate(selectedMedia.createdDate)}</span>
                    <span>Event: {selectedMedia.eventName || 'No Event'}</span>
                    {!selectedMedia.anon && (
                      <span>By: {getDisplayName(selectedMedia)}</span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => downloadFile(selectedMedia.fileUrl, selectedMedia.fileName)}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-1"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                  {!selectedMedia.approved && (
                    <button
                      onClick={() => {
                        approveUpload(selectedMedia.uuid);
                        closeMediaViewer();
                      }}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {selectedMedia.approved && !selectedMedia.featured && (
                    <button
                      onClick={() => {
                        featureUpload(selectedMedia.uuid);
                        closeMediaViewer();
                      }}
                      className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Feature
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderTabContent() {
    switch (activeTab) {
      case 'uploads':
        return renderUploadsTab();
      case 'events':
        return renderEventsTab();
      case 'audit':
        return renderAuditTab();
      default:
        return null;
    }
  }

  function renderUploadsTab() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Upload Management</h3>
          <button
            onClick={() => fetchUploads()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'all', label: 'All Uploads', count: stats.totalUploads },
              { id: 'pending', label: 'Pending Approval', count: stats.totalUploads - stats.approvedUploads },
              { id: 'approved', label: 'Approved', count: stats.approvedUploads },
              { id: 'featured', label: 'Featured', count: stats.featuredUploads }
            ].map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => {
                  setUploadFilter(id);
                  setUploadPage(0);
                  fetchUploads(0, id);
                }}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  uploadFilter === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{label}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  uploadFilter === id 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {count || 0}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Uploads Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Media
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Download
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {uploads.content.map((upload) => (
                <tr key={upload.uuid} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="h-16 w-16 rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity relative group"
                        onClick={() => openMediaViewer(upload)}
                      >
                        {upload.contentType === 'IMAGE' ? (
                          <img src={upload.fileUrl} alt={upload.fileName} className="h-full w-full object-cover" />
                        ) : upload.contentType === 'VIDEO' ? (
                          <div className="h-full w-full relative">
                            <video 
                              src={upload.fileUrl} 
                              className="h-full w-full object-cover"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                              <Play className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Image className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{upload.uploadDescription || 'No description'}</div>
                    <div className="text-sm text-gray-500">{upload.fileName}</div>
                    <div className="text-xs text-gray-400">Type: {upload.contentType}</div>
                    {upload.anon && (
                      <div className="text-xs text-blue-600 font-medium">Anonymous Upload</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {upload.anon ? (
                      <div className="text-sm">
                        <div className="text-gray-500 italic mb-1">Anonymous</div>
                        {/* Spoiler text effect for anonymous uploader info */}
                        <div 
                          className="relative inline-block cursor-help group"
                          title="Hover to reveal uploader identity"
                        >
                          <div className="bg-black text-black select-none group-hover:bg-transparent group-hover:text-gray-600 transition-all duration-200 px-2 py-1 rounded text-xs">
                            {getDisplayName({ 
                              ...upload, 
                              anon: false 
                            }) || 'Unknown User'}
                          </div>
                          {upload.uploaderEmail && (
                            <div className="bg-black text-black select-none group-hover:bg-transparent group-hover:text-gray-500 transition-all duration-200 px-2 py-1 rounded text-xs mt-1">
                              {upload.uploaderEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getDisplayName(upload)}
                        </div>
                        {upload.uploaderEmail && (
                          <div className="text-xs text-gray-500">{upload.uploaderEmail}</div>
                        )}
                        {upload.instagramHandle && (
                          <div className="text-sm text-blue-600 mt-1">
                            <a 
                              href={`https://instagram.com/${upload.instagramHandle.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline flex items-center space-x-1"
                            >
                              <Instagram className="h-3 w-3" />
                              <span>@{upload.instagramHandle.replace('@', '')}</span>
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {upload.eventName || 'No Event'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge approved={upload.approved} featured={upload.featured} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(upload.createdDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {!upload.approved && (
                        <button
                          onClick={() => approveUpload(upload.uuid)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {upload.approved && !upload.featured && (
                        <button
                          onClick={() => featureUpload(upload.uuid)}
                          className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 transition-colors"
                        >
                          Feature
                        </button>
                      )}
                      <button
                        onClick={() => deleteUpload(upload.uuid)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => downloadFile(upload.fileUrl, upload.fileName)}
                      className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-1"
                      title="Download original file"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {uploads.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {uploadPage * uploadSize + 1} to {Math.min((uploadPage + 1) * uploadSize, uploads.totalElements)} of {uploads.totalElements} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const newPage = Math.max(0, uploadPage - 1);
                  setUploadPage(newPage);
                  fetchUploads(newPage, uploadFilter);
                }}
                disabled={uploadPage === 0}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700">
                Page {uploadPage + 1} of {uploads.totalPages}
              </span>
              <button
                onClick={() => {
                  const newPage = Math.min(uploads.totalPages - 1, uploadPage + 1);
                  setUploadPage(newPage);
                  fetchUploads(newPage, uploadFilter);
                }}
                disabled={uploadPage >= uploads.totalPages - 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderEventsTab() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Event Management</h3>
          <button
            onClick={() => setShowCreateEvent(!showCreateEvent)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Event</span>
          </button>
        </div>

        {/* Create Event Form */}
        {showCreateEvent && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Create New Event</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Event Name"
                value={newEvent.eventName}
                onChange={(e) => setNewEvent({ ...newEvent, eventName: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={newEvent.eventDate}
                onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={newEvent.status}
                onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ONGOING">Ongoing</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="flex space-x-3 mt-4">
              <button
                onClick={createEvent}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                disabled={!newEvent.eventName || !newEvent.eventDate}
              >
                Create Event
              </button>
              <button
                onClick={() => setShowCreateEvent(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">{event.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  event.status === 'ONGOING' ? 'bg-green-100 text-green-800' :
                  event.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {event.status}
                </span>
              </div>
              <p className="text-gray-600 text-sm">
                Date: {formatDate(event.date)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderAuditTab() {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xl font-bold text-gray-900">Audit Logs</h3>
          <div className="flex space-x-3">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {auditActions.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            <button
              onClick={() => fetchAudits()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="datetime-local"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {audits.content.map((audit) => (
                <tr key={audit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(audit.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {audit.adminEmail}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      {audit.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {audit.entityType}: {audit.entityId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      audit.result.includes('200') || audit.result === 'Success'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {audit.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Audit Pagination */}
        {audits.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {auditPage * auditSize + 1} to {Math.min((auditPage + 1) * auditSize, audits.totalElements)} of {audits.totalElements} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setAuditPage(Math.max(0, auditPage - 1))}
                disabled={auditPage === 0}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700">
                Page {auditPage + 1} of {audits.totalPages}
              </span>
              <button
                onClick={() => setAuditPage(Math.min(audits.totalPages - 1, auditPage + 1))}
                disabled={auditPage >= audits.totalPages - 1}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default AdminDashboard;
