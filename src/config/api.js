// API Configuration
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  ENDPOINTS: {
    GALLERY: '/api/gallery',
    EVENTS: '/api/events',
    UPLOAD: '/api/upload',
    // Auth endpoints
    AUTH: {
      SIGNIN: '/api/auth/signin',
      REFRESH_TOKEN: '/api/auth/refresh-token',
      VALIDATE_TOKEN: '/api/auth/validate-token',
      LOGOUT: '/api/auth/logout',
      LOGOUT_ALL_DEVICES: '/api/auth/logout-all-devices',
      SIGNUP: '/api/auth/signup',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
      CONFIRM_EMAIL: '/api/auth/confirm-email',
      VALIDATE_RESET_TOKEN: '/api/auth/validate-reset-token'
    },
    // Admin endpoints
    ADMIN: {
      UPLOADS: '/api/admin/uploads',
      UPLOAD_APPROVE: '/api/admin/upload',
      UPLOAD_FEATURE: '/api/admin/feature-upload',
      UPLOAD_DELETE: '/api/admin/upload',
      UPLOAD_REMOVE_APPROVAL: '/api/admin/upload',
      UPLOAD_REMOVE_FEATURED: '/api/admin/upload',
      EVENTS: '/api/admin/events',
      CREATE_EVENT: '/api/admin/create-event',
      USERS: '/api/admin/users',
      USER_CREATE: '/api/admin/user/create',
      USER_ADD_ROLE: '/api/admin/user',
      USER_REMOVE_ROLE: '/api/admin/user',
      USER_VERIFY: '/api/admin/user/verify',
      ROLES: '/api/admin/roles',
      AUDIT: '/api/admin/audit',
      AUDIT_FAILED: '/api/admin/audit/failed',
      AUDIT_UPLOAD: '/api/admin/audit/upload',
      AUDIT_ACTION: '/api/admin/audit/action',
      AUDIT_DATERANGE: '/api/admin/audit/daterange',
      AUDIT_ACTIONS: '/api/admin/audit/actions'
    }
  },
  HEADERS: {
    'ngrok-skip-browser-warning': 'true'
  }
};

export default API_CONFIG;
