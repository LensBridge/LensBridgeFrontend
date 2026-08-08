import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Users, Image, BarChart3, Crown,
  ChevronLeft, ChevronRight, CheckCircle, X, Star,
  Calendar, Activity, AlertTriangle, Plus, Filter,
  Search, Download, Eye, Trash2, Instagram, ExternalLink,
  Play, Pause, Volume2, VolumeX, Maximize, DownloadIcon,
  XCircle, StarOff, Monitor, KeyRound
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  BOARD_SECTION_PERMISSIONS,
  PERMISSIONS,
} from '../utils/permissions';
import {
  AuditActionBadge,
  CreateUserModal,
  PermissionGrantPanel,
  RoleAssignmentModal,
  RoleBadge,
} from '../components/admin';
import { AUDIT_ENTITY_LABELS } from '../components/admin/audit';
import { bareRoleName, canAssignRole } from '../components/admin/roles';

/**
 * What each tab needs to be worth showing.
 *
 * These were role names — uploads and events were `ADMIN`, everything else was
 * `ROOT`, which is why a BOARD_ADMIN who needs the audit log had to be made a
 * root account. Each tab now asks for the permission its endpoints actually
 * check, and a tab nobody can use is not rendered at all.
 */
const TAB_PERMISSIONS = {
  uploads: [PERMISSIONS.MEDIA_UPLOAD_READ, PERMISSIONS.MEDIA_UPLOAD_MODERATE],
  events: [PERMISSIONS.MEDIA_EVENT_WRITE],
  audit: [PERMISSIONS.AUDIT_READ],
  users: [PERMISSIONS.IAM_USER_READ],
};

const TABS = [
  { id: 'uploads', label: 'Upload Management', icon: Image },
  { id: 'events', label: 'Event Management', icon: Calendar },
  { id: 'audit', label: 'Audit Logs', icon: Activity },
  { id: 'users', label: 'User Management', icon: Users },
];

