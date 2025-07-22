import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Camera, Loader2, ArrowRight } from 'lucide-react';
import API_CONFIG from '../config/api';

function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error', 'expired'
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid confirmation link. No token provided.');
      return;
    }

    confirmEmail(token);
  }, [token]);

  const confirmEmail = async (confirmationToken) => {
    try {
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ token: confirmationToken })
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      // Try to parse response as JSON, but handle cases where it might not be JSON
      let data;
      try {
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        // Try to parse as JSON if response has content
        if (responseText.trim()) {
          data = JSON.parse(responseText);
        } else {
          data = {};
        }
      } catch (parseError) {
        console.log('Response is not JSON, treating as plain text');
        data = { message: await response.text() };
      }

      if (response.ok) {
        setStatus('success');
        setMessage('Your email has been successfully confirmed! You can now sign in to your account.');
        setUserEmail(data.email || '');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Email confirmed successfully! Please sign in.',
              confirmed: true 
            }
          });
        }, 3000);
      } else {
        const errorMessage = data.message || data.error || 'Failed to confirm email. Please try again later.';
        
        if (response.status === 400 && errorMessage.toLowerCase().includes('expired')) {
          setStatus('expired');
          setMessage('This confirmation link has expired. Please request a new confirmation email.');
        } else if (response.status === 400 && errorMessage.toLowerCase().includes('already confirmed')) {
          setStatus('success');
          setMessage('Your email is already confirmed! You can sign in to your account.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(errorMessage);
        }
      }
    } catch (error) {
      console.error('Email confirmation error:', error);
      setStatus('error');
      setMessage('Network error. Please check your connection and try again.');
    }
  };

  const resendConfirmation = async () => {
    try {
      setStatus('loading');
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/resend-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (response.ok) {
        setStatus('success');
        setMessage('A new confirmation email has been sent. Please check your inbox.');
      } else {
        setStatus('error');
        setMessage('Failed to resend confirmation email. Please try again later.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again later.');
    }
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-600" />;
      case 'error':
      case 'expired':
        return <XCircle className="h-16 w-16 text-red-600" />;
      default:
        return <Camera className="h-16 w-16 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'from-green-600 to-blue-600';
      case 'error':
      case 'expired':
        return 'from-red-600 to-orange-600';
      default:
        return 'from-blue-600 to-green-600';
    }
  };

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
          <p className="text-gray-600 text-sm mt-2">Email Confirmation</p>
        </div>

        {/* Status Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex justify-center mb-6">
            {renderStatusIcon()}
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {status === 'loading' && 'Confirming Your Email...'}
            {status === 'success' && 'Email Confirmed!'}
            {status === 'error' && 'Confirmation Failed'}
            {status === 'expired' && 'Link Expired'}
          </h2>

          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            {status === 'success' && (
              <Link
                to="/login"
                className="group inline-flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}

            {status === 'expired' && (
              <button
                onClick={resendConfirmation}
                className="group inline-flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <span>Resend Confirmation Email</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {status === 'error' && (
              <div className="space-y-2">
                <Link
                  to="/signup"
                  className="group inline-flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <span>Try Signing Up Again</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/login"
                  className="block text-blue-600 hover:text-blue-500 font-medium text-sm"
                >
                  Or go to Sign In
                </Link>
              </div>
            )}

            <Link
              to="/"
              className="block text-gray-500 hover:text-gray-600 font-medium text-sm mt-4"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Support Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Need help?{' '}
            <a 
              href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || 'support@lensbridge.tech'}`}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConfirmEmail;
