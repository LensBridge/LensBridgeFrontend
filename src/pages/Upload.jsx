import { useState, useRef, useEffect } from 'react';
import { Upload as UploadIcon, X, Image, Video, Check, AlertCircle, ChevronDown } from 'lucide-react';

function Upload() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    event: '',
    description: '',
    consent: false
  });
  const fileInputRef = useRef(null);

  // Mock API call to fetch events
  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      
      // Simulate API call - replace with your actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock event data - this would come from your Spring Boot API
      const mockEvents = [
        { id: 1, name: 'MSA Welcome Week', date: '2025-09-15', status: 'upcoming' },
        { id: 2, name: 'Cultural Night 2025', date: '2025-10-20', status: 'upcoming' },
        { id: 3, name: 'Charity Fundraiser', date: '2025-11-10', status: 'upcoming' },
        { id: 4, name: 'Islamic Awareness Week', date: '2025-11-25', status: 'upcoming' },
        { id: 5, name: 'End of Year Banquet', date: '2025-12-15', status: 'upcoming' },
        { id: 6, name: 'Study Session - Midterms', date: '2025-10-05', status: 'ongoing' },
      ];
      
      setEvents(mockEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Real API call function (commented out for now)
  /*
  const fetchEventsFromAPI = async () => {
    try {
      setLoadingEvents(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/events/current`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const eventsData = await response.json();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };
  */

  // Fetch events when component mounts
  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
  };

  const handleFiles = (newFiles) => {
    const validFiles = newFiles.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB limit
      return (isImage || isVideo) && isValidSize;
    });

    const filesWithPreviews = validFiles.map(file => ({
      file,
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(file),
      type: file.type.startsWith('image/') ? 'image' : 'video'
    }));

    setFiles(prev => [...prev, ...filesWithPreviews]);
  };

  const removeFile = (fileId) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEventSelect = (eventName) => {
    setFormData(prev => ({
      ...prev,
      event: eventName
    }));
    setEventDropdownOpen(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0 || !formData.consent) return;

    setIsUploading(true);
    
    try {
      // TODO: Replace with actual API call
      const uploadData = new FormData();
      
      // Add form data
      uploadData.append('name', formData.name);
      uploadData.append('email', formData.email);
      uploadData.append('event', formData.event);
      uploadData.append('description', formData.description);
      uploadData.append('consent', formData.consent);
      
      // Add files
      files.forEach((file, index) => {
        uploadData.append(`files[${index}]`, file.file);
      });
      
      // Simulate upload process for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // TODO: Make actual API call
      /*
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: uploadData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const result = await response.json();
      */
      
      setIsUploading(false);
      setUploadComplete(true);
      
      // Clear form after successful upload
      setTimeout(() => {
        setFiles([]);
        setFormData({
          name: '',
          email: '',
          event: '',
          description: '',
          consent: false
        });
        setUploadComplete(false);
      }, 3000);
      
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      // TODO: Show error message to user
    }
  };

  const isFormValid = files.length > 0 && formData.name && formData.email && formData.event && formData.consent;

  if (uploadComplete) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="bg-green-600 p-4 rounded-full w-fit mx-auto mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Successful!</h2>
          <p className="text-gray-600 mb-4">
            Thank you for sharing your memories! We'll review your submission and may feature it on our social media.
          </p>
          <button
            onClick={() => setUploadComplete(false)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload More
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Media</h1>
        <p className="text-gray-600">
          Share your UTM MSA event photos and videos with the community
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* File Upload Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Files</h2>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 hover:border-blue-600 hover:bg-gray-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              Drag and drop your files here, or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500">
              Supports: Images (JPG, PNG, GIF) and Videos (MP4, MOV, AVI) up to 100MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    {file.type === 'image' ? (
                      <img
                        src={file.preview}
                        alt={file.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-gray-600 mt-1 truncate">{file.file.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="your.email@example.com"
              />
            </div>
          </div>

          {/* Event Dropdown */}
          <div className="mt-6">
            <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-2">
              Event Name *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setEventDropdownOpen(!eventDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-left flex items-center justify-between"
                disabled={loadingEvents}
              >
                <span className={formData.event ? 'text-gray-900' : 'text-gray-500'}>
                  {loadingEvents ? 'Loading events...' : formData.event || 'Select an event'}
                </span>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${eventDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {eventDropdownOpen && !loadingEvents && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleEventSelect(event.name)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900">{event.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              event.status === 'ongoing' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {event.status}
                            </span>
                            <span className="text-sm text-gray-500">
                              {formatDate(event.date)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-center">
                      No events available
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              placeholder="Tell us about these photos/videos..."
            />
          </div>

          <div className="mt-6">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                name="consent"
                checked={formData.consent}
                onChange={handleInputChange}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                I consent to UTM MSA using my submitted media for promotional purposes on social media platforms. *
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={!isFormValid || isUploading}
            className={`inline-flex items-center space-x-2 px-8 py-4 rounded-lg font-semibold transition-colors ${
              isFormValid && !isUploading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadIcon className="h-5 w-5" />
                <span>Upload Media</span>
              </>
            )}
          </button>

          {!isFormValid && (
            <p className="mt-2 text-sm text-gray-500 flex items-center justify-center space-x-1">
              <AlertCircle className="h-4 w-4" />
              <span>Please fill in all required fields and upload at least one file</span>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

export default Upload;