function AdminDashboard() {
  const { user, can, canAny, isRoot, permissions: heldPermissions } = useAuth();
  const [activeTab, setActiveTab] = useState(null);
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
  // 'add-role' | 'remove-role' | 'permissions', always against `selectedUser`.
  const [userAction, setUserAction] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);

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

  const visibleTabs = useMemo(
    () => TABS.filter((tab) => canAny(TAB_PERMISSIONS[tab.id])),
    [canAny]
  );

  /**
   * §6.5: a bundle may only be handed over — or taken away — by someone holding
   * every permission in it. Filtering the options here rather than letting the
   * server refuse means the operator is not picking from a list of choices that
   * were never going to work.
   */
  const assignableRoles = useMemo(
    () => availableRoles.filter((role) => canAssignRole(role, heldPermissions)),
    [availableRoles, heldPermissions]
  );

  /** Nobody may modify their own roles or permissions, so nothing is offered. */
  const isSelf = useCallback((row) => Boolean(user?.id) && row.id === user.id, [user]);

  /**
   * Someone who can see the uploads tab and someone who can only see the audit
   * log are both admins now, so there is no tab that is always safe to open by
   * default — a BOARD_ADMIN used to land on an empty upload table.
   */
  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  const showMessage = useCallback((message, isError = false) => {
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
  }, []);

  // Upload Management Functions
  const fetchUploads = useCallback(async (page = uploadPage, filter = uploadFilter) => {
    setLoading(true);
    try {
      // openapi-fetch derives parameter and response types from the literal path,
      // so the filter picks a call rather than building a URL string.
      const options = {
        params: { query: { page, size: uploadSize, sort: ['createdDate,desc'] } }
      };
      const { data, error } =
        filter === 'pending' ? await api.GET('/api/admin/uploads/pending', options)
        : filter === 'approved' ? await api.GET('/api/admin/uploads/approved', options)
        : filter === 'featured' ? await api.GET('/api/admin/uploads/featured', options)
        : await api.GET('/api/admin/uploads', options);

      if (error) throw new Error('Failed to fetch uploads');

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

  const approveUpload = useCallback(async (uploadId) => {
    try {
      const { data: result, error } = await api.POST('/api/admin/upload/{uploadId}', {
        params: { path: { uploadId } }
      });

      if (error) throw new Error(error.message);

      showMessage(result.message);
      fetchUploads();
    } catch (error) {
      showMessage(error.message, true);
    }
  }, [showMessage, fetchUploads]);

  const deleteUpload = useCallback(async (uploadId) => {
    const upload = uploads.content.find(u => u.uuid === uploadId);
    const uploadTitle = upload?.uploadDescription || upload?.fileName || 'this upload';
    
    if (!confirm(`⚠️ Are you sure you want to permanently delete "${uploadTitle}"?\n\nThis action cannot be undone.`)) return;
    
    try {
      const { data: result, error } = await api.DELETE('/api/admin/upload/{uploadId}', {
        params: { path: { uploadId } }
      });

      if (error) throw new Error('Failed to delete upload');

      showMessage(`🗑️ ${result.message}`);
      fetchUploads();
    } catch (error) {
      showMessage('❌ Failed to delete upload', true);
    }
  }, [uploads.content, showMessage, fetchUploads]);

  const featureUpload = useCallback(async (uploadId) => {
    try {
      const { data: result, error } = await api.POST('/api/admin/feature-upload/{uploadId}', {
        params: { path: { uploadId } }
      });

      if (error) throw new Error(error.message);

      showMessage(result.message);
      fetchUploads();
    } catch (error) {
      showMessage(error.message, true);
    }
  }, [showMessage, fetchUploads]);

  const unapproveUpload = useCallback(async (uploadId) => {
    const upload = uploads.content.find(u => u.uuid === uploadId);
    const uploadTitle = upload?.uploadDescription || upload?.fileName || 'this upload';
    
    if (!confirm(`🤔 Remove approval from "${uploadTitle}"?\n\nThis will hide it from the public gallery until re-approved.`)) return;
    
    try {
      const { data: result, error } = await api.DELETE('/api/admin/upload/{uploadId}/approval', {
        params: { path: { uploadId } }
      });

      if (error) throw new Error(error.message);

      showMessage(`⏪ ${result.message}`);
      fetchUploads();
    } catch (error) {
      showMessage(`❌ ${error.message}`, true);
    }
  }, [uploads.content, showMessage, fetchUploads]);

  const unfeatureUpload = useCallback(async (uploadId) => {
    if (!confirm('Are you sure you want to unfeature this upload?')) return;
    
    try {
      const { data: result, error } = await api.DELETE('/api/admin/upload/{uploadId}/featured', {
        params: { path: { uploadId } }
      });

      if (error) throw new Error(error.message);

      showMessage(result.message);
      fetchUploads();
    } catch (error) {
      showMessage(error.message, true);
    }
  }, [showMessage, fetchUploads]);

  // Event Management Functions
  const fetchEvents = async () => {
    try {
      const { data, error } = await api.GET('/api/admin/events', {});

      if (error) throw new Error('Failed to fetch events');

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

      // Bound with @RequestParam server-side, so these are query parameters.
      const { data: result, error } = await api.POST('/api/admin/create-event', {
        params: {
          query: {
            eventName: newEvent.eventName,
            eventDate: isoDateTime,
            status: newEvent.status
          }
        }
      });

      if (error) throw new Error('Failed to create event');

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
      const paging = { page, size: auditSize, sort: ['timestamp,desc'] };

      const { data, error } = selectedAction
        ? await api.GET('/api/admin/audit/action/{action}', {
            params: { path: { action: selectedAction }, query: paging }
          })
        : dateRange.start && dateRange.end
        ? await api.GET('/api/admin/audit/daterange', {
            params: { query: { ...paging, start: dateRange.start, end: dateRange.end } }
          })
        : await api.GET('/api/admin/audit', { params: { query: paging } });

      if (error) throw new Error('Failed to fetch audit logs');

      setAudits(data);
    } catch (error) {
      showMessage('Failed to fetch audit logs', true);
    } finally {
      setLoading(false);
    }
  }, [auditPage, auditSize, selectedAction, dateRange]);

  const fetchAuditActions = async () => {
    try {
      const { data, error } = await api.GET('/api/admin/audit/actions', {});

      if (error) throw new Error('Failed to fetch audit actions');

      setAuditActions(data);
    } catch (error) {
      showMessage('Failed to fetch audit actions', true);
    }
  };

  // User Management Functions
  const fetchUsers = useCallback(async (page = userPage) => {
    if (!can(PERMISSIONS.IAM_USER_READ)) return;

    setLoading(true);
    try {
      // NOTE: `searchTerm` is not sent. GET /api/admin/users binds only Pageable
      // (AdminController.getAllUsers -> UserService.getAllUsers), so the previous
      // `search` query param was discarded server-side and user search has never
      // filtered anything. Making it work needs backend support first.
      const { data, error } = await api.GET('/api/admin/users', {
        params: { query: { page, size: userSize, sort: ['firstName,asc'] } }
      });

      if (error) throw new Error('Failed to fetch users');

      setUsers(data);
    } catch (error) {
      showMessage('Failed to fetch users', true);
    } finally {
      setLoading(false);
    }
  }, [userPage, userSize, can, showMessage]);

  // Debounced search to prevent excessive API calls
  const searchTimeoutRef = useRef(null);
  const handleUserSearch = useCallback((searchTerm) => {
    setUserSearchTerm(searchTerm);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      setUserPage(0);
      fetchUsers(0);
    }, 300); // 300ms debounce
  }, [fetchUsers]);

  /**
   * `RoleDefinitionResponse[]`, not the bare `string[]` this used to return —
   * each entry carries the bundle's description and permission set, which is
   * what the assignment modals render and what decides whether the current user
   * is allowed to hand the bundle over at all.
   */
  const fetchAvailableRoles = useCallback(async () => {
    if (!can(PERMISSIONS.IAM_USER_READ)) return;

    try {
      const { data, error } = await api.GET('/api/admin/roles', {});

      if (error) throw new Error(error.message || 'Failed to fetch roles');

      setAvailableRoles(data);
    } catch (error) {
      showMessage(error.message, true);
    }
  }, [can, showMessage]);

  const fetchAvailablePermissions = useCallback(async () => {
    if (!can(PERMISSIONS.IAM_ROLE_GRANT)) return;

    try {
      const { data, error } = await api.GET('/api/admin/permissions', {});

      if (error) throw new Error(error.message || 'Failed to fetch permissions');

      setAvailablePermissions(data);
    } catch (error) {
      showMessage(error.message, true);
    }
  }, [can, showMessage]);

  /**
   * Returns the outcome rather than toasting it, so the modal can keep the
   * form open and show a collision next to the fields that caused it.
   */
  const createUser = useCallback(async (body) => {
    try {
      const { data, error } = await api.POST('/api/admin/user/create', { body });

      if (error) {
        throw new Error(error.message || 'Failed to create user');
      }

      showMessage(data.message || 'User created successfully');
      fetchUsers();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }, [fetchUsers, showMessage]);

  /**
   * The four grant endpoints share a result shape.
   *
   * The server's refusals (§6.5) name the rule that was broken — "cannot grant a
   * permission you do not hold", "last holder of iam:role:grant" — so the
   * message is returned verbatim to whichever modal made the call and rendered
   * next to the control, rather than replaced with a generic failure string.
   */
  const grantCall = useCallback(async (path, userId, body) => {
    try {
      const { data, error } = await api.POST(path, {
        params: { path: { userId } },
        body
      });

      if (error) throw new Error(error.message || 'Request failed');

      fetchUsers();
      return { ok: true, message: data?.message || 'Done' };
    } catch (error) {
      return { ok: false, message: error.message };
    }
  }, [fetchUsers]);

  const addRoleToUser = (roleName) =>
    grantCall('/api/admin/user/{userId}/add-role', selectedUser.id, roleName);

  const removeRoleFromUser = (roleName) =>
    grantCall('/api/admin/user/{userId}/remove-role', selectedUser.id, roleName);

  const grantPermission = (permissionName) =>
    grantCall('/api/admin/user/{userId}/grant-permission', selectedUser.id, permissionName);

  const revokePermission = (permissionName) =>
    grantCall('/api/admin/user/{userId}/revoke-permission', selectedUser.id, permissionName);

  const verifyUser = async (userId) => {
    try {
      const { error } = await api.POST('/api/admin/user/verify', { body: { userId } });

      if (error) {
        throw new Error(error.message || 'Failed to verify user');
      }

      showMessage('User verified successfully');
      fetchUsers();
    } catch (error) {
      showMessage(error.message, true);
    }
  };

  useEffect(() => {
    if (canAny(TAB_PERMISSIONS.uploads)) fetchUploads();
    if (canAny(TAB_PERMISSIONS.events)) fetchEvents();
    if (can(PERMISSIONS.AUDIT_READ)) fetchAuditActions();
    fetchAvailableRoles();
    fetchAvailablePermissions();
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;

      if (e.key === 'r' && canAny(TAB_PERMISSIONS.uploads)) {
        e.preventDefault();
        fetchUploads();
        showMessage('🔄 Refreshed uploads');
        return;
      }

      // Ctrl+N indexes the tabs the user can see rather than a fixed list, so
      // the shortcut can never select one that is not rendered.
      const index = Number(e.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < visibleTabs.length) {
        e.preventDefault();
        setActiveTab(visibleTabs[index].id);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [visibleTabs, canAny, fetchUploads, showMessage]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAudits();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, fetchAudits, fetchUsers]);

  /**
   * Grants land on the server, not on the copy of the user held here, so an
   * open picker would keep showing the state from before the click. Re-reading
   * the row out of the refreshed page keeps effective/direct honest.
   */
  useEffect(() => {
    if (!selectedUser) return;
    const fresh = users.content.find((row) => row.id === selectedUser.id);
    if (fresh && fresh !== selectedUser) setSelectedUser(fresh);
  }, [users, selectedUser]);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getDisplayName = useCallback((upload) => {
    if (upload.anon) {
      return "Anonymous";
    }
    
    const fullName = `${upload.uploaderFirstName || ''} ${upload.uploaderLastName || ''}`.trim();
    if (!fullName) return "Unknown User";
    
    if (upload.uploaderStudentNumber) {
      return `${fullName} (${upload.uploaderStudentNumber})`;
    }
    
    return fullName;
  }, []);

  const getTooltipText = useCallback((upload) => {
    if (upload.anon) {
      const fullName = `${upload.uploaderFirstName || ''} ${upload.uploaderLastName || ''}`.trim();
      if (fullName) {
        return `Anonymous upload by: ${fullName}${upload.uploaderStudentNumber ? ` (${upload.uploaderStudentNumber})` : ''}${upload.uploaderEmail ? `\nEmail: ${upload.uploaderEmail}` : ''}`;
      }
      return 'Anonymous upload - no author information';
    }
    return null;
  }, []);

  const downloadFile = useCallback(async (secureUrl, fileName) => {
    try {
      const response = await fetch(secureUrl);
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
  }, [showMessage]);

  const openMediaViewer = useCallback((upload) => {
    setSelectedMedia(upload);
    setShowMediaViewer(true);
  }, []);

  const closeMediaViewer = useCallback(() => {
    setSelectedMedia(null);
    setShowMediaViewer(false);
  }, []);

  // Memoized StatusBadge component to prevent unnecessary re-renders
  const StatusBadge = memo(({ approved, featured }) => (
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
  ));

  // Memoized UploadRow component - CRITICAL for performance
  const UploadRow = memo(({ upload }) => (
    <tr key={upload.uuid} className="hover:bg-gray-50">
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div 
            className="h-12 w-12 rounded-lg overflow-hidden bg-gray-200 cursor-pointer hover:opacity-80 transition-opacity relative group"
            onClick={() => openMediaViewer(upload)}
          >
            {upload.contentType === 'IMAGE' ? (
              <img src={upload.thumbnail || upload.secureUrl} alt={upload.fileName} className="h-full w-full object-cover" loading="lazy" />
            ) : upload.contentType === 'VIDEO' ? (
              <div className="h-full w-full relative">
                <video 
                  src={upload.thumbnail || upload.secureUrl} 
                  className="h-full w-full object-cover"
                  muted
                  preload="none"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="h-4 w-4 text-white" />
                </div>
              </div>
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Image className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
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
            onClick={() => downloadFile(upload.secureUrl, upload.fileName)}
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
  ));

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
              {isRoot() && (
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
            {isRoot() && (
              <span className="block text-sm text-yellow-600 font-medium mt-1">
                🔑 Root Access Enabled - Full System Control
              </span>
            )}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {canAny(BOARD_SECTION_PERMISSIONS) && (
              <Link
                to="/admin/board"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all hover:scale-[1.02]"
              >
                <Monitor className="h-5 w-5" />
                <span>Manage Musallah Boards</span>
              </Link>
            )}
            {can(PERMISSIONS.BOARD_DEVICE_READ) && (
              <Link
                to="/admin/devices"
                className="inline-flex items-center space-x-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-all hover:scale-[1.02]"
              >
                <Monitor className="h-5 w-5" />
                <span>Board Devices</span>
              </Link>
            )}
          </div>
          {/* Quick Actions */}
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 text-gray-600 rounded border">Ctrl+R</kbd>
            <span className="text-xs text-gray-500">Refresh</span>
            <span className="text-gray-300 mx-2">•</span>
            <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 text-gray-600 rounded border">
              Ctrl+1-{Math.max(visibleTabs.length, 1)}
            </kbd>
            <span className="text-xs text-gray-500">Switch tabs</span>
          </div>
        </div>
      </div>

      {/* Enhanced Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {loading && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span>Processing your request...</span>
        </div>
      )}

      {/* Stats. Every counter here is media, and none of them are ever fetched
          for someone without the media permissions — four zeros read as an empty
          platform rather than as a section they cannot see. */}
      {canAny([...TAB_PERMISSIONS.uploads, ...TAB_PERMISSIONS.events]) && (
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
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {visibleTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
            {canAny(BOARD_SECTION_PERMISSIONS) && (
              <Link
                to="/admin/board"
                className="py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
              >
                <Monitor className="h-4 w-4" />
                <span>Board Management</span>
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </Link>
            )}
            {can(PERMISSIONS.BOARD_DEVICE_READ) && (
              <Link
                to="/admin/devices"
                className="py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap"
              >
                <Monitor className="h-4 w-4" />
                <span>Board Devices</span>
                <ExternalLink className="h-3 w-3 text-gray-400" />
              </Link>
            )}
          </nav>
        </div>

        <div className="p-6">{renderTabContent()}</div>
      </div>

      {/* Media Viewer Modal */}
      {showMediaViewer && selectedMedia && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={closeMediaViewer}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/75 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Media Content */}
            <div className="relative max-w-full max-h-full">
              {selectedMedia.contentType === 'IMAGE' ? (
                <img
                  src={selectedMedia.secureUrl}
                  alt={selectedMedia.fileName}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : selectedMedia.contentType === 'VIDEO' ? (
                <video
                  src={selectedMedia.secureUrl}
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
                      onClick={() => downloadFile(selectedMedia.secureUrl, selectedMedia.fileName)}
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
            <div className="absolute bottom-4 left-4 right-4 bg-black/75 text-white p-4 rounded-lg">
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
                    onClick={() => downloadFile(selectedMedia.secureUrl, selectedMedia.fileName)}
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
    // The nav only renders tabs the user holds a permission for, so reaching a
    // tab id that is not in `visibleTabs` means the permission set changed under
    // an open page rather than that someone guessed a tab name.
    if (activeTab && !visibleTabs.some((tab) => tab.id === activeTab)) {
      return renderAccessDenied();
    }

    switch (activeTab) {
      case 'uploads':
        return renderUploadsTab();
      case 'events':
        return renderEventsTab();
      case 'audit':
        return renderAuditTab();
      case 'users':
        return renderUsersTab();
      default:
        return null;
    }
  }

  function renderUploadsTab() {
    const pendingCount = stats.totalUploads - stats.approvedUploads;
    const approvalRate = stats.totalUploads > 0 ? Math.round((stats.approvedUploads / stats.totalUploads) * 100) : 0;
    
    return (
      <div className="space-y-6">
        {/* Enhanced Header with Mini Stats */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Upload Management</h3>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span>📊 {approvalRate}% approval rate</span>
              {pendingCount > 0 && (
                <span className="text-orange-600 font-medium">
                  ⏳ {pendingCount} pending review
                </span>
              )}
              <span>🎯 {stats.featuredUploads} featured</span>
            </div>
          </div>
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
                  <UploadRow key={upload.uuid} upload={upload} />
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
                    <img src={upload.thumbnail || upload.secureUrl} alt={upload.fileName} className="h-full w-full object-cover" loading="lazy" />
                  ) : upload.contentType === 'VIDEO' ? (
                    <div className="h-full w-full relative">
                      <video 
                        src={upload.thumbnail || upload.secureUrl} 
                        className="h-full w-full object-cover"
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      onClick={() => downloadFile(upload.secureUrl, upload.fileName)}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
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
                  <AuditActionBadge action={audit.action} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div>{AUDIT_ENTITY_LABELS[audit.targetEntityType] ?? audit.targetEntityType}</div>
                  <div className="font-mono text-xs text-gray-400 break-all">{audit.targetEntityId}</div>
                </td>
                {/* Without this, "issued a command" and "screenshotted a prayer
                    space" are the same log line, as are granting
                    board:content:read and granting iam:role:grant. */}
                <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                  {audit.details ? (
                    <span className="font-mono text-xs break-words">{audit.details}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
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

  function renderAccessDenied() {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Shield className="h-16 w-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Not permitted</h3>
        <p className="text-gray-600 max-w-md">
          Your account no longer holds a permission this section requires. Sign in again, or ask
          whoever administers the console for the grant.
        </p>
      </div>
    );
  }

  function renderUsersTab() {
    const canGrant = can(PERMISSIONS.IAM_ROLE_GRANT);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
          </div>
          <div className="flex items-center space-x-3">
            {can(PERMISSIONS.IAM_USER_WRITE) && (
              <button
                onClick={() => setShowCreateUser(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create User</span>
              </button>
            )}
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
                    Permissions
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
                {users.content.map((row) => {
                  const directCount = row.directPermissions?.length ?? 0;
                  const effectiveCount = row.effectivePermissions?.length ?? 0;
                  const self = isSelf(row);

                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-green-600 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {row.firstName.charAt(0)}{row.lastName.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {row.firstName} {row.lastName}
                              {self && (
                                <span className="ml-2 text-xs font-normal text-gray-400">(you)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {row.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.studentNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {row.roles.map((role) => (
                            <RoleBadge key={role} role={role} />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="text-gray-900">{effectiveCount} effective</div>
                        {directCount > 0 && (
                          <div className="text-xs text-indigo-600">{directCount} direct</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.verified
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {row.verified ? (
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
                      {/* Guard 1 of §6.5: nobody modifies their own grants, so
                          the whole set of grant controls is absent on your own
                          row rather than present and rejected. */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {canGrant && !self && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUser(row);
                                  setUserAction('add-role');
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Add Role"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              {row.roles.length > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedUser(row);
                                    setUserAction('remove-role');
                                  }}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Remove Role"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedUser(row);
                                  setUserAction('permissions');
                                }}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Direct permissions"
                              >
                                <KeyRound className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {!row.verified && can(PERMISSIONS.IAM_USER_WRITE) && (
                            <button
                              onClick={() => verifyUser(row.id)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Verify User"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

        {showCreateUser && (
          <CreateUserModal onSubmit={createUser} onClose={() => setShowCreateUser(false)} />
        )}

        {(userAction === 'add-role' || userAction === 'remove-role') && selectedUser && (
          <RoleAssignmentModal
            mode={userAction === 'remove-role' ? 'remove' : 'add'}
            targetUser={selectedUser}
            options={
              userAction === 'remove-role'
                ? assignableRoles.filter((role) =>
                    selectedUser.roles.some((held) => bareRoleName(held) === role.name)
                  )
                : assignableRoles.filter((role) =>
                    !selectedUser.roles.some((held) => bareRoleName(held) === role.name)
                  )
            }
            onSubmit={userAction === 'remove-role' ? removeRoleFromUser : addRoleToUser}
            onClose={() => {
              setUserAction(null);
              setSelectedUser(null);
            }}
          />
        )}

        {userAction === 'permissions' && selectedUser && (
          <PermissionGrantPanel
            targetUser={selectedUser}
            permissions={availablePermissions}
            heldPermissions={heldPermissions}
            onGrant={grantPermission}
            onRevoke={revokePermission}
            onClose={() => {
              setUserAction(null);
              setSelectedUser(null);
            }}
          />
        )}
      </div>
    );
  }
}

export default AdminDashboard;
