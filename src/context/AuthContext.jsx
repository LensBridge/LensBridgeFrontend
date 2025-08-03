import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AuthService from '../services/AuthService.js';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        isLoading: false,
        error: null,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
  });

  // Memoize the auth change handler to prevent infinite re-renders
  const handleAuthChange = useCallback(() => {
    const user = AuthService.getCurrentUser();
    const isLoggedIn = AuthService.isLoggedIn();
    
    // Only dispatch if the auth state has actually changed to prevent loops
    const shouldBeAuthenticated = user && isLoggedIn;
    
    if (shouldBeAuthenticated && !state.isAuthenticated) {
      // User should be authenticated but isn't in state
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { user } 
      });
    } else if (!shouldBeAuthenticated && state.isAuthenticated) {
      // User should not be authenticated but is in state
      dispatch({ type: 'LOGOUT' });
    }
    // If state matches expected state, do nothing to prevent loops
  }, [state.isAuthenticated]);

  // Initialize authentication when app starts
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (!isMounted) return;
      
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        const result = await AuthService.initializeAuth();
        
        if (!isMounted) return;
        
        if (result.success && result.user) {
          dispatch({ 
            type: 'LOGIN_SUCCESS', 
            payload: { user: result.user } 
          });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        if (!isMounted) return;
        
        console.error('Auth initialization error:', error);
        dispatch({ 
          type: 'AUTH_ERROR', 
          payload: 'Failed to initialize authentication' 
        });
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Separate useEffect for event listeners
  useEffect(() => {
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [handleAuthChange]);

  // Login function
  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });
    
    try {
      const result = await AuthService.login(email, password);
      
      if (result.success) {
        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { user: result.user } 
        });
        return result;
      } else {
        dispatch({ 
          type: 'AUTH_ERROR', 
          payload: result.error 
        });
        return result;
      }
    } catch (error) {
      const errorMessage = 'Login failed. Please try again.';
      dispatch({ 
        type: 'AUTH_ERROR', 
        payload: errorMessage 
      });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await AuthService.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout API call fails, clear local auth
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Logout from all devices
  const logoutAllDevices = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await AuthService.logoutAllDevices();
      dispatch({ type: 'LOGOUT' });
      return { success: true };
    } catch (error) {
      console.error('Logout all devices error:', error);
      // Even if API call fails, clear local auth
      dispatch({ type: 'LOGOUT' });
      throw error;
    }
  };

  // Check if current user is admin
  const isAdmin = useCallback(() => {
    return AuthService.isAdmin(state.user);
  }, [state.user]);

  // Clear any auth errors
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Make authenticated requests
  const makeAuthenticatedRequest = useCallback(async (url, options = {}) => {
    return await AuthService.makeRequest(url, options);
  }, []);

  const value = {
    ...state,
    login,
    logout,
    logoutAllDevices,
    isAdmin,
    clearError,
    makeAuthenticatedRequest,
    // Helper methods
    getCurrentUser: () => state.user,
    getAccessToken: () => AuthService.getAccessToken(),
    getRefreshToken: () => AuthService.getRefreshToken(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
