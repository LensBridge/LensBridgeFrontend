import { api, authenticatedFetch, BASE_URL } from '../api/client';
import {
  clearAuth,
  getAccessToken,
  getCurrentUser,
  getRefreshToken,
  isLoggedIn,
  notifyAuthChange,
  setCurrentUser,
  storeTokens,
  storeTokensFromResponse,
} from '../api/tokenStore';

/**
 * Session and identity for the app.
 *
 * HTTP now goes through the generated client in src/api/client.ts, which owns
 * access-token refresh. What remains here is the part OpenAPI has nothing to say
 * about: what a session looks like in localStorage, and what counts as an admin.
 *
 * The public surface is unchanged from the hand-written version, so callers were
 * not touched.
 */
class AuthService {
  /**
   * @deprecated Use `api` from src/api/client.ts -- same credentials and refresh,
   * but checked against the generated schema. Kept for call sites still on raw URLs.
   */
  async makeRequest(url, options = {}) {
    return authenticatedFetch(url, options);
  }

  /** Shape the stored user record from whichever endpoint produced it. */
  #toUserInfo(data) {
    return {
      id: data.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      verified: data.verified,
      roles: data.roles ?? [],
    };
  }

  async login(email, password) {
    try {
      const { data, error, response } = await api.POST('/api/auth/signin', {
        body: { email, password },
      });

      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Login failed',
          status: response?.status,
        };
      }

      storeTokensFromResponse(data);
      const user = this.#toUserInfo(data);
      setCurrentUser(user);
      return { success: true, user };
    } catch (err) {
      console.error('Login error:', err);
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }
  }

  async logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api.POST('/api/auth/logout', { body: { refreshToken } });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Local state is cleared even if the server call fails: the user asked to
      // be signed out, and a stale token here is worse than an orphaned one there.
      clearAuth();
    }
  }

  async logoutAllDevices() {
    try {
      if (!getAccessToken()) {
        throw new Error('No access token available');
      }
      const { error } = await api.POST('/api/auth/logout-all-devices', {});
      if (error) {
        throw new Error(error.message || 'Failed to logout from all devices');
      }
      clearAuth();
      return { success: true };
    } catch (error) {
      console.error('Logout all devices error:', error);
      clearAuth();
      throw error;
    }
  }

  /**
   * Validates the stored access token. Does NOT refresh on 401 -- initializeAuth
   * relies on this returning null so it can decide whether to attempt a refresh.
   */
  async validateToken() {
    const accessToken = getAccessToken();
    if (!accessToken) return null;

    try {
      const response = await fetch(`${BASE_URL}/api/auth/validate-token`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.valid ? this.#toUserInfo(data) : null;
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /** Same check, but routed through the client so an expired token is refreshed first. */
  async validateTokenWithRefresh() {
    if (!getAccessToken()) return null;
    try {
      const { data } = await api.GET('/api/auth/validate-token');
      return data?.valid ? this.#toUserInfo(data) : null;
    } catch (error) {
      console.error('Token validation with refresh error:', error);
      return null;
    }
  }

  storeTokens(accessToken, refreshToken) {
    storeTokens(accessToken, refreshToken);
  }

  clearAuth() {
    clearAuth();
  }

  getCurrentUser() {
    return getCurrentUser();
  }

  updateStoredUser(updatedUser) {
    setCurrentUser(updatedUser);
  }

  getAccessToken() {
    return getAccessToken();
  }

  getRefreshToken() {
    return getRefreshToken();
  }

  isLoggedIn() {
    return isLoggedIn();
  }

  isAdmin(user = null) {
    const currentUser = user || getCurrentUser();
    if (!currentUser) return false;

    const hasAuthority = (name) =>
      currentUser.authorities?.some((auth) => auth.authority === name);
    const hasRole = (...names) =>
      currentUser.roles?.some((role) => names.includes(role));

    return (
      hasAuthority('ROLE_ROOT') ||
      hasAuthority('ROLE_ADMIN') ||
      hasRole('ROLE_ROOT', 'ROOT', 'ROLE_ADMIN', 'ADMIN') ||
      currentUser.role === 'ROLE_ROOT' ||
      currentUser.role === 'ROLE_ADMIN'
    );
  }

  /**
   * Restores a session on app start: validate the access token, and if that
   * fails fall back to the refresh token before giving up.
   */
  async initializeAuth() {
    try {
      const user = await this.validateToken();
      if (user) {
        setCurrentUser(user);
        return { success: true, user };
      }

      if (getRefreshToken()) {
        try {
          const { data } = await api.POST('/api/auth/refresh-token', {
            body: { refreshToken: getRefreshToken() },
          });
          if (storeTokensFromResponse(data)) {
            const refreshedUser = await this.validateToken();
            if (refreshedUser) {
              setCurrentUser(refreshedUser);
              return { success: true, user: refreshedUser };
            }
          }
        } catch (refreshError) {
          console.error('Token refresh during initialization failed:', refreshError);
        }
      }

      clearAuth();
      return { success: false, user: null };
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearAuth();
      return { success: false, user: null };
    }
  }
}

export default new AuthService();
export { notifyAuthChange };
