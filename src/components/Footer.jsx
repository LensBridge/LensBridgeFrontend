import { Heart } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              LensBridge
            </span>
            <span className="text-gray-400">Powered By</span>
            <span className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
              IbraSoft
            </span>
          </div>
          <div className="flex items-center justify-center space-x-1 text-gray-400">
            <span>Made with</span>
            <Heart className="h-4 w-4 text-red-500 fill-current" />
            <span>for UTM MSA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
