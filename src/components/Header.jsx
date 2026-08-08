import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, Home, Upload, Grid3x3, Menu, X, Sparkles, User, LogOut, Shield, Crown } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ADMIN_SECTION_PERMISSIONS, BOARD_SECTION_PERMISSIONS } from '../utils/permissions';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, isAdmin, isRoot, isLoading, canAny } = useAuth();

  /**
   * Where the shield goes.
   *
   * A BOARD_EDITOR holds no media permission, so `isAdmin()` is false for them
   * and they used to get no link at all — while /admin/board, the page they
   * exist to use, sat one URL away. Sending them to /admin instead would be
   * worse: PermissionRoute refuses it. So the destination follows the
   * permissions, and the link disappears only when neither section is reachable.
   */
  const adminLink = canAny(ADMIN_SECTION_PERMISSIONS)
    ? { href: '/admin', label: 'Admin', mobileLabel: 'Admin Dashboard' }
    : canAny(BOARD_SECTION_PERMISSIONS)
    ? { href: '/admin/board', label: 'Boards', mobileLabel: 'Board Management' }
    : null;

  /**
   * How the account presents itself in the profile block.
   *
   * ROOT gets its own tier rather than sharing the admin badge. It is the one
   * account that can grant roles, and an operator glancing at the header should
   * be able to tell they are signed in as it — the same treatment as a media
   * moderator invites exactly the "I thought I was on my normal account" mistake.
   *
   * Purely cosmetic; nothing here gates anything.
   */
  const identity = isRoot()
    ? {
        badge: 'ROOT',
        Icon: Crown,
        gradient: 'from-red-600 to-orange-500',
        tint: 'bg-red-50 hover:bg-red-100',
      }
    : isAdmin()
    ? {
        badge: 'Admin',
        Icon: Shield,
        gradient: 'from-purple-600 to-blue-600',
        tint: 'bg-purple-50 hover:bg-purple-100',
      }
    : {
        badge: null,
        Icon: User,
        gradient: 'from-blue-600 to-green-600',
        tint: 'bg-blue-50 hover:bg-blue-100',
      };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, navigate to home
      navigate('/');
    } finally {
      setIsMobileMenuOpen(false);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Upload', href: '/upload', icon: Upload },
    { name: 'Gallery', href: '/gallery', icon: Grid3x3 },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-18 relative">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl blur-sm opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-xl">
                  <img src="/lensbridge-logo.svg" alt="LensBridge" className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text">
                  LensBridge
                </span>
                <span className="text-xs text-gray-500 -mt-1">2027</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation - Absolutely Centered */}
          <nav className="hidden md:flex items-center justify-center space-x-2 absolute left-1/2 transform -translate-x-1/2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group relative flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive(item.href) ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'}`} />
                  <span>{item.name}</span>
                  {isActive(item.href) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl animate-pulse opacity-20"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Spacer to push CTA to right */}
          <div className="flex-1"></div>

          {/* CTA Button - Right side */}
          <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
            {user ? (
              <>
                {/* Admin link, pointed at whichever console section is reachable */}
                {adminLink && (
                  <Link
                    to={adminLink.href}
                    className={`group relative flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(adminLink.href)
                        ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-red-600 hover:bg-red-50 border border-red-200'
                    }`}
                    title={adminLink.mobileLabel}
                  >
                    <Shield className={`h-4 w-4 ${isActive(adminLink.href) ? 'text-white' : 'text-red-500'}`} />
                    <span className="text-xs">{adminLink.label}</span>
                    {isActive(adminLink.href) && (
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl animate-pulse opacity-20"></div>
                    )}
                  </Link>
                )}
                
                {/* User Info */}
                <div className="flex items-center space-x-3">
                  <Link
                    to="/profile"
                    className="text-right hover:bg-blue-50 p-2 rounded-lg transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                      {identity.badge && (
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r ${identity.gradient} text-white`}>
                          {identity.badge}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </Link>
                  <Link to="/profile" className="relative">
                    <div className={`absolute inset-0 bg-gradient-to-r ${identity.gradient} rounded-full blur-sm opacity-20`}></div>
                    <div className={`relative bg-gradient-to-r ${identity.gradient} p-2 rounded-full hover:scale-105 transition-transform`}>
                      <identity.Icon className="h-5 w-5 text-white" />
                    </div>
                  </Link>
                </div>
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="group inline-flex items-center space-x-2 text-gray-600 hover:text-red-600 px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                {isLoading ? (
                  <div
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-500 cursor-wait select-none"
                    aria-live="polite"
                    aria-busy="true"
                    title="Validating session..."
                  >
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="tracking-wide">Signing in...</span>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="group inline-flex items-center space-x-2 text-gray-600 hover:text-blue-600 px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:bg-blue-50"
                  >
                    <User className="h-4 w-4" />
                    <span>Sign In</span>
                  </Link>
                )}
                <Link
                  to="/upload"
                  className={`group inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${isLoading && !user ? 'opacity-70' : ''}`}
                  aria-disabled={isLoading && !user}
                >
                  <Sparkles className="h-4 w-4 group-hover:animate-spin" />
                  <span>Share Now</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center ml-auto">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-gray-600" />
              ) : (
                <Menu className="h-6 w-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-lg'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive(item.href) ? 'text-white' : 'text-gray-500'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {user && adminLink && (
                <Link
                  to={adminLink.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(adminLink.href)
                      ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-red-600 hover:bg-red-50 border border-red-200'
                  }`}
                >
                  <Shield className={`h-5 w-5 ${isActive(adminLink.href) ? 'text-white' : 'text-red-500'}`} />
                  <span>{adminLink.mobileLabel}</span>
                </Link>
              )}
              
              {user ? (
                <>
                  {/* User Info in Mobile */}
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 ${identity.tint} rounded-xl transition-colors`}
                  >
                    <div className="relative">
                      <div className={`absolute inset-0 bg-gradient-to-r ${identity.gradient} rounded-full blur-sm opacity-20`}></div>
                      <div className={`relative bg-gradient-to-r ${identity.gradient} p-2 rounded-full`}>
                        <identity.Icon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                        {identity.badge && (
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gradient-to-r ${identity.gradient} text-white`}>
                            {identity.badge}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <p className="text-xs text-blue-600 font-medium">View Profile</p>
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                  >
                    <LogOut className="h-5 w-5 text-gray-500" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  {isLoading ? (
                    <div
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium bg-gray-100 text-gray-500 cursor-wait select-none"
                      aria-live="polite"
                      aria-busy="true"
                      title="Validating session..."
                    >
                      <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span>Singing in...</span>
                    </div>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                    >
                      <User className="h-5 w-5 text-gray-500" />
                      <span>Sign In</span>
                    </Link>
                  )}
                  <Link
                    to="/upload"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-3 rounded-xl font-semibold shadow-lg mt-4 ${isLoading && !user ? 'opacity-70' : ''}`}
                    aria-disabled={isLoading && !user}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Share Now</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
