import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Camera, Loader2, ArrowRight } from 'lucide-react';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setErrorMessage('Invalid reset link. No token provided.');
      setIsValidating(false);
      return;
    }

    validateToken(token);
  }, [token]);

  const validateToken = async (resetToken) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${apiBaseUrl}/api/auth/validate-reset-token?token=${encodeURIComponent(resetToken)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (response.ok) {
        setTokenValid(true);
      } else {
        const data = await response.json();
        const errorMsg = data.message || data.error || 'Invalid or expired reset token.';
        setTokenValid(false);
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenValid(false);
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Password validation
    if (name === 'password') {
      if (value.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
      } else {
        setPasswordError('');
      }
    }

    // Clear password error when confirm password changes
    if (name === 'confirmPassword' && passwordError) {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      const response = await fetch(`${apiBaseUrl}/api/auth/reset-password?token=${encodeURIComponent(token)}&newPassword=${encodeURIComponent(formData.password)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Password reset successfully! Please sign in with your new password.',
              confirmed: true 
            }
          });
        }, 3000);
      } else {
        const errorMsg = data.message || data.error || 'Failed to reset password. Please try again.';
        setErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    if (isSuccess) return 'from-green-600 to-blue-600';
    if (!tokenValid) return 'from-red-600 to-orange-600';
    return 'from-blue-600 to-green-600';
  };

  const renderStatusIcon = () => {
    if (isValidating) {
      return <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />;
    }
    if (isSuccess) {
      return <CheckCircle className="h-16 w-16 text-green-600" />;
    }
    if (!tokenValid) {
      return <XCircle className="h-16 w-16 text-red-600" />;
    }
    return <Lock className="h-16 w-16 text-blue-600" />;
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="flex justify-center mb-6">
              <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Validating Reset Link...
            </h2>
            <p className="text-gray-600 text-sm">
              Please wait while we verify your password reset token.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className={`absolute inset-0 bg-gradient-to-r ${getStatusColor()} rounded-2xl blur-sm opacity-20`}></div>
                <div className={`relative bg-gradient-to-r ${getStatusColor()} p-4 rounded-2xl`}>
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h1 className={`text-3xl font-bold text-transparent bg-gradient-to-r ${getStatusColor()} bg-clip-text`}>
              LensBridge
            </h1>
            <p className="text-gray-600 text-sm mt-2">Password Reset</p>
          </div>

          {/* Success Content */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="flex justify-center mb-6">
              {renderStatusIcon()}
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Password Reset Successfully!
            </h2>

            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              Your password has been updated. You can now sign in to your LensBridge account with your new password.
            </p>

            <div className="space-y-3">
              <Link
                to="/login"
                className="group inline-flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className={`absolute inset-0 bg-gradient-to-r ${getStatusColor()} rounded-2xl blur-sm opacity-20`}></div>
                <div className={`relative bg-gradient-to-r ${getStatusColor()} p-4 rounded-2xl`}>
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h1 className={`text-3xl font-bold text-transparent bg-gradient-to-r ${getStatusColor()} bg-clip-text`}>
              LensBridge
            </h1>
            <p className="text-gray-600 text-sm mt-2">Password Reset</p>
          </div>

          {/* Error Content */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
            <div className="flex justify-center mb-6">
              {renderStatusIcon()}
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Invalid Reset Link
            </h2>

            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              {errorMessage}
            </p>

            <div className="space-y-3">
              <Link
                to="/forgot-password"
                className="group inline-flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <span>Request New Reset Link</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/login"
                className="block text-blue-600 hover:text-blue-500 font-medium text-sm"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="flex-1 flex items-center justify-center py-4 px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl blur-sm opacity-20"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-green-600 p-4 rounded-2xl">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text">
            Reset Your Password
          </h2>
          <p className="text-gray-600 mt-2">Enter your new password below</p>
        </div>

        {/* Reset Password Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    passwordError 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                  }`}
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    passwordError 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
                  }`}
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {passwordError}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters long
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || passwordError || !formData.password || !formData.confirmPassword}
              className="group w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  <span>Reset Password</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link 
              to="/login"
              className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              Remember your password? Sign in
            </Link>
          </div>
        </div>

        {/* MSA Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Exclusive platform for UTM MSA students
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
