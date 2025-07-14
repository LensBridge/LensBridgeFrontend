import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Database, Lock, UserCheck, AlertCircle } from 'lucide-react';

function PrivacyPolicy() {
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
              <Eye className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text">
                Privacy Policy
              </h1>
              <p className="text-gray-600">LensBridge - UTM MSA Media Platform</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8 space-y-8">
          
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              1. Introduction
            </h2>
            <p className="text-gray-600 leading-relaxed">
              The University of Toronto Mississauga Muslim Students Association (UTM MSA) respects your privacy and is 
              committed to protecting your personal information. This privacy policy explains how we collect, use, and 
              safeguard your information when you use LensBridge, our exclusive media sharing platform for MSA members.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Database className="h-5 w-5 mr-2 text-blue-600" />
              2. Information We Collect
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Personal Information:</h3>
                <ul className="text-gray-600 leading-relaxed space-y-1 ml-4">
                  <li>• Full name (first and last name)</li>
                  <li>• University of Toronto email address</li>
                  <li>• Phone number</li>
                  <li>• Student number</li>
                  <li>• Account password (encrypted)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-2">Content Information:</h3>
                <ul className="text-gray-600 leading-relaxed space-y-1 ml-4">
                  <li>• Photos and videos you upload</li>
                  <li>• Metadata associated with your uploads (date, time, file information)</li>
                  <li>• Captions and descriptions you provide</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-2">Technical Information:</h3>
                <ul className="text-gray-600 leading-relaxed space-y-1 ml-4">
                  <li>• IP address and device information</li>
                  <li>• Browser type and version</li>
                  <li>• Usage patterns and platform interactions</li>
                  <li>• Login times and frequency</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">3. How We Use Your Information</h2>
            <ul className="text-gray-600 leading-relaxed space-y-2">
              <li>• <strong>Account Management:</strong> Create and maintain your user account</li>
              <li>• <strong>Content Sharing:</strong> Enable you to upload and share media content</li>
              <li>• <strong>MSA Promotion:</strong> Feature your content on official MSA social media and materials</li>
              <li>• <strong>Communication:</strong> Send important updates about the platform or MSA events</li>
              <li>• <strong>Security:</strong> Protect against unauthorized access and maintain platform security</li>
              <li>• <strong>Analytics:</strong> Understand platform usage to improve user experience</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
              4. How We Share Your Information
            </h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-gray-700 leading-relaxed font-medium">
                We do not sell, trade, or rent your personal information to third parties.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-800">We may share information in these limited circumstances:</h3>
              <ul className="text-gray-600 leading-relaxed space-y-2 ml-4">
                <li>• <strong>MSA Social Media:</strong> Your uploaded content may be featured on official UTM MSA Instagram, Facebook, and other social media accounts</li>
                <li>• <strong>MSA Executive Team:</strong> Authorized MSA executives may access content for promotional purposes</li>
                <li>• <strong>University Compliance:</strong> If required by University of Toronto policies or legal obligations</li>
                <li>• <strong>Safety Concerns:</strong> If necessary to protect the safety of users or the community</li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Lock className="h-5 w-5 mr-2 text-blue-600" />
              5. Data Security
            </h2>
            <div className="space-y-4">
              <p className="text-gray-600 leading-relaxed">
                We implement appropriate security measures to protect your personal information:
              </p>
              <ul className="text-gray-600 leading-relaxed space-y-2 ml-4">
                <li>• Encrypted password storage</li>
                <li>• Secure HTTPS connections</li>
                <li>• Regular security updates and monitoring</li>
                <li>• Limited access to authorized personnel only</li>
                <li>• Secure cloud storage with reputable providers</li>
              </ul>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Your Privacy Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-4">You have the right to:</p>
            <ul className="text-gray-600 leading-relaxed space-y-2 ml-4">
              <li>• <strong>Access:</strong> Request a copy of the personal information we have about you</li>
              <li>• <strong>Correct:</strong> Ask us to correct any inaccurate information</li>
              <li>• <strong>Delete:</strong> Request deletion of your account and associated data</li>
              <li>• <strong>Withdraw Consent:</strong> Remove permission for MSA to use your content</li>
              <li>• <strong>Data Portability:</strong> Request your data in a portable format</li>
            </ul>
          </section>

          {/* Retention */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Data Retention</h2>
            <ul className="text-gray-600 leading-relaxed space-y-2">
              <li>• <strong>Account Data:</strong> Retained while your account is active</li>
              <li>• <strong>Uploaded Content:</strong> Stored until you delete it or close your account</li>
              <li>• <strong>Featured Content:</strong> May remain on MSA social media even after account deletion</li>
              <li>• <strong>Inactive Accounts:</strong> Deleted after 2 years of inactivity</li>
              <li>• <strong>Graduated Students:</strong> Data deleted 6 months after graduation</li>
            </ul>
          </section>

          {/* Cookies and Tracking */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Cookies and Tracking</h2>
            <p className="text-gray-600 leading-relaxed">
              LensBridge uses essential cookies to maintain your login session and provide core functionality. 
              We do not use tracking cookies for advertising purposes. You can manage cookie settings in your browser, 
              though disabling cookies may affect platform functionality.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Third-Party Services</h2>
            <div className="space-y-4">
              <p className="text-gray-600 leading-relaxed">
                LensBridge may use third-party services for:
              </p>
              <ul className="text-gray-600 leading-relaxed space-y-1 ml-4">
                <li>• Cloud storage (secure file hosting)</li>
                <li>• Analytics (anonymized usage data)</li>
                <li>• Email services (platform notifications)</li>
              </ul>
              <p className="text-gray-600 leading-relaxed">
                These services operate under their own privacy policies and are carefully selected for their security standards.
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-amber-600" />
              10. Age Requirements
            </h2>
            <p className="text-gray-600 leading-relaxed">
              LensBridge is intended for university students who are typically 18 years or older. Users under 18 must 
              have parental consent to use the platform. We do not knowingly collect personal information from children 
              under 13 years of age.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this privacy policy periodically to reflect changes in our practices or legal requirements. 
              Users will be notified of significant changes via email or platform announcements. The "Last updated" date 
              at the top of this policy indicates when it was last revised.
            </p>
          </section>

          {/* Contact Information */}
          <section className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">12. Contact Us</h2>
            <div className="space-y-2">
              <p className="text-gray-600 leading-relaxed">
                If you have questions about this privacy policy or want to exercise your privacy rights, please contact:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  <strong>UTM MSA Executive Team</strong><br />
                  Email: <a href="mailto:msa@utoronto.ca" className="text-blue-600 hover:text-blue-500">msa@utoronto.ca</a><br />
                  Subject Line: "LensBridge Privacy Inquiry"
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex justify-center space-x-6">
          <Link 
            to="/terms-of-service" 
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Terms of Service
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

export default PrivacyPolicy;
