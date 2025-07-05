import { Link, useLocation } from 'react-router-dom';
import { Camera, Home, Upload, Grid3x3, Menu, X, Sparkles } from 'lucide-react';
import { useState } from 'react';

function Header() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
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
              <span className="text-xs text-gray-500 -mt-1">UTM MSA</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
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

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/upload"
              className="group inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <Sparkles className="h-4 w-4 group-hover:animate-spin" />
              <span>Share Now</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-gray-600" />
            ) : (
              <Menu className="h-6 w-6 text-gray-600" />
            )}
          </button>
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
              <Link
                to="/upload"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-3 rounded-xl font-semibold shadow-lg mt-4"
              >
                <Sparkles className="h-4 w-4" />
                <span>Share Now</span>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
