import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Users, Camera, AlertTriangle } from 'lucide-react';

function TermsOfService() {
  return (
    <div className="flex-1 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/signup" 
            className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign Up
          </Link>
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-green-600 p-3 rounded-2xl">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text">
                Terms of Service
              </h1>
              <p className="text-gray-600">LensBridge - UTM MSA Media Platform</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8 space-y-8">
          
          {/* Acceptance */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing and using LensBridge, you accept and agree to be bound by the terms and provision of this agreement. 
              LensBridge is exclusively available to current University of Toronto Mississauga (UTM) Muslim Students Association (MSA) members.
            </p>
          </section>

          {/* Eligibility */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Eligibility</h2>
            <ul className="text-gray-600 leading-relaxed space-y-2">
              <li>• You must be a current student at the University of Toronto Mississauga</li>
              <li>• You must be an active member of the UTM MSA</li>
              <li>• You must use a valid @mail.utoronto.ca or @utoronto.ca email address</li>
              <li>• You must be at least 18 years old or have parental consent</li>
            </ul>
          </section>

          {/* Content Guidelines */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2 text-blue-600" />
              3. Content Guidelines
            </h2>
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800">Acceptable Content:</h3>
              <ul className="text-gray-600 leading-relaxed space-y-1 ml-4">
                <li>• Photos and videos from UTM MSA events and activities</li>
                <li>• Content that promotes community, learning, and positive values</li>
                <li>• Media that respects Islamic principles and values</li>
                <li>• Original content or content you have permission to share</li>
              </ul>
              
              <h3 className="font-medium text-gray-800 mt-6">Prohibited Content:</h3>
              <ul className="text-gray-600 leading-relaxed space-y-1 ml-4">
                <li>• Inappropriate, offensive, or harmful material</li>
                <li>• Content that violates Islamic principles</li>
                <li>• Copyrighted material without permission</li>
                <li>• Personal information of others without consent</li>
                <li>• Spam, advertisements, or promotional content</li>
                <li>• Content that could harm the reputation of UTM MSA</li>
              </ul>
            </div>
          </section>

          {/* User Responsibilities */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">4. User Responsibilities</h2>
            <ul className="text-gray-600 leading-relaxed space-y-2">
              <li>• Respect the privacy and rights of all individuals in your content</li>
              <li>• Obtain consent from people appearing in your photos/videos</li>
              <li>• Accurately represent events and activities</li>
              <li>• Maintain the confidentiality of your account credentials</li>
              <li>• Report any misuse of the platform to administrators</li>
            </ul>
          </section>

          {/* Content Usage */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Content Usage Rights</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">
                By uploading content to LensBridge, you grant UTM MSA the right to use, display, and share your content 
                on official MSA social media accounts, websites, and promotional materials. You retain ownership of your content, 
                but allow MSA to feature it for community and marketing purposes.
              </p>
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              Your privacy is important to us. Please review our{' '}
              <Link to="/privacy-policy" className="text-blue-600 hover:text-blue-500 font-medium">
                Privacy Policy
              </Link>
              {' '}to understand how we collect, use, and protect your information.
            </p>
          </section>

          {/* Account Security */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Account Security</h2>
            <ul className="text-gray-600 leading-relaxed space-y-2">
              <li>• Keep your login credentials secure and confidential</li>
              <li>• Do not share your account with others</li>
              <li>• Report any unauthorized access immediately</li>
              <li>• Use a strong, unique password</li>
            </ul>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-amber-600" />
              8. Account Termination
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We reserve the right to suspend or terminate accounts that:
            </p>
            <ul className="text-gray-600 leading-relaxed space-y-1 ml-4">
              <li>• Violate these terms of service</li>
              <li>• Upload inappropriate or harmful content</li>
              <li>• Are no longer eligible (graduated, not MSA member, etc.)</li>
              <li>• Engage in abusive or harmful behavior</li>
            </ul>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Disclaimer</h2>
            <p className="text-gray-600 leading-relaxed">
              LensBridge is provided "as is" without warranties of any kind. UTM MSA is not responsible for any damages 
              or losses resulting from the use of this platform. Users are responsible for their own content and interactions.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">10. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update these terms from time to time. Users will be notified of significant changes via email 
              or platform announcements. Continued use of LensBridge constitutes acceptance of updated terms.
            </p>
          </section>

          {/* Contact */}
          <section className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Information</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions about these terms, please contact the UTM MSA executive team at{' '}
              <a href="mailto:msa@utoronto.ca" className="text-blue-600 hover:text-blue-500 font-medium">
                msa@utoronto.ca
              </a>
            </p>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex justify-center space-x-6">
          <Link 
            to="/privacy-policy" 
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Privacy Policy
          </Link>
          <Link 
            to="/signup" 
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService;
