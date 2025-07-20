import { Link } from 'react-router-dom';
import { Upload, Users, Star, Camera, ArrowRight, Sparkles, Heart, TrendingUp, ExternalLink, Zap, Shield } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// Animated Counter Component
function AnimatedCounter({ end, duration = 2000, suffix = "", prefix = "" }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime;
    const startCount = 0;
    
    const updateCount = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(easeOutQuart * end);
      
      setCount(currentCount);
      
      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };
    
    requestAnimationFrame(updateCount);
  }, [isVisible, end, duration]);

  return (
    <span ref={counterRef} className="tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

function Home() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-60"></div>
        <div className="relative text-center py-20 px-4">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
              <Sparkles className="h-4 w-4" />
              <span>Share Your MSA Moments</span>
            </div>
          </div>
          
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-green-600 p-6 rounded-full shadow-2xl">
                <img src="/lensbridge-logo.svg" alt="LensBridge" className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Welcome to{' '}
            <span className="text-transparent bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text">
              LensBridge
            </span>
          </h1>
          
          <p className="text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Connect, share, and celebrate UTM MSA events! Upload your amazing event photos and videos for a chance to be featured on our <a href="https://instagram.com/utmmsa" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Instagram</a> and <a href="https://facebook.com/utmmsa" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Facebook</a> stories.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/upload"
              className="group inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-green-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1"
            >
              <Upload className="h-6 w-6 group-hover:animate-bounce" />
              <span>Upload Your Media</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              to="/gallery"
              className="group inline-flex items-center space-x-3 bg-white text-gray-900 px-10 py-5 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 border-2 border-gray-200 hover:border-blue-600"
            >
              <Star className="h-6 w-6 group-hover:animate-spin" />
              <span>Explore Gallery</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="group">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full p-4 w-fit mx-auto mb-4 group-hover:animate-pulse">
                <Camera className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                <AnimatedCounter end={1200} suffix="+" duration={2500} />
              </h3>
              <p className="text-gray-600 font-medium">Photos Shared</p>
            </div>
          </div>
          
          <div className="group">
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full p-4 w-fit mx-auto mb-4 group-hover:animate-pulse">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                <AnimatedCounter end={500} suffix="+" duration={2200} />
              </h3>
              <p className="text-gray-600 font-medium">Active Members</p>
            </div>
          </div>
          
          <div className="group">
            <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full p-4 w-fit mx-auto mb-4 group-hover:animate-pulse">
                <Star className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                <AnimatedCounter end={150} suffix="+" duration={1800} />
              </h3>
              <p className="text-gray-600 font-medium">Featured Stories</p>
            </div>
          </div>
          
          <div className="group">
            <div className="bg-gradient-to-br from-orange-50 to-red-100 p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full p-4 w-fit mx-auto mb-4 group-hover:animate-pulse">
                <Heart className="h-8 w-8" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                <AnimatedCounter end={50} suffix="+" duration={1500} />
              </h3>
              <p className="text-gray-600 font-medium">Events Covered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Why Upload to <span className="text-transparent bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text">LensBridge</span>?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Turn your event memories into social media fame and connect with the UTM MSA community
          </p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="group">
            <div className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 border border-gray-100">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 p-5 rounded-2xl w-fit mx-auto">
                  <Star className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Featured on Social Media</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Your photos and videos could be featured on UTM MSA's official Instagram and Facebook, reaching thousands of students and gaining you recognition in the community.
              </p>
              <div className="space-y-2">
                <Link
                  to="/gallery"
                  className="inline-flex items-center text-purple-600 font-semibold group-hover:translate-x-2 transition-transform hover:text-purple-700 block"
                >
                  <span>See featured content</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
                <div className="flex space-x-4 text-sm">
                  <a
                    href="https://instagram.com/utmmsa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-purple-600 hover:text-purple-700"
                  >
                    <span>@utmmsa Instagram</span>
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                  <a
                    href="https://facebook.com/utmmsa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-purple-600 hover:text-purple-700"
                  >
                    <span>Facebook Page</span>
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="group">
            <div className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 border border-gray-100">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-500 p-5 rounded-2xl w-fit mx-auto">
                  <Heart className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Preserve MSA Memories</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Help document and preserve the amazing moments from UTM MSA events. Your contributions become part of our community's digital legacy for future students to see.
              </p>
              <div className="space-y-2">
                <Link
                  to="/gallery"
                  className="inline-flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform hover:text-blue-700 block"
                >
                  <span>Browse our memories</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
                <div className="text-sm text-blue-600">
                  📸 50+ events documented • 1,200+ photos shared
                </div>
              </div>
            </div>
          </div>

          <div className="group">
            <div className="bg-white p-10 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 border border-gray-100">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-green-600 to-emerald-500 p-5 rounded-2xl w-fit mx-auto">
                  <Users className="h-10 w-10 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Connect & Get Credit</h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Get tagged and credited when your content is featured! Connect with fellow students, build your photography/videography portfolio, and become known in the MSA community.
              </p>
              <div className="space-y-2">
                <Link
                  to="/upload"
                  className="inline-flex items-center text-green-600 font-semibold group-hover:translate-x-2 transition-transform hover:text-green-700 block"
                >
                  <span>Start uploading now</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
                <div className="text-sm text-green-600">
                  ✨ Choose to be credited or stay anonymous
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-white">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            How It <span className="text-transparent bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text">Works</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Three simple steps to share your MSA memories with the world
          </p>
        </div>
        
        <div className="relative">
          {/* Connection Lines */}
          <div className="hidden lg:block absolute top-24 left-1/2 transform -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-blue-600 via-green-600 to-purple-500 opacity-30"></div>
          
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto font-bold text-2xl shadow-xl group-hover:scale-110 transition-transform">
                  1
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Create Your Account</h3>
              <p className="text-gray-600 leading-relaxed">
                Sign up for a free account to start sharing your amazing moments. It only takes a minute!
              </p>
            </div>
            
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto font-bold text-2xl shadow-xl group-hover:scale-110 transition-transform">
                  2
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Upload Your Media</h3>
              <p className="text-gray-600 leading-relaxed">
                Drag and drop your photos and videos, add details, and submit them for review. It's that easy!
              </p>
            </div>
            
            <div className="text-center group">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto font-bold text-2xl shadow-xl group-hover:scale-110 transition-transform">
                  3
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Get Featured</h3>
              <p className="text-gray-600 leading-relaxed">
                Our team reviews submissions and features the best content on our official social media channels.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-br from-blue-600 to-green-600">
        <div className="text-center text-white">
          <div className="mb-8">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full w-fit mx-auto">
              <TrendingUp className="h-12 w-12" />
            </div>
          </div>
          <h2 className="text-5xl font-bold mb-6">Ready to Share Your Story?</h2>
          <p className="text-xl mb-12 max-w-2xl mx-auto opacity-90">
            Join hundreds of UTM MSA students who are already sharing their amazing moments with our community.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center space-x-3 bg-white text-blue-600 px-10 py-5 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1"
          >
            <Upload className="h-6 w-6" />
            <span>Start Uploading Now</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
