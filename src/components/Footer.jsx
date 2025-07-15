import { Heart, Github, Code, ExternalLink } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-12 mt-auto border-t border-gray-700">
      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand Section */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start space-x-3 mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl blur-sm opacity-30"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-xl">
                  <img src="/lensbridge-logo.svg" alt="LensBridge" className="h-6 w-6 text-white" />
                </div>
              </div>
              <span className="text-xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text">
                LensBridge
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto md:mx-0">
              Share your UTM MSA memories and connect with the community through photos and videos.
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center">
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <div className="space-y-2">
              <a href="/" className="block text-gray-400 hover:text-blue-400 transition-colors text-sm">
                Home
              </a>
              <a href="/gallery" className="block text-gray-400 hover:text-blue-400 transition-colors text-sm">
                Gallery
              </a>
              <a href="/upload" className="block text-gray-400 hover:text-blue-400 transition-colors text-sm">
                Upload
              </a>
              <a href="/privacy-policy" className="block text-gray-400 hover:text-blue-400 transition-colors text-sm">
                Privacy Policy
              </a>
              <a href="/terms-of-service" className="block text-gray-400 hover:text-blue-400 transition-colors text-sm">
                Terms of Service
              </a>
            </div>
          </div>

          {/* Open Source & Contact */}
          <div className="text-center md:text-right">
            <h3 className="text-white font-semibold mb-4">Open Source</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-center md:justify-end space-x-2">
                <Code className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-300">MIT Licensed</span>
              </div>
              <a
                href="https://github.com/lensbridge/lensbridgefrontend"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
              >
                <Github className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="text-sm">View on GitHub</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
              <div className="text-sm text-gray-400">
                <a 
                  href={`mailto:${import.meta.env.VITE_CONTACT_EMAIL || 'support@lensbridge.tech'}`}
                  className="hover:text-blue-400 transition-colors"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            {/* Made with Love */}
            <div className="flex items-center space-x-2 text-gray-400">
              <span className="text-sm">Made with</span>
              <Heart className="h-4 w-4 text-red-500 fill-current animate-pulse" />
              <span className="text-sm">for UTM MSA by</span>
              <span className="text-sm font-medium text-transparent bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text">
                IbraSoft
              </span>
            </div>

            {/* Copyright */}
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} LensBridge. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
