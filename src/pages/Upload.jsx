import { useState, useRef, useEffect } from 'react';
import { Upload as UploadIcon, X, Image, Video, Check, AlertCircle, ChevronDown } from 'lucide-react';
import heic2any from 'heic2any';
import API_CONFIG from '../config/api';

// Test if heic2any is working
console.log('heic2any library loaded:', typeof heic2any);

function Upload() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    instagram: '',
    event: '',
    eventId: '', // Add eventId to track the selected event's ID
    description: '',
    isAnon: false,
    consent: false
  });
  const fileInputRef = useRef(null);
  
  const fetchEventsFromAPI = async () => {
    try {
      setLoadingEvents(true);
      const token = localStorage.getItem('token');
      const tokenType = localStorage.getItem('tokenType') || 'Bearer';
      
      const headers = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      };
      
      if (token) {
        headers['Authorization'] = `${tokenType} ${token}`;
      }
      
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`, {
        headers
      });
      
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


  // Fetch events when component mounts
  useEffect(() => {
    fetchEventsFromAPI();
    
    // Auto-populate user info from authentication
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      try {
        const user = JSON.parse(userInfo);
        // No need to auto-populate name and email anymore since they're removed
      } catch (error) {
        console.error('Error parsing user info:', error);
      }
    }
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', droppedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
    await handleFiles(droppedFiles);
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    await handleFiles(selectedFiles);
  };

  const handleFiles = async (newFiles) => {
    setIsProcessingFiles(true);
    
    const validFiles = newFiles.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      // Check for HEIC files by extension since MIME type might not be recognized
      const fileName = file.name.toLowerCase();
      const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif');
      
      const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB limit
      
      // Enhanced logging for debugging
      console.log(`File validation - Name: ${file.name}, Type: "${file.type}", Size: ${file.size}, isImage: ${isImage}, isVideo: ${isVideo}, isHeic: ${isHeic}, isValidSize: ${isValidSize}`);
      
      return (isImage || isVideo || isHeic) && isValidSize;
    });

    const filesWithPreviews = await Promise.all(validFiles.map(async (file) => {
      try {
        const fileName = file.name.toLowerCase();
        const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif');
        
        let processedFile = file;
        let preview = null;
        
        if (isHeic) {
          try {
            console.log(`Converting HEIC file: ${file.name}, size: ${file.size} bytes`);
            
            // Check if heic2any is available
            if (typeof heic2any !== 'function') {
              throw new Error('heic2any library not available');
            }
            
            // Convert HEIC to JPEG for preview
            console.log('Starting HEIC conversion...');
            const convertedBlob = await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 0.8
            });
            
            console.log('Conversion result:', convertedBlob);
            
            // heic2any sometimes returns an array, sometimes a single blob
            const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            
            // Verify the conversion result
            if (finalBlob && finalBlob instanceof Blob && finalBlob.size > 0) {
              preview = URL.createObjectURL(finalBlob);
              console.log(`✅ HEIC conversion successful for: ${file.name}, converted size: ${finalBlob.size} bytes, preview URL: ${preview}`);
            } else {
              console.warn(`❌ HEIC conversion result is not a valid blob for: ${file.name}`, finalBlob);
              preview = null;
            }
            
          } catch (conversionError) {
            console.error(`❌ HEIC conversion failed for ${file.name}:`, conversionError);
            console.error('Error details:', {
              name: conversionError.name,
              message: conversionError.message,
              stack: conversionError.stack
            });
            preview = null; // Will show fallback
          }
        } else {
          try {
            // For non-HEIC files, create normal preview
            preview = URL.createObjectURL(file);
            console.log(`✅ Normal preview created for: ${file.name}`);
          } catch (previewError) {
            console.error(`❌ Failed to create preview for: ${file.name}`, previewError);
            preview = null;
          }
        }
        
        return {
          file: processedFile, // Always keep original file
          id: Date.now() + Math.random(),
          preview: preview,
          type: (file.type.startsWith('image/') || isHeic) ? 'image' : 'video'
        };
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        return {
          file,
          id: Date.now() + Math.random(),
          preview: null, // No preview if processing fails
          type: (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) ? 'image' : 'video'
        };
      }
    }));

    console.log(`Added ${filesWithPreviews.length} files out of ${newFiles.length} dropped files`);
    setFiles(prev => [...prev, ...filesWithPreviews]);
    setIsProcessingFiles(false);
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
    
    // Handle Instagram validation (similar to backend pattern)
    if (name === 'instagram') {
      // Only allow letters, numbers, dots, and underscores
      const instagramPattern = /^[a-zA-Z0-9._]*$/;
      if (value && !instagramPattern.test(value)) {
        return; // Don't update if invalid characters
      }
      // Limit to 30 characters
      if (value.length > 30) {
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEventSelect = (eventName, eventId) => {
    setFormData(prev => ({
      ...prev,
      event: eventName,
      eventId: eventId
    }));
    setEventDropdownOpen(false);
  };

  const formatDate = (dateString) => {
    // Parse the date and interpret it as EST
    const date = new Date(dateString + 'T00:00:00-05:00'); // Force EST timezone
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/New_York' // EST/EDT timezone
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0 || !formData.consent || !formData.eventId) return;

    // Validate authentication before starting upload
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('user');
    
    if (!token || !userInfo) {
      alert('Authentication expired. Please sign in again.');
      window.location.href = '/login';
      return;
    }

    setIsUploading(true);
    
    try {
      // For Spring Boot endpoint with @PathVariable and @RequestParam,
      // we send individual form parameters instead of a JSON object.

      // Create FormData for multipart request
      const uploadData = new FormData();
      
      // Add files as request parameters
      files.forEach((file) => {
        uploadData.append('files', file.file);
      });
      
      // Add other parameters as individual form fields
      if (formData.instagram) {
        uploadData.append('instagramHandle', formData.instagram);
      }
      
      if (formData.description) {
        uploadData.append('description', formData.description);
      }
      
      // Add anon parameter (required, so always send it)
      uploadData.append('anon', formData.isAnon);
      
      // Get authentication token
      const tokenType = localStorage.getItem('tokenType') || 'Bearer';
      
      // For FormData uploads, don't set Content-Type - let browser set it automatically
      const headers = {
        'ngrok-skip-browser-warning': 'true'
      };
      
      if (token) {
        headers['Authorization'] = `${tokenType} ${token}`;
      }
      
      // Make actual API call to Spring Boot backend with eventId in path
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD}/${formData.eventId}/batch`, {
        method: 'POST',
        headers,
        body: uploadData,
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Upload failed: ${errorData}`);
      }
      
      // Handle different response types from backend
      let result;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // Backend returned plain text or HTML
        result = { message: await response.text() };
      }
      
      setIsUploading(false);
      setUploadComplete(true);
      
      // Clear form after successful upload
      setTimeout(() => {
        setFiles([]);
        setFormData({
          instagram: '',
          event: '',
          eventId: '',
          description: '',
          isAnon: false,
          consent: false
        });
        setUploadComplete(false);
      }, 3000);
      
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      alert(`Upload failed: ${error.message}`);
    }
  };

  const isFormValid = files.length > 0 && formData.event && formData.eventId && formData.consent;

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
          Share your UTM MSA event photos and videos with the community. Choose whether to be credited or remain anonymous.
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
            {isProcessingFiles ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 mb-2">Processing files...</p>
                <p className="text-sm text-gray-500">Converting HEIC images for preview</p>
              </>
            ) : (
              <>
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
                  Supports: Images (JPG, PNG, HEIC) and Videos (MP4, MOV, AVI) up to 100MB
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.heic,.heif"
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
                      file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log(`Preview failed for ${file.file.name}, showing placeholder`);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    {/* Fallback for images that can't be previewed (like HEIC) */}
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-2" style={{display: file.type === 'image' && !file.preview ? 'flex' : 'none'}}>
                      <Image className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500 font-medium">{file.file.name}</p>
                      <p className="text-xs text-gray-400">{(file.file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
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
          
          <div className="space-y-6">
            {/* Instagram Handle */}
            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-2">
                Instagram Handle
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
                <input
                  type="text"
                  id="instagram"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="your_instagram_handle"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Optional - Only provide if you'd like to be tagged when your content is featured on our social media. Only letters, numbers, dots, and underscores allowed (max 30 characters).
              </p>
            </div>

            {/* Anonymous Mode */}
            <div>
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="isAnon"
                  checked={formData.isAnon}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Submit anonymously
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Check this if you don't want your name to appear if your content is featured in the gallery
                  </p>
                </div>
              </label>
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
                        onClick={() => handleEventSelect(event.name, event.id)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900">{event.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              event.status === 'ONGOING' 
                                ? 'bg-green-100 text-green-800' 
                                : event.status === 'PAST'
                                ? 'bg-yellow-100 text-yellow-800'
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
                I consent to UTM MSA using my submitted media for promotional purposes on social media platforms. I understand that my content may be featured on UTM MSA's social media accounts, and I agree to the terms of use. I have permission to share these files from everyone in the attached media. *
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
