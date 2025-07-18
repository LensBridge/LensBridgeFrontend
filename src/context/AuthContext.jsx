import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userInfo = localStorage.getItem('user');
      
      if (token && userInfo) {
        try {
          setUser(JSON.parse(userInfo));
        } catch (error) {
          console.error('Error parsing user info:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (when user logs in/out in another tab)
    window.addEventListener('storage', checkAuth);
    
    // Listen for custom auth changes (when user logs in/out in same tab)
    window.addEventListener('auth-change', checkAuth);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('auth-change', checkAuth);
    };
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    // Trigger a custom event to update auth state immediately
    window.dispatchEvent(new Event('auth-change'));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenType');
    localStorage.removeItem('user');
    setUser(null);
    
    // Trigger a custom event to update auth state immediately
    window.dispatchEvent(new Event('auth-change'));
  };

  const isAdmin = (user) => {
    return user && (
      (user.authorities && user.authorities.some(auth => auth.authority === 'ROLE_ADMIN')) ||
      (user.roles && user.roles.some(role => role === 'ROLE_ADMIN' || role === 'ADMIN')) ||
      user.role === 'ROLE_ADMIN'
    );
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAdmin: () => isAdmin(user)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
