import { useState, useEffect } from 'react';
import { Search, Filter, Image, Video, Calendar, User, Star, Eye, Heart, Share2, Award, TrendingUp, Sparkles } from 'lucide-react';

function Gallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [galleryItems, setGalleryItems] = useState([]);
  const [hoveredItem, setHoveredItem] = useState(null);

  // Mock data for demonstration
  useEffect(() => {
    const mockGalleryItems = [
      {
        id: 1,
        type: 'image',
        src: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=500&h=400&fit=crop',
        title: 'MSA Community Iftar',
        author: 'Ahmad K.',
        date: '2024-03-15',
        event: 'Ramadan Iftar 2024',
        featured: true,
        likes: 145,
        views: 2340
      },
      {
        id: 2,
        type: 'image',
        src: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&h=400&fit=crop',
        title: 'Islamic Awareness Week',
        author: 'Fatima S.',
        date: '2024-02-20',
        event: 'Islamic Awareness Week',
        featured: false,
        likes: 89,
        views: 1520
      },
      {
        id: 3,
        type: 'image',
        src: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=500&h=400&fit=crop',
        title: 'Study Session',
        author: 'Omar M.',
        date: '2024-01-10',
        event: 'Winter Study Sessions',
        featured: true,
        likes: 203,
        views: 3100
      },
      {
        id: 4,
        type: 'video',
        src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&h=400&fit=crop',
        title: 'Eid Celebration',
        author: 'Aisha R.',
        date: '2024-04-10',
        event: 'Eid ul-Fitr Celebration',
        featured: false,
        likes: 178,
        views: 2890
      },
      {
        id: 5,
        type: 'image',
        src: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&h=400&fit=crop',
        title: 'Volunteer Day',
        author: 'Yusuf A.',
        date: '2024-03-05',
        event: 'Community Service Day',
        featured: true,
        likes: 95,
        views: 1750
      },
      {
        id: 6,
        type: 'image',
        src: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&h=400&fit=crop',
        title: 'Cultural Night',
        author: 'Zainab H.',
        date: '2024-02-14',
        event: 'Cultural Diversity Night',
        featured: false,
        likes: 124,
        views: 2100
      },
      {
        id: 7,
        type: 'image',
        src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=400&fit=crop',
        title: 'Prayer Time',
        author: 'Hassan M.',
        date: '2024-01-25',
        event: 'Daily Prayer',
        featured: true,
        likes: 267,
        views: 4200
      },
      {
        id: 8,
        type: 'video',
        src: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=400&fit=crop',
        title: 'Talent Show',
        author: 'Layla K.',
        date: '2024-03-20',
        event: 'MSA Talent Night',
        featured: false,
        likes: 156,
        views: 2650
      }
    ];
    setGalleryItems(mockGalleryItems);
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
            <div className="text-2xl font-bold text-gray-900">{galleryItems.length}</div>
            <div className="text-sm text-gray-600">Total Media</div>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-full p-3 w-fit mx-auto mb-3">
              <Award className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{featuredItems.length}</div>
            <div className="text-sm text-gray-600">Featured</div>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full p-3 w-fit mx-auto mb-3">
              <Heart className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalLikes.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Likes</div>
          </div>
          <div className="text-center">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full p-3 w-fit mx-auto mb-3">
              <Eye className="h-6 w-6" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</div>
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
      {filteredItems.length === 0 ? (
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
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 border border-gray-200 overflow-hidden"
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={item.src}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
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
              <div key={item.id} className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-200 overflow-hidden">
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={item.src}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
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
    </div>
  );
}

export default Gallery;
