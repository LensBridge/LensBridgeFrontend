import { useState, useEffect } from 'react';
import { Search, Filter, Image, Video, Calendar, User, Star, Eye, Heart, Share2, Award, TrendingUp, Sparkles, X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

function Gallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [galleryItems, setGalleryItems] = useState([]);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Fetch gallery data from API
  useEffect(() => {
    const fetchGalleryData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:8080/api/gallery');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle both direct array and object with items property
        const items = Array.isArray(data) ? data : data.items || [];
        setGalleryItems(items);
        
      } catch (err) {
        console.error('Error fetching gallery data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGalleryData();
  }, []);

  const filteredItems = galleryItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.event.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.author.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'featured' && item.featured) ||
                         (selectedFilter === 'images' && item.type === 'image') ||
                         (selectedFilter === 'videos' && item.type === 'video');
    
    return matchesSearch && matchesFilter;
  });

  const featuredItems = galleryItems.filter(item => item.featured);
  const totalLikes = galleryItems.reduce((sum, item) => sum + item.likes, 0);
  const totalViews = galleryItems.reduce((sum, item) => sum + item.views, 0);

  const openViewer = (item) => {
    const index = filteredItems.findIndex(i => i.id === item.id);
    setCurrentIndex(index);
    setSelectedItem(item);
    setIsVideoPlaying(false);
  };

  const closeViewer = () => {
    setSelectedItem(null);
    setIsVideoPlaying(false);
  };

  const navigateViewer = (direction) => {
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % filteredItems.length
      : (currentIndex - 1 + filteredItems.length) % filteredItems.length;
    
    setCurrentIndex(newIndex);
    setSelectedItem(filteredItems[newIndex]);
    setIsVideoPlaying(false);
  };

  const toggleVideoPlayback = () => {
    const video = document.querySelector('.viewer-video');
    if (video) {
      if (isVideoPlaying) {
        video.pause();
        setIsVideoPlaying(false);
      } else {
        video.play();
        setIsVideoPlaying(true);
      }
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedItem) return;
      
      switch (e.key) {
        case 'Escape':
          closeViewer();
          break;
        case 'ArrowLeft':
          navigateViewer('prev');
          break;
        case 'ArrowRight':
          navigateViewer('next');
          break;
        case ' ':
          if (selectedItem.type === 'video') {
            e.preventDefault();
            toggleVideoPlayback();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, currentIndex, isVideoPlaying]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden mb-12">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 opacity-60"></div>
        <div className="relative text-center py-16">
          <div className="mb-6">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              <Sparkles className="h-4 w-4" />
              <span>Community Gallery</span>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Media Gallery</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore amazing memories from UTM MSA events and activities shared by our vibrant community
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-full p-3 w-fit mx-auto mb-3">
              <Image className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <div className="animate-pulse bg-gray-300 h-8 w-12 rounded mx-auto"></div>
              ) : (
                galleryItems.length
              )}
            </div>
            <div className="text-sm text-gray-600">Total Media</div>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-full p-3 w-fit mx-auto mb-3">
              <Award className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <div className="animate-pulse bg-gray-300 h-8 w-12 rounded mx-auto"></div>
              ) : (
                featuredItems.length
              )}
            </div>
            <div className="text-sm text-gray-600">Featured</div>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full p-3 w-fit mx-auto mb-3">
              <Heart className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <div className="animate-pulse bg-gray-300 h-8 w-16 rounded mx-auto"></div>
              ) : (
                totalLikes.toLocaleString()
              )}
            </div>
            <div className="text-sm text-gray-600">Total Likes</div>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full p-3 w-fit mx-auto mb-3">
              <Eye className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <div className="animate-pulse bg-gray-300 h-8 w-16 rounded mx-auto"></div>
              ) : (
                totalViews.toLocaleString()
              )}
            </div>
            <div className="text-sm text-gray-600">Total Views</div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, event, or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            >
              <option value="all">All Media</option>
              <option value="featured">🌟 Featured</option>
              <option value="images">📸 Images Only</option>
              <option value="videos">🎥 Videos Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      {error ? (
        <div className="text-center py-20">
          <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-full p-8 w-fit mx-auto mb-6">
            <Image className="h-16 w-16 text-red-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Gallery</h3>
          <p className="text-gray-600 text-lg mb-6">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            Try Again
          </button>
        </div>
      ) : isLoading ? (
        <div className="text-center py-20">
          <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-8 w-fit mx-auto mb-6 animate-pulse">
            <Image className="h-16 w-16 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Loading Gallery...</h3>
          <p className="text-gray-600 text-lg">
            Fetching amazing MSA moments for you
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20">
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full p-8 w-fit mx-auto mb-6">
            <Image className="h-16 w-16 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">No media found</h3>
          <p className="text-gray-600 text-lg">
            Try adjusting your search terms or filters to find what you're looking for
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 border border-gray-200 overflow-hidden cursor-pointer"
              onClick={() => openViewer(item)}
              onMouseEnter={(e) => {
                setHoveredItem(item.id);
                if (item.type === 'video') {
                  const video = e.currentTarget.querySelector('video');
                  if (video) {
                    video.currentTime = 0;
                    video.play().catch(console.error);
                  }
                }
              }}
              onMouseLeave={(e) => {
                setHoveredItem(null);
                if (item.type === 'video') {
                  const video = e.currentTarget.querySelector('video');
                  if (video) {
                    video.pause();
                    video.currentTime = 0;
                  }
                }
              }}
            >
              <div className="relative aspect-square overflow-hidden">
                {item.type === 'video' ? (
                  <video
                    src={item.src}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    muted
                    loop
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={item.src}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                
                {/* Overlay */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-300 ${
                  hoveredItem === item.id ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <Heart className="h-4 w-4" />
                          <span className="text-sm font-medium">{item.likes}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span className="text-sm font-medium">{item.views}</span>
                        </div>
                      </div>
                      <Share2 className="h-4 w-4 cursor-pointer hover:scale-110 transition-transform" />
                    </div>
                  </div>
                </div>

                {/* Media Type Indicator */}
                {item.type === 'video' && (
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                    <Video className="h-3 w-3" />
                    <span>Video</span>
                  </div>
                )}
                
                {/* Featured Badge */}
                {item.featured && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow-lg">
                    <Star className="h-3 w-3" />
                    <span>Featured</span>
                  </div>
                )}
              </div>
              
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-blue-600 font-medium text-sm mb-3 bg-blue-50 px-3 py-1 rounded-full w-fit">
                  {item.event}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <div className="bg-gray-100 rounded-full p-1">
                      <User className="h-3 w-3" />
                    </div>
                    <span className="font-medium">{item.author}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Featured Section */}
      {featuredItems.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border border-yellow-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg mb-4">
              <Star className="h-4 w-4" />
              <span>Featured Content</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Community Highlights</h2>
            <p className="text-gray-600">
              These amazing moments have been featured on our social media
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredItems.slice(0, 3).map((item) => (
              <div 
                key={item.id} 
                className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-200 overflow-hidden"
                onMouseEnter={(e) => {
                  if (item.type === 'video') {
                    const video = e.currentTarget.querySelector('video');
                    if (video) {
                      video.currentTime = 0;
                      video.play().catch(console.error);
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (item.type === 'video') {
                    const video = e.currentTarget.querySelector('video');
                    if (video) {
                      video.pause();
                      video.currentTime = 0;
                    }
                  }
                }}
              >
                <div className="relative aspect-video overflow-hidden">
                  {item.type === 'video' ? (
                    <video
                      src={item.src}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={item.src}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  )}
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{item.likes}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full h-full max-w-6xl max-h-full flex items-center justify-center">
            
            {/* Close Button */}
            <button
              onClick={closeViewer}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-300 hover:scale-110"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Navigation Arrows */}
            {filteredItems.length > 1 && (
              <>
                <button
                  onClick={() => navigateViewer('prev')}
                  className="absolute left-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all duration-300 hover:scale-110"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => navigateViewer('next')}
                  className="absolute right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-3 transition-all duration-300 hover:scale-110"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Media Content */}
            <div className="relative w-full h-full flex items-center justify-center">
              {selectedItem.type === 'video' ? (
                <div className="relative w-full h-full max-w-4xl max-h-4xl">
                  <video
                    src={selectedItem.src}
                    className="viewer-video w-full h-full object-contain rounded-lg"
                    controls
                    autoPlay
                    loop
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                  />
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={toggleVideoPlayback}
                      className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-4 transition-all duration-300 hover:scale-110"
                    >
                      {isVideoPlaying ? (
                        <Pause className="h-8 w-8" />
                      ) : (
                        <Play className="h-8 w-8" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <img
                  src={selectedItem.src}
                  alt={selectedItem.title}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              )}
            </div>

            {/* Media Info */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="bg-black bg-opacity-50 backdrop-blur-sm rounded-2xl p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">{selectedItem.title}</h2>
                    <p className="text-blue-300 font-medium mb-2 bg-blue-600 bg-opacity-30 px-3 py-1 rounded-full w-fit">
                      {selectedItem.event}
                    </p>
                  </div>
                  {selectedItem.featured && (
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                      <Star className="h-3 w-3" />
                      <span>Featured</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{selectedItem.author}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(selectedItem.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <Heart className="h-4 w-4" />
                      <span>{selectedItem.likes}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4" />
                      <span>{selectedItem.views}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Indicator */}
            {filteredItems.length > 1 && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-black bg-opacity-50 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm">
                  {currentIndex + 1} / {filteredItems.length}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Gallery;
