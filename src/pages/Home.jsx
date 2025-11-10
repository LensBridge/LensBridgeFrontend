import { Link } from 'react-router-dom';
import { Upload, Users, Star, Camera, ArrowRight, Sparkles, Heart, TrendingUp, ExternalLink, X } from 'lucide-react';
// Local meme gif for the final screen
import cookieMonsterLocalGif from '../assets/Cookie Monster GIF - Cookie Monster - Discover & Share GIFs.gif';
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
  const revealRefs = useRef([]);
  const addRevealRef = (el) => { if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el); };

  // Cookie Meme Popup States
  const [showCookiePopup, setShowCookiePopup] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showCookieMonsterPopup, setShowCookieMonsterPopup] = useState(false);
  const [showEventAdPopup, setShowEventAdPopup] = useState(false);
  const [siteLoaded, setSiteLoaded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-up-active');
          entry.target.classList.add('scale-in-active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    revealRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Cookie Meme Logic
  useEffect(() => {
    // Simulate site loading
    const loadTimer = setTimeout(() => {
      setSiteLoaded(true);
    }, 1000);

    return () => clearTimeout(loadTimer);
  }, []);

  useEffect(() => {
    if (siteLoaded) {
      // Wait 2 seconds after site loads, then show cookie popup
      const cookieTimer = setTimeout(() => {
        setShowCookiePopup(true);
      }, 2000);

      return () => clearTimeout(cookieTimer);
    }
  }, [siteLoaded]);

  const handleCookieNo = () => {
    setShowCookiePopup(false);
    setShowConfirmPopup(true);
  };

  const handleConfirmYes = () => {
    setShowConfirmPopup(false);
    setShowCookieMonsterPopup(true);
  };

  const handleCookieMonsterSure = () => {
    setShowCookieMonsterPopup(false);
    // Show the final event ad popup with local GIF
    setShowEventAdPopup(true);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Cookie Policy Meme Popups */}
      {/* Initial Cookie Popup */}
      {showCookiePopup && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-auto shadow-2xl animate-bounce-in">
            <div className="text-center">
              <div className="text-6xl mb-4">🍪</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">UTM MSA's Cookie Policy</h3>
              <p className="text-gray-700 mb-6 leading-relaxed">
                Assalamu Alaikum! The MSA team at LensBridge <strong>LOVES</strong> cookies, and would love to share some with you because sharing is caring! 
              </p>
              <p className="text-gray-700 mb-8">
                Do you agree to receive UTM MSA's amazing cookies? 🍪✨
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowCookiePopup(false)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105"
                >
                  Yes, I love cookies! 🍪
                </button>
                <button
                  onClick={handleCookieNo}
                  className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-300"
                >
                  No thanks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Popup */}
      {showConfirmPopup && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-auto shadow-2xl animate-shake">
            <div className="text-center">
              <div className="text-6xl mb-4">😢</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Are you sure?</h3>
              <p className="text-gray-700 mb-6">
                You really don't want any of our amazing cookies? This is a once in a lifetime offer! 
              </p>
              <p className="text-gray-700 mb-8">
                Are you absolutely certain about this decision?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowConfirmPopup(false);
                    setShowCookiePopup(true);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300"
                >
                  Wait, I changed my mind!
                </button>
                <button
                  onClick={handleConfirmYes}
                  className="flex-1 bg-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600 transition-all duration-300"
                >
                  Yes, I'm sure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Monster Popup */}
      {showCookieMonsterPopup && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-auto shadow-2xl animate-wiggle">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-red-600 mb-4">You will make Cookie Monster upset! 😭</h3>
              <div className="mb-6">
                <img 
                  src="https://media.giphy.com/media/EKUvB9uFnm2Xe/giphy.gif" 
                  alt="Sad Cookie Monster"
                  className="w-64 h-64 mx-auto rounded-2xl object-cover"
                  onError={(e) => {
                    e.target.src = "https://media.tenor.com/rqv7xj8f5hcAAAAM/cookie-monster-cookies.gif";
                  }}
                />
              </div>
              <p className="text-gray-700 mb-8">
                Cookie Monster is very sad that you don't want cookies. Look at those big sad eyes! 
                Are you really going to make Cookie Monster cry? 💔
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowCookieMonsterPopup(false);
                    setShowCookiePopup(true);
                  }}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300"
                >
                  I'm sorry Cookie Monster! 🍪
                </button>
                <button
                  onClick={handleCookieMonsterSure}
                  className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-all duration-300"
                >
                  I'm sure 😤
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Final Meme + Event Ad Popup */}
      {showEventAdPopup && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-3xl p-3 sm:p-6 md:p-8 max-w-2xl w-full mx-auto shadow-2xl animate-bounce-in max-h-[98vh] overflow-y-auto">
            <div className="flex justify-end mb-1">
              <button aria-label="Close"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowEventAdPopup(false)}>
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <div className="text-center">
              <div className="mb-3 sm:mb-6">
                <img
                  src={cookieMonsterLocalGif}
                  alt="Cookie Monster enjoying cookies"
                  className="mx-auto max-h-32 sm:max-h-52 md:max-h-64 rounded-2xl object-contain w-auto"
                />
              </div>
              
              {/* Main Headline */}
              <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-2 sm:mb-3 leading-tight">
                be better. <span className="text-transparent bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text">be like cookie monster</span>
              </h2>
              <p className="text-xs sm:text-base text-gray-700 font-medium mb-3 sm:mb-6 italic">
                Cookie Monster has declared you "a danger to baked goods everywhere."
              </p>
              {/* Event Card */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-3 sm:p-8 mb-3 sm:mb-6 border-2 border-blue-100 shadow-lg">
                {/* Event Title */}
                <div className="mb-3 sm:mb-6">
                  <h3 className="text-lg sm:text-3xl font-bold text-gray-900 mb-1">
                    🍪 Cookie Decorating Session
                  </h3>
                  <p className="text-sm sm:text-lg text-gray-700 italic">
                    Sugar, Frosting, and Good Company
                  </p>
                </div>
                
                {/* Event Details Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6">
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 sm:p-4 shadow-sm">
                    <div className="text-2xl sm:text-3xl mb-1">📅</div>
                    <div className="text-xs sm:text-sm text-gray-600 font-medium">Date & Time</div>
                    <div className="text-sm sm:text-base font-bold text-gray-900">Fri, Nov 14</div>
                    <div className="text-xs sm:text-sm text-gray-700">3:30-5:30 PM</div>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 sm:p-4 shadow-sm">
                    <div className="text-2xl sm:text-3xl mb-1">📍</div>
                    <div className="text-xs sm:text-sm text-gray-600 font-medium">Location</div>
                    <div className="text-sm sm:text-base font-bold text-gray-900">Board Room</div>
                    <div className="text-xs sm:text-sm text-gray-700">Student Centre</div>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 sm:p-4 shadow-sm">
                    <div className="text-2xl sm:text-3xl mb-1">💰</div>
                    <div className="text-xs sm:text-sm text-gray-600 font-medium">Cost</div>
                    <div className="text-sm sm:text-base font-bold text-gray-900">$12/person</div>
                    <div className="text-xs sm:text-sm text-gray-700">Materials incl.</div>
                  </div>
                  
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 sm:p-4 shadow-sm">
                    <div className="text-2xl sm:text-3xl mb-1">🍪</div>
                    <div className="text-xs sm:text-sm text-gray-600 font-medium">What You Get</div>
                    <div className="text-sm sm:text-base font-bold text-gray-900">2 Cookies</div>
                    <div className="text-xs sm:text-sm text-gray-700">Decorate & eat!</div>
                  </div>
                </div>
                
                {/* Fun Copy */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-2 sm:p-4 border border-blue-200">
                  <p className="text-xs sm:text-base text-gray-800 font-medium">
                    ✨ Show up. Decorate something. Prove you're not a frosting-fraud.
                  </p>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center mb-2 sm:mb-4">
                <button
                  onClick={() => setShowEventAdPopup(false)}
                  className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-5 sm:px-8 py-2.5 sm:py-4 rounded-xl font-bold text-sm sm:text-lg hover:from-blue-700 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg w-full sm:w-auto"
                >
                  Count Me In! 🎉
                </button>
                <Link
                  to="/upload"
                  className="bg-white border-2 border-gray-200 text-gray-800 px-5 sm:px-8 py-2.5 sm:py-4 rounded-xl font-bold text-sm sm:text-lg hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-lg text-center w-full sm:w-auto"
                  onClick={() => setShowEventAdPopup(false)}
                >
                  I'll Bring Photos 📸
                </Link>
              </div>
              
              {/* Disclaimer */}
              <p className="text-[10px] sm:text-sm text-gray-500 italic">
                btw, lensbridge doesn't actually use any tracking cookies.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-70 animate-gradient" />
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-gradient-to-br from-blue-500/30 to-green-400/20 rounded-full blur-3xl animate-orb-1" />
            <div className="absolute top-1/3 -right-32 w-72 h-72 bg-gradient-to-br from-indigo-500/20 to-purple-400/30 rounded-full blur-3xl animate-orb-2" />
            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-gradient-to-br from-teal-400/20 to-emerald-500/30 rounded-full blur-3xl animate-orb-3" />
        </div>
        <div className="relative text-center py-20 px-4 fade-in-up scale-in" ref={addRevealRef}>
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
              <Sparkles className="h-4 w-4" />
              <span>Share Your MSA Moments</span>
            </div>
          </div>
          <div className="flex justify-center mb-8 fade-in-up scale-in" ref={addRevealRef}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 rounded-full blur-xl opacity-30 animate-pulse" />
              <div className="relative bg-gradient-to-r from-blue-600 to-green-600 p-6 rounded-full shadow-2xl animate-float">
                <img src="/lensbridge-logo.svg" alt="LensBridge" className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight fade-in-up scale-in" ref={addRevealRef}>
            Welcome to{' '}
            <span className="text-transparent bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text">LensBridge</span>
          </h1>
          <p className="text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed fade-in-up scale-in" ref={addRevealRef}>
            Connect, share, and celebrate UTM MSA events! Upload your amazing event photos and videos for a chance to be featured on our <a href="https://instagram.com/utmmsa" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Instagram</a> and <a href="https://facebook.com/utmmsa" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Facebook</a> stories.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in-up scale-in" ref={addRevealRef}>
            <Link to="/upload" className="group inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-green-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1">
              <Upload className="h-6 w-6 group-hover:animate-bounce" />
              <span>Upload Your Media</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/gallery" className="group inline-flex items-center space-x-3 bg-white text-gray-900 px-10 py-5 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 border-2 border-gray-200 hover:border-blue-600">
              <Star className="h-6 w-6 group-hover:animate-spin" />
              <span>Explore Gallery</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section with reveal */}
      <div className="py-16 bg-white fade-in-up scale-in" ref={addRevealRef}>
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
      <div className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 fade-in-up scale-in" ref={addRevealRef}>
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

      {/* Sadaqa Jariyah Section */}
      <div className="py-16 bg-gradient-to-r from-green-50 to-blue-50 border-t border-b border-green-200 fade-in-up scale-in" ref={addRevealRef}>
        <div className="max-w-3xl mx-auto text-center px-4">
          <div className="flex justify-center mb-4">
            <Heart className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Sadaqa Jariyah: Ongoing Charity</h2>
          <p className="text-lg text-gray-700 mb-4">
            Every photo or video you share can inspire, educate, and uplift others, long after the event is over! By contributing your memories, you’re taking part in <span className="font-semibold text-green-700">Sadaqa Jariyah</span> (ongoing charity):
          </p>
          <blockquote className="text-xl md:text-2xl text-gray-800 font-arabic leading-relaxed mb-2">
            إِذَا مَاتَ الإِنسَانُ انْقَطَعَ عَمَلُهُ إِلاَّ مِنْ ثَلاَثَةٍ: صَدَقَةٍ جَارِيَةٍ، أَوْ عِلْمٍ يُنْتَفَعُ بِهِ، أَوْ وَلَدٍ صَالِحٍ يَدْعُو لَهُ
          </blockquote>
          <p className="text-base text-gray-700 italic mb-2">
            "When a man dies, his acts come to an end, but three, recurring charity, or knowledge (by which people) benefit, or a pious son, who prays for him (for the deceased)." <span className="text-xs">(Muslim 1631)</span>
          </p>
          <p className="text-sm text-gray-600">
            <a href="https://sunnah.com/muslim:1631" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline transition-colors">
              Sahih Muslim 1631
            </a>
          </p>
        </div>
      </div>
      {/* How It Works Section */}
      <div className="py-20 bg-white fade-in-up scale-in" ref={addRevealRef}>
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
      <div className="py-20 bg-gradient-to-br from-blue-600 to-green-600 fade-in-up scale-in" ref={addRevealRef}>
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
