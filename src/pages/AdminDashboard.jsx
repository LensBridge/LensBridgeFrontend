import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Users, Image, BarChart3, Settings, Crown, 
  ChevronLeft, ChevronRight, CheckCircle, X, Star, 
  Calendar, Activity, AlertTriangle, Plus, Filter,
  Search, Download, Eye, Trash2, Instagram, ExternalLink,
  Play, Pause, Volume2, VolumeX, Maximize, DownloadIcon,
  XCircle, StarOff
} from 'lucide-react';
import API_CONFIG from '../config/api';
import { useAuth } from '../context/AuthContext';

function AdminDashboard() {
  const { user, makeAuthenticatedRequest, isAdmin } = useAuth();
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
  const [newEvent, setNewEvent] = useState({ eventName: '', eventDate: '', eventTime: '', status: 'ONGOING' });
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // Audit State
  const [audits, setAudits] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [auditPage, setAuditPage] = useState(0);
  const [auditSize] = useState(20);
  const [auditActions, setAuditActions] = useState([]);
  const [selectedAction, setSelectedAction] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // User Management State
  const [users, setUsers] = useState({ content: [], totalElements: 0, totalPages: 0 });
  const [userPage, setUserPage] = useState(0);
  const [userSize] = useState(20);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showRemoveRole, setShowRemoveRole] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentNumber: ''
  });
  const [selectedRole, setSelectedRole] = useState('');

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
    // Load initial data
    fetchUploads();
    fetchEvents();
    fetchAuditActions();
    if (hasRootPermissions()) {
      fetchAvailableRoles();
    }
    if (activeTab === 'audit') {
      fetchAudits();
    } else if (activeTab === 'users' && hasRootPermissions()) {
      fetchUsers();
    }
  }, []);

  // Helper function to check if user has ROLE_ROOT permissions
  const hasRootPermissions = () => {
    if (!user) return false;
    
    return (
      (user.authorities && user.authorities.some(auth => auth.authority === 'ROLE_ROOT')) ||
      (user.roles && user.roles.some(role => role === 'ROLE_ROOT' || role === 'ROOT')) ||
      user.role === 'ROLE_ROOT'
    );
  };

  // Helper function to check if user has admin permissions (ROLE_ADMIN or ROLE_ROOT)
  const hasAdminPermissions = () => {
    if (!user) return false;
    
    return (
      hasRootPermissions() ||
      isAdmin()
    );
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

      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}${endpoint}?${queryParams}`);

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
  }, [uploadPage, uploadSize, uploadFilter, makeAuthenticatedRequest]);

  const approveUpload = async (uploadId) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}/api/admin/upload/${uploadId}`, {
        method: 'POST'
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
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}/api/admin/upload/${uploadId}`, {
        method: 'DELETE'
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
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}/api/admin/feature-upload/${uploadId}`, {
        method: 'POST'
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

  const unapproveUpload = async (uploadId) => {
    if (!confirm('Are you sure you want to unapprove this upload?')) return;
    
    try {
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}/api/admin/upload/${uploadId}/approval`, {
        method: 'DELETE'
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

  const unfeatureUpload = async (uploadId) => {
    if (!confirm('Are you sure you want to unfeature this upload?')) return;
    
    try {
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}/api/admin/upload/${uploadId}/featured`, {
        method: 'DELETE'
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
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}/api/admin/events`);

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
      // Combine date and time into ISO string
      let isoDateTime = '';
      if (newEvent.eventDate && newEvent.eventTime) {
        // e.g. 2025-07-16 and 04:00 => 2025-07-16T04:00:00.000Z
        const date = new Date(`${newEvent.eventDate}T${newEvent.eventTime}:00.000Z`);
        isoDateTime = date.toISOString();
      } else if (newEvent.eventDate) {
        // Only date, fallback to midnight UTC
        const date = new Date(`${newEvent.eventDate}T00:00:00.000Z`);
        isoDateTime = date.toISOString();
      }

      const formData = new URLSearchParams();
      formData.append('eventName', newEvent.eventName);
      formData.append('eventDate', isoDateTime);
      formData.append('status', newEvent.status);

      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}/api/admin/create-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to create event');

      const result = await response.json();
      showMessage(result.message);
      setNewEvent({ eventName: '', eventDate: '', eventTime: '', status: 'ONGOING' });
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

      const response = await makeAuthenticatedRequest(`${url}?${queryParams}`);

      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data = await response.json();
      setAudits(data);
    } catch (error) {
      showMessage('Failed to fetch audit logs', true);
    } finally {
      setLoading(false);
    }
  }, [auditPage, auditSize, selectedAction, dateRange, makeAuthenticatedRequest]);

  const fetchAuditActions = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}/api/admin/audit/actions`);

      if (!response.ok) throw new Error('Failed to fetch audit actions');

      const data = await response.json();
      setAuditActions(data);
    } catch (error) {
      showMessage('Failed to fetch audit actions', true);
    }
  };

  // User Management Functions
  const fetchUsers = useCallback(async (page = userPage, searchTerm = userSearchTerm) => {
    if (!hasRootPermissions(user)) return;
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        size: userSize.toString(),
        sort: 'firstName,asc'
      });

      if (searchTerm.trim()) {
        queryParams.append('search', searchTerm.trim());
      }

      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}/api/admin/users?${queryParams}`);

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      showMessage('Failed to fetch users', true);
    } finally {
      setLoading(false);
    }
  }, [userPage, userSize, userSearchTerm, user, makeAuthenticatedRequest]);

  const handleUserSearch = (searchTerm) => {
    setUserSearchTerm(searchTerm);
    setUserPage(0);
    fetchUsers(0, searchTerm);
  };

  const fetchAvailableRoles = async () => {
    if (!hasRootPermissions(user)) return;
    
    try {
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN.ROLES}`);

      if (!response.ok) throw new Error('Failed to fetch roles');

      const data = await response.json();
      setAvailableRoles(data);
      if (data.length > 0) {
        setSelectedRole(data[0]);
      }
    } catch (error) {
      showMessage('Failed to fetch available roles', true);
    }
  };

  const createUser = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN.USER_CREATE}`, {
        method: 'POST',
        body: JSON.stringify(newUser)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
      }

      showMessage(data.message || 'User created successfully');
      setNewUser({ firstName: '', lastName: '', email: '', studentNumber: '' });
      setShowCreateUser(false);
      fetchUsers();
    } catch (error) {
      showMessage(error.message, true);
    }
  };

  const addRoleToUser = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN.USER_ADD_ROLE}/${selectedUserId}/add-role`, {
        method: 'POST',
        body: JSON.stringify(selectedRole)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add role');
      }

      showMessage('Role added successfully');
      setShowAddRole(false);
      setSelectedUserId(null);
      setSelectedRole('');
      fetchUsers();
    } catch (error) {
      showMessage(error.message, true);
    }
  };

  const removeRoleFromUser = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN.USER_REMOVE_ROLE}/${selectedUserId}/remove-role`, {
        method: 'POST',
        body: JSON.stringify(selectedRole)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to remove role');
      }

      showMessage('Role removed successfully');
      setShowRemoveRole(false);
      setSelectedUserId(null);
      setSelectedUser(null);
      setSelectedRole('');
      fetchUsers();
    } catch (error) {
      showMessage(error.message, true);
    }
  };

  const verifyUser = async (userId) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN.USER_VERIFY}`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to verify user');
      }

      showMessage('User verified successfully');
      fetchUsers();
    } catch (error) {
      showMessage(error.message, true);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAudits();
    } else if (activeTab === 'users' && hasRootPermissions(user)) {
      fetchUsers();
      fetchAvailableRoles();
    }
  }, [activeTab, fetchAudits, fetchUsers, user]);

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
      <div className="relative overflow-hidden mb-8 rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-60"></div>
        <div className="relative flex flex-col items-center justify-center text-center py-12 px-4">
          <div className="mb-4 flex justify-center">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              <Crown className="h-4 w-4" />
              <span>Admin Dashboard</span>
              {hasRootPermissions(user) && (
                <div className="ml-2 bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                  ROOT
                </div>
              )}
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 max-w-4xl">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              LensBridge Admin
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Welcome back, {user?.firstName || 'Admin'}! Manage your platform
            {hasRootPermissions(user) && (
              <span className="block text-sm text-yellow-600 font-medium mt-1">
                🔑 Root Access Enabled - Full System Control
              </span>
            )}
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
              { id: 'uploads', label: 'Upload Management', icon: Image, requiredRole: 'admin' },
              { id: 'events', label: 'Event Management', icon: Calendar, requiredRole: 'admin' },
              { id: 'audit', label: 'Audit Logs', icon: Activity, requiredRole: 'admin' },
              ...(hasRootPermissions(user) ? [
                { id: 'users', label: 'User Management', icon: Users, requiredRole: 'root' },
                { id: 'system', label: 'System Settings', icon: Settings, requiredRole: 'root' },
                { id: 'permissions', label: 'Role Management', icon: Crown, requiredRole: 'root' }
              ] : [])
            ].filter(tab => {
              if (tab.requiredRole === 'root') return hasRootPermissions(user);
              if (tab.requiredRole === 'admin') return hasAdminPermissions(user);
              return true;
            }).map(({ id, label, icon: Icon }) => (
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
                {hasRootPermissions(user) && (id === 'users' || id === 'system' || id === 'permissions') && (
                  <Crown className="h-3 w-3 text-yellow-500" title="Root Access Required" />
                )}
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
                  {!selectedMedia.approved ? (
                    <button
                      onClick={() => {
                        approveUpload(selectedMedia.uuid);
                        closeMediaViewer();
                      }}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        unapproveUpload(selectedMedia.uuid);
                        closeMediaViewer();
                      }}
                      className="bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      Unapprove
                    </button>
                  )}
                  {selectedMedia.approved && !selectedMedia.featured ? (
                    <button
                      onClick={() => {
                        featureUpload(selectedMedia.uuid);
                        closeMediaViewer();
                      }}
                      className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Feature
                    </button>
                  ) : selectedMedia.featured ? (
                    <button
                      onClick={() => {
                        unfeatureUpload(selectedMedia.uuid);
                        closeMediaViewer();
                      }}
                      className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Unfeature
                    </button>
                  ) : null}
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
      case 'users':
        return hasRootPermissions(user) ? renderUsersTab() : renderAccessDenied();
      case 'system':
        return hasRootPermissions(user) ? renderSystemTab() : renderAccessDenied();
      case 'permissions':
        return hasRootPermissions(user) ? renderPermissionsTab() : renderAccessDenied();
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
        <div className="hidden lg:block">
          {/* Desktop Table View */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                    Media
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details & Author
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Upload UUID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Event & Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploads.content.map((upload) => (
                  <tr key={upload.uuid} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="h-12 w-12 rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity relative group"
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
                                <Play className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Image className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {upload.uploadDescription || 'No description'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {upload.fileName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {upload.contentType}
                          {upload.anon && <span className="text-blue-600 font-medium ml-2">• Anonymous</span>}
                        </div>
                        {/* Author Info */}
                        {upload.anon ? (
                          <div className="text-xs">
                            <span className="text-gray-500 italic">Anonymous</span>
                            <div 
                              className="inline-block cursor-help group ml-1"
                              title="Hover to reveal uploader identity"
                            >
                              <span className="bg-black text-black select-none group-hover:bg-transparent group-hover:text-gray-600 transition-all duration-200 px-1 rounded text-xs">
                                {getDisplayName({ ...upload, anon: false }) || 'Unknown User'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-600">
                            {getDisplayName(upload)}
                            {upload.instagramHandle && (
                              <a 
                                href={`https://instagram.com/${upload.instagramHandle.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 ml-1 inline-flex items-center gap-1 transition-colors"
                                title="View Instagram profile"
                              >
                                @{upload.instagramHandle.replace('@', '')}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs font-mono text-gray-600 break-all">
                        {upload.uuid}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {upload.eventName || 'No Event'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(upload.createdDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <StatusBadge approved={upload.approved} featured={upload.featured} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => downloadFile(upload.fileUrl, upload.fileName)}
                          className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition-colors"
                          title="Download"
                        >
                          <DownloadIcon className="h-3 w-3" />
                        </button>
                        {!upload.approved ? (
                          <button
                            onClick={() => approveUpload(upload.uuid)}
                            className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </button>
                        ) : (
                          <button
                            onClick={() => unapproveUpload(upload.uuid)}
                            className="bg-yellow-600 text-white p-2 rounded hover:bg-yellow-700 transition-colors"
                            title="Unapprove"
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        )}
                        {upload.approved && !upload.featured ? (
                          <button
                            onClick={() => featureUpload(upload.uuid)}
                            className="bg-purple-600 text-white p-2 rounded hover:bg-purple-700 transition-colors"
                            title="Feature"
                          >
                            <Star className="h-3 w-3" />
                          </button>
                        ) : upload.featured ? (
                          <button
                            onClick={() => unfeatureUpload(upload.uuid)}
                            className="bg-orange-600 text-white p-2 rounded hover:bg-orange-700 transition-colors"
                            title="Unfeature"
                          >
                            <StarOff className="h-3 w-3" />
                          </button>
                        ) : null}
                        <button
                          onClick={() => deleteUpload(upload.uuid)}
                          className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {uploads.content.map((upload) => (
            <div key={upload.uuid} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex space-x-3">
                {/* Media Thumbnail */}
                <div 
                  className="h-16 w-16 rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity relative group flex-shrink-0"
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
                        <Play className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {upload.uploadDescription || 'No description'}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{upload.fileName}</p>
                    </div>
                    <StatusBadge approved={upload.approved} featured={upload.featured} />
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <div>Event: {upload.eventName || 'No Event'}</div>
                    <div>Date: {formatDate(upload.createdDate)}</div>
                    <div>Type: {upload.contentType}</div>
                    
                    {/* Author Info */}
                    {upload.anon ? (
                      <div>
                        Author: <span className="text-gray-500 italic">Anonymous</span>
                        <span 
                          className="ml-1 bg-black text-black select-none hover:bg-transparent hover:text-gray-600 transition-all duration-200 px-1 rounded cursor-help"
                          title="Hover to reveal uploader identity"
                        >
                          {getDisplayName({ ...upload, anon: false }) || 'Unknown User'}
                        </span>
                      </div>
                    ) : (
                      <div>
                        Author: {getDisplayName(upload)}
                        {upload.instagramHandle && (
                          <a 
                            href={`https://instagram.com/${upload.instagramHandle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 ml-1 inline-flex items-center gap-1 transition-colors"
                            title="View Instagram profile"
                          >
                            @{upload.instagramHandle.replace('@', '')}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                    <div>UUID: <span className="font-mono text-xs">{upload.uuid}</span></div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 mt-3 flex-wrap">
                    <button
                      onClick={() => downloadFile(upload.fileUrl, upload.fileName)}
                      className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700 transition-colors flex items-center space-x-1"
                    >
                      <DownloadIcon className="h-3 w-3" />
                      <span>Download</span>
                    </button>
                    {!upload.approved ? (
                      <button
                        onClick={() => approveUpload(upload.uuid)}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                    ) : (
                      <button
                        onClick={() => unapproveUpload(upload.uuid)}
                        className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700 transition-colors"
                      >
                        Unapprove
                      </button>
                    )}
                    {upload.approved && !upload.featured ? (
                      <button
                        onClick={() => featureUpload(upload.uuid)}
                        className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 transition-colors"
                      >
                        Feature
                      </button>
                    ) : upload.featured ? (
                      <button
                        onClick={() => unfeatureUpload(upload.uuid)}
                        className="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700 transition-colors"
                      >
                        Unfeature
                      </button>
                    ) : null}
                    <button
                      onClick={() => deleteUpload(upload.uuid)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <input
                type="time"
                value={newEvent.eventTime || ''}
                onChange={(e) => setNewEvent({ ...newEvent, eventTime: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Event Time"
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
                  event.status === 'UPCOMING' ? 'bg-yellow-100 text-yellow-800' :
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

  // Access denied component for unauthorized access to root-only features
  function renderAccessDenied() {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Shield className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600 max-w-md">
          This section requires ROOT permissions. Please contact a system administrator if you need access.
        </p>
      </div>
    );
  }

  // Root-only: User Management Tab
  function renderUsersTab() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">ROOT ONLY</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateUser(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create User</span>
            </button>
            <button
              onClick={() => fetchUsers()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search users by name, email, or student number..."
            value={userSearchTerm}
            onChange={(e) => handleUserSearch(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.content.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-green-600 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.studentNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              role === 'ROLE_ROOT'
                                ? 'bg-red-100 text-red-800'
                                : role === 'ROLE_ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {role === 'ROLE_ROOT' && <Crown className="h-3 w-3 mr-1" />}
                            {role.replace('ROLE_', '')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.verified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.verified ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Pending
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setShowAddRole(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                          title="Add Role"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        {user.roles.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setSelectedUser(user);
                              setShowRemoveRole(true);
                            }}
                            className="text-orange-600 hover:text-orange-900"
                            title="Remove Role"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        {!user.verified && (
                          <button
                            onClick={() => verifyUser(user.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Verify User"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit User"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {users.content.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500">
                {userSearchTerm ? 'Try adjusting your search criteria.' : 'No users are currently in the system.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {users.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {userPage * userSize + 1} to {Math.min((userPage + 1) * userSize, users.totalElements)} of {users.totalElements} users
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const newPage = userPage - 1;
                  setUserPage(newPage);
                  fetchUsers(newPage);
                }}
                disabled={userPage === 0 || loading}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {userPage + 1} of {users.totalPages}
              </span>
              <button
                onClick={() => {
                  const newPage = userPage + 1;
                  setUserPage(newPage);
                  fetchUsers(newPage);
                }}
                disabled={userPage >= users.totalPages - 1 || loading}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateUser && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter last name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Student Number
                  </label>
                  <input
                    type="text"
                    value={newUser.studentNumber}
                    onChange={(e) => setNewUser(prev => ({ ...prev, studentNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter student number"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> The user account will be created in a disabled state. The user must reset their password via the "Forgot Password" link to activate their account.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createUser}
                  disabled={!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.studentNumber}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Role Modal */}
        {showAddRole && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Role to User</h3>
                <button
                  onClick={() => setShowAddRole(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Role
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a role</option>
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role.replace('ROLE_', '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Adding roles will grant additional permissions to the user. Be careful when assigning ADMIN or ROOT roles.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddRole(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addRoleToUser}
                  disabled={!selectedRole}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Role
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Role Modal */}
        {showRemoveRole && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Remove Role from User</h3>
                <button
                  onClick={() => {
                    setShowRemoveRole(false);
                    setSelectedUserId(null);
                    setSelectedUser(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    <strong>User:</strong> {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Email:</strong> {selectedUser.email}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Role to Remove
                  </label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a role to remove</option>
                    {selectedUser.roles.map((role) => (
                      <option key={role} value={role}>
                        {role.replace('ROLE_', '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> Removing roles will revoke permissions from the user. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowRemoveRole(false);
                    setSelectedUserId(null);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={removeRoleFromUser}
                  disabled={!selectedRole}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove Role
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Root-only: System Settings Tab
  function renderSystemTab() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">ROOT ONLY</span>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Root Access Feature</h4>
              <p className="text-sm text-yellow-700 mt-1">
                System settings management is currently under development. This feature will allow ROOT users to:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                <li>Configure application settings</li>
                <li>Manage file upload limits</li>
                <li>Configure email templates</li>
                <li>Database maintenance tools</li>
                <li>System backup and restore</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Root-only: Permissions/Role Management Tab
  function renderPermissionsTab() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">Role Management</h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">ROOT ONLY</span>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Root Access Feature</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Role and permission management is currently under development. This feature will allow ROOT users to:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                <li>Create and modify user roles</li>
                <li>Assign permissions to roles</li>
                <li>View role hierarchy</li>
                <li>Manage access control policies</li>
                <li>Audit permission changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default AdminDashboard;
