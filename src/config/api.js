// API Configuration
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  ENDPOINTS: {
    GALLERY: '/api/gallery',
    EVENTS: '/api/events',
    UPLOAD: '/api/upload'
  }
};

export default API_CONFIG;
