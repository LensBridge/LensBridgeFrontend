import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Image, Video, Calendar, User, Star, Share2, Award, Sparkles, X, ChevronLeft, ChevronRight, Play, Pause, RefreshCw } from 'lucide-react';
import { useGallery } from '../hooks/useGallery';
import { useMediaViewer } from '../hooks/useMediaViewer';
import { useGalleryFilters } from '../hooks/useGalleryFilters';

function Gallery() {
  const [hoveredItem, setHoveredItem] = useState(null);
  
  // Custom hooks for functionality
  const {
    galleryItems,
    isLoading,
    isPaginating,
    error,
    totalPages,
    totalElements,
    currentPage,
    pageSize,
    fetchGalleryData,
    handlePageChange,
    handlePageSizeChange,
    cleanupUrls,
    setError
  } = useGallery();

  const {
    searchTerm,
    searchInput,
    selectedFilter,
    handleSearchChange,
    handleFilterChange,
    clearFilters
  } = useGalleryFilters();

  const {
    selectedItem,
    currentIndex,
    isVideoPlaying,
    openViewer,
    closeViewer,
    navigateViewer,
    toggleVideoPlayback
  } = useMediaViewer(galleryItems);

  // Fetch gallery data whenever filters or pagination changes
  useEffect(() => {
    fetchGalleryData(currentPage, pageSize, searchTerm, selectedFilter);
  }, [fetchGalleryData, currentPage, pageSize, searchTerm, selectedFilter]);

  // Cleanup HEIC object URLs on component unmount
  useEffect(() => {
    return cleanupUrls;
  }, [cleanupUrls]);

  // Use galleryItems directly since filtering is now done server-side
  const filteredItems = galleryItems;
  const featuredItems = galleryItems.filter(item => item.featured);

  const handleRetry = useCallback(() => {
    setError(null);
    fetchGalleryData(currentPage, pageSize, searchTerm, selectedFilter);
  }, [setError, fetchGalleryData, currentPage, pageSize, searchTerm, selectedFilter]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden mb-12">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 opacity-60"></div>
        <div className="relative text-center py-16">
          <div className="mb-6">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              <Sparkles className="h-4 w-4" />
              <span>Community Gallery</span>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">Media Gallery</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore amazing memories from UTM MSA events and activities shared by our vibrant community
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-full p-3 w-fit mx-auto mb-3">
              <Image className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? (
                <div className="animate-pulse bg-gray-300 h-8 w-12 rounded mx-auto"></div>
              ) : (
                totalElements
              )}
            </div>
            <div className="text-sm text-gray-600">Total Media</div>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-full p-3 w-fit mx-auto mb-3">
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
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, event, or author..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            {searchInput && (
              <button
                onClick={clearFilters}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={selectedFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            >
              <option value="all">All Media</option>
              <option value="featured">🌟 Featured</option>
              <option value="images">📸 Images Only</option>
              <option value="videos">🎥 Videos Only</option>
            </select>
            
            {/* Refresh Button with Cache Options */}
            <div className="relative group">
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="p-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                title="Refresh gallery (hover for more options)"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-xs">▼</span>
              </button>
              
              {/* Cache Options Dropdown */}
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-48">
                <div className="p-2 space-y-1">
                  <button
                    onClick={handleRetry}
                    disabled={isLoading}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
            </div>
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
          <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
            {error}
          </p>
          <button
            onClick={handleRetry}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Retrying...' : 'Try Again'}</span>
          </button>
        </div>
      ) : isLoading ? (
        <div className="text-center py-20">
          <div className="bg-gradient-to-br from-blue-100 to-green-100 rounded-full p-8 w-fit mx-auto mb-6 animate-pulse">
            <Image className="h-16 w-16 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Loading Gallery...</h3>
          <p className="text-gray-600 text-lg">
            Fetching amazing MSA moments for you
          </p>
          <div className="mt-6">
            <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-green-600 rounded-full animate-pulse"></div>
            </div>
          </div>
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
        <div className="relative">
          {isPaginating && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
              <div className="text-center bg-white rounded-xl shadow-lg p-6">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-gray-600 font-medium">Loading...</p>
              </div>
            </div>
          )}
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
                      <div className="flex items-center justify-end mb-2">
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
        </div>
      )}

      {/* Pagination Controls */}
      {!error && !isLoading && totalPages > 1 && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            {/* Page Size Selector */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600 font-medium">Items per page:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              >
                <option value={6}>6</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>

            {/* Page Info */}
            <div className="text-sm text-gray-600 font-medium">
              Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, totalElements)} of {totalElements} items
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(0)}
                disabled={currentPage === 0}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <ChevronLeft className="h-4 w-4" />
                <ChevronLeft className="h-4 w-4 -ml-2" />
              </button>
              
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (currentPage < 3) {
                    pageNum = i;
                  } else if (currentPage > totalPages - 4) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-md'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => handlePageChange(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <ChevronRight className="h-4 w-4" />
                <ChevronRight className="h-4 w-4 -ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Featured Section - Only show on first page with no filters */}
      {featuredItems.length > 0 && currentPage === 0 && selectedFilter === 'all' && !searchTerm && (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 border border-yellow-200 mb-8">
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
                className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-200 overflow-hidden cursor-pointer"
                onClick={() => openViewer(item)}
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
                    <Star className="h-3 w-3" />
                    <span>Featured</span>
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
