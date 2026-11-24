import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Camera, CheckCircle, ArrowLeft } from 'lucide-react';
import { api } from '../api/client';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setErrorMessage('');

    // Validate email for UofT domain
    if (value && !value.endsWith('@mail.utoronto.ca') && !value.endsWith('@utoronto.ca')) {
      setEmailError('Please use a valid University of Toronto email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for email validation errors
    if (emailError || !email) {
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const { error } = await api.POST('/api/auth/forgot-password', {
        params: { query: { email } }
      });

      if (!error) {
        setIsSuccess(true);
      } else {
        setErrorMessage(error.message || 'Failed to send reset email. Please try again.');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl blur-sm opacity-20"></div>
                <div className="relative bg-gradient-to-r from-green-600 to-blue-600 p-4 rounded-2xl">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text">
              LensBridge
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">Password Reset</p>
          </div>

          {/* Success Content */}
          <div className="bg-white dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-600 rounded-full blur-sm opacity-20"></div>
                <div className="relative bg-gradient-to-r from-green-600 to-blue-600 p-4 rounded-full">
                  <CheckCircle className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Check Your Email!
            </h2>

            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
              We've sent a password reset link to your UofT email address. Please check your inbox and follow the instructions to reset your password.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-6">
              <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                Reset email sent to:
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-sm">{email}</p>
            </div>

            <div className="space-y-3">
              <Link
                to="/login"
                className="group inline-flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg dark:shadow-xl dark:shadow-black/20 hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <span>Back to Sign In</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <button
                onClick={() => {
                  setIsSuccess(false);
                  setEmail('');
                }}
                className="block w-full text-gray-500 dark:text-gray-400 hover:text-gray-600 font-medium text-sm"
              >
                Send another reset email
              </button>
            </div>
          </div>

          {/* Help Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Didn't receive the email? Check your spam folder or{' '}
              <a 
                href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || 'support@lensbridge.tech'}`}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-500 font-medium"
              >
                contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            Forgot Password?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">No worries, we'll send you reset instructions</p>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-white dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20 border border-gray-200 dark:border-gray-700 p-8">
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    emailError 
                      ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent'
                  }`}
                  placeholder="Enter your UofT email"
                />
              </div>
              {emailError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {emailError}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter the email address associated with your LensBridge account
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || emailError || !email}
              className="group w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg dark:shadow-xl dark:shadow-black/20 hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Mail className="h-5 w-5" />
                  <span>Send Reset Email</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <Link 
              to="/login"
              className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>

        {/* MSA Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Exclusive platform for UTM MSA students
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
