import { Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

function AdminRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const userInfo = localStorage.getItem('user');
      
      if (token && userInfo) {
        try {
          const user = JSON.parse(userInfo);
          setIsAuthenticated(true);
          
          // Check if user has ROLE_ADMIN
          const hasAdminRole = user.authorities?.some(auth => auth.authority === 'ROLE_ADMIN') ||
                               user.roles?.some(role => role === 'ROLE_ADMIN') ||
                               user.role === 'ROLE_ADMIN';
          
          setIsAdmin(hasAdminRole);
        } catch (error) {
          console.error('Error parsing user info:', error);
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin privileges...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with the current location as state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    // Show access denied for non-admin users
    return (
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-full p-8 w-fit mx-auto mb-6">
            <Shield className="h-16 w-16 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have the required administrator privileges to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default AdminRoute;
