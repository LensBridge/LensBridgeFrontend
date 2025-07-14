import { useLocation, Link } from 'react-router-dom';
import { Mail, Camera, ArrowRight } from 'lucide-react';

function SignupSuccess() {
  const location = useLocation();
  const { email, message } = location.state || {};

  return (
    <div className="flex-1 flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full text-center">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl blur-sm opacity-20"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-green-600 p-4 rounded-2xl">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text">
            LensBridge
          </h1>
          <p className="text-gray-600 text-sm mt-2">Account Created</p>
        </div>

        {/* Success Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-600 rounded-full blur-sm opacity-20"></div>
              <div className="relative bg-gradient-to-r from-green-600 to-blue-600 p-4 rounded-full">
                <Mail className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Check Your Email!
          </h2>

          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            {message || 'We\'ve sent a confirmation email to your UofT email address. Please click the link in the email to activate your account.'}
          </p>

          {email && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <p className="text-blue-800 text-sm font-medium">
                Confirmation sent to:
              </p>
              <p className="text-blue-600 text-sm">{email}</p>
            </div>
          )}

          <div className="space-y-3">
            <Link
              to="/login"
              className="group inline-flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 px-6 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to="/"
              className="block text-gray-500 hover:text-gray-600 font-medium text-sm"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Help Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Didn't receive the email? Check your spam folder or{' '}
            <a 
              href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || 'support@lensbridge.tech'}`}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupSuccess;
