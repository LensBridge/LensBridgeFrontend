import API_CONFIG from '../config/api.js';

class AuthService {
  constructor() {
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  // Process the queue of failed requests during token refresh
  processQueue(error, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  // Add request to queue during token refresh
  addToQueue() {
    return new Promise((resolve, reject) => {
      this.failedQueue.push({ resolve, reject });
    });
  }

  // Make authenticated requests with automatic token refresh
  async makeRequest(url, options = {}) {
    const accessToken = this.getAccessToken();
    
    // Initialize headers if not exists
    if (!options.headers) {
      options.headers = {};
    }
    
    // Add auth headers if token exists
    if (accessToken) {
      options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Add default headers only if not FormData (to preserve boundary for multipart uploads)
    if (!(options.body instanceof FormData)) {
      options.headers = {
        'Content-Type': 'application/json',
        ...API_CONFIG.HEADERS,
        ...options.headers, // Keep existing headers including auth
      };
    } else {
      // For FormData, only add API headers and keep existing headers (including auth)
      options.headers = {
        ...API_CONFIG.HEADERS,
        ...options.headers,
      };
    }

    try {
      const response = await fetch(url, options);
      
      // If 401 and we have a refresh token, try to refresh
      if (response.status === 401 && this.getRefreshToken()) {
        return await this.handleTokenRefresh(url, options);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Handle token refresh and retry original request
  async handleTokenRefresh(originalUrl, originalOptions) {
    // If already refreshing, add to queue
    if (this.isRefreshing) {
      try {
        await this.addToQueue();
        // Retry with new token
        const newToken = this.getAccessToken();
        if (!originalOptions.headers) {
          originalOptions.headers = {};
        }
        originalOptions.headers.Authorization = `Bearer ${newToken}`;
        return await fetch(originalUrl, originalOptions);
      } catch (error) {
        throw error;
      }
    }

    this.isRefreshing = true;

    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...API_CONFIG.HEADERS,
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Token refresh failed: ${response.status} ${errorData.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Update stored tokens - handle both response formats
      if (data.accessToken && data.refreshToken) {
        this.storeTokens(data.accessToken, data.refreshToken);
      } else if (data.token && data.refreshToken) {
        // Legacy format
        localStorage.setItem('accessToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('tokenType', data.type || 'Bearer');
      }
      
      // Process the queue with success
      this.processQueue(null, data.accessToken || data.token);
      
      // Ensure headers object exists before modifying
      if (!originalOptions.headers) {
        originalOptions.headers = {};
      }
      
      // Retry original request with new token
      originalOptions.headers.Authorization = `Bearer ${data.accessToken || data.token}`;
      return await fetch(originalUrl, originalOptions);
      
    } catch (error) {
      // Refresh failed - clear tokens and redirect to login
      this.processQueue(error, null);
      this.clearAuth();
      window.location.href = '/login';
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  // Validate current token with backend (direct call without refresh logic)
  async validateToken() {
    try {
      const accessToken = this.getAccessToken();
      if (!accessToken) {
        return null;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/validate-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...API_CONFIG.HEADERS,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          return {
            id: data.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            verified: data.verified,
            roles: data.roles || [],
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  // Validate token with automatic refresh (for use in components)
  async validateTokenWithRefresh() {
    try {
      const accessToken = this.getAccessToken();
      if (!accessToken) {
        return null;
      }

      const response = await this.makeRequest(`${API_CONFIG.BASE_URL}/api/auth/validate-token`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          return {
            id: data.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            verified: data.verified,
            roles: data.roles || [],
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Token validation with refresh error:', error);
      return null;
    }
  }

  // Login method
  async login(email, password) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...API_CONFIG.HEADERS,
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store tokens - handle both new and legacy formats
        if (data.accessToken && data.refreshToken) {
          this.storeTokens(data.accessToken, data.refreshToken);
        } else if (data.token && data.refreshToken) {
          // Legacy format: main token is 'token', but we still have refreshToken
          localStorage.setItem('accessToken', data.token);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('tokenType', data.type || 'Bearer');
        } else if (data.token) {
          // Fallback for old response format
          localStorage.setItem('accessToken', data.token);
          localStorage.setItem('tokenType', data.type || 'Bearer');
        }

        // Store user info
        const userInfo = {
          id: data.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          roles: data.roles || [],
        };
        
        localStorage.setItem('user', JSON.stringify(userInfo));
        
        // Trigger auth change event
        window.dispatchEvent(new Event('auth-change'));
        
        return { success: true, user: userInfo };
      } else {
        return { 
          success: false, 
          error: data.message || data.error || 'Login failed',
          status: response.status 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.' 
      };
    }
  }

  // Logout method
  async logout() {
    const refreshToken = this.getRefreshToken();
    
    try {
      // Call backend logout endpoint if refresh token exists
      if (refreshToken) {
        await fetch(`${API_CONFIG.BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...API_CONFIG.HEADERS,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      this.clearAuth();
    }
  }

  // Logout from all devices
  async logoutAllDevices() {
    try {
      const accessToken = this.getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/logout-all-devices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...API_CONFIG.HEADERS,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to logout from all devices');
      }

      this.clearAuth();
      return { success: true };
    } catch (error) {
      console.error('Logout all devices error:', error);
      this.clearAuth(); // Clear local auth even if API call fails
      throw error;
    }
  }

  // Store tokens securely
  storeTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('tokenType', 'Bearer');
  }

  // Clear all authentication data
  clearAuth() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('token'); // Legacy token key
    localStorage.removeItem('tokenType');
    localStorage.removeItem('user');
    
    // Trigger auth change event
    window.dispatchEvent(new Event('auth-change'));
  }

  // Get current user from storage
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing user info:', error);
      return null;
    }
  }

  // Get access token
  getAccessToken() {
    return localStorage.getItem('accessToken') || localStorage.getItem('token'); // Support legacy token key
  }

  // Get refresh token
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  // Check if user is logged in
  isLoggedIn() {
    return !!this.getAccessToken();
  }

  // Check if user has admin role
  isAdmin(user = null) {
    const currentUser = user || this.getCurrentUser();
    if (!currentUser) return false;
    
    return (
      (currentUser.authorities && currentUser.authorities.some(auth => auth.authority === 'ROLE_ADMIN')) ||
      (currentUser.roles && currentUser.roles.some(role => role === 'ROLE_ADMIN' || role === 'ADMIN')) ||
      currentUser.role === 'ROLE_ADMIN'
    );
  }

  // Initialize authentication on app start
  async initializeAuth() {
    try {
      // First try to validate existing token
      const user = await this.validateToken();
      
      if (user) {
        // Update user info in storage
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new Event('auth-change'));
        return { success: true, user };
      }

      // If validation failed, try refresh token
      const refreshToken = this.getRefreshToken();
      if (refreshToken) {
        try {
          const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/refresh-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...API_CONFIG.HEADERS,
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (response.ok) {
            const data = await response.json();
            
            // Handle both response formats
            if (data.accessToken && data.refreshToken) {
              this.storeTokens(data.accessToken, data.refreshToken);
            } else if (data.token && data.refreshToken) {
              localStorage.setItem('accessToken', data.token);
              localStorage.setItem('refreshToken', data.refreshToken);
              localStorage.setItem('tokenType', data.type || 'Bearer');
            }
            
            // Validate the new token
            const validatedUser = await this.validateToken();
            if (validatedUser) {
              localStorage.setItem('user', JSON.stringify(validatedUser));
              window.dispatchEvent(new Event('auth-change'));
              return { success: true, user: validatedUser };
            }
          }
        } catch (refreshError) {
          console.error('Token refresh during initialization failed:', refreshError);
        }
      }

      // Both validation and refresh failed - clear auth
      this.clearAuth();
      return { success: false, user: null };
      
    } catch (error) {
      console.error('Auth initialization error:', error);
      this.clearAuth();
      return { success: false, user: null };
    }
  }
}

// Export singleton instance
export default new AuthService();
