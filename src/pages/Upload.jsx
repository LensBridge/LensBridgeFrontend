import { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload as UploadIcon,
  X,
  Image,
  Video,
  Check,
  AlertCircle,
  ChevronDown,
  RefreshCw,
  Users,
  Calendar,
} from "lucide-react";
import API_CONFIG from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useFileUpload } from "../hooks/useFileUpload";
import { useUploadForm } from "../hooks/useUploadForm";

function Upload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const [errors, setErrors] = useState({
    fetch: null,
    upload: null,
    files: []
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef(null);
  const { makeAuthenticatedRequest, user, isAuthenticated } = useAuth();
  
  // Custom hooks
  const { 
    files, 
    isProcessing: isProcessingFiles, 
    fileErrors, 
    addFiles, 
    removeFile, 
    clearFiles 
  } = useFileUpload();
  
  const { 
    formData, 
    validationErrors, 
    updateField, 
    validateForm, 
    resetForm, 
    isFormValid: isFormValidBase 
  } = useUploadForm();

  const fetchEventsFromAPI = async () => {
    try {
      setLoadingEvents(true);
      setErrors(prev => ({ ...prev, fetch: null }));

      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EVENTS}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const eventsData = await response.json();
      setEvents(eventsData);
    } catch (error) {
      console.error("Error fetching events:", error);
      setErrors(prev => ({ 
        ...prev, 
        fetch: "Unable to load events. Please refresh the page to try again." 
      }));
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fetch events when component mounts
  useEffect(() => {
    fetchEventsFromAPI();
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
    await addFiles(droppedFiles);
  };

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    await addFiles(selectedFiles);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    updateField(name, type === "checkbox" ? checked : value);
  };

  const handleEventSelect = (eventName, eventId) => {
    updateField('event', eventName);
    updateField('eventId', eventId);
    setEventDropdownOpen(false);
  };

  const formatDate = (dateString) => {
    // Support ISO datetime strings with timezone (e.g. 2025-07-16T04:00:00.000+00:00)
    // If dateString is just a date, fallback to EST
    let date;
    if (/T\d{2}:\d{2}:\d{2}/.test(dateString)) {
      date = new Date(dateString);
    } else {
      date = new Date(dateString + "T00:00:00-05:00");
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/New_York",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any previous errors
    setErrors(prev => ({ ...prev, upload: null }));
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    if (files.length === 0) {
      setErrors(prev => ({ ...prev, upload: "Please select at least one file to upload." }));
      return;
    }

    // Validate authentication before starting upload
    if (!isAuthenticated || !user) {
      setErrors(prev => ({ ...prev, upload: "Authentication expired. Please sign in again." }));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create FormData for multipart request
      const uploadData = new FormData();

      // Add files with corrected MIME types
      files.forEach((file) => {
        const fileName = file.file.name.toLowerCase();
        const isHeic = fileName.endsWith(".heic") || fileName.endsWith(".heif");

        // Fix MIME type for HEIC files if browser didn't set it correctly
        if (
          isHeic &&
          (file.file.type === "application/octet-stream" ||
            file.file.type === "" ||
            !file.file.type.startsWith("image/"))
        ) {
          const correctedFile = new File([file.file], file.file.name, {
            type: "image/heic",
            lastModified: file.file.lastModified,
          });
          uploadData.append("files", correctedFile);
        } else {
          uploadData.append("files", file.file);
        }
      });

      // Add form fields
      if (formData.instagram && !formData.isAnon) {
        uploadData.append("instagramHandle", formData.instagram);
      }
      if (formData.description) {
        uploadData.append("description", formData.description);
      }
      uploadData.append("anon", formData.isAnon);

      const response = await makeAuthenticatedRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD}/${formData.eventId}/batch`,
        {
          method: "POST",
          body: uploadData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Upload failed";
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      setUploadComplete(true);

      // Clear form after successful upload
      setTimeout(() => {
        clearFiles();
        resetForm();
        setUploadComplete(false);
      }, 3000);
      
    } catch (error) {
      console.error("Upload error:", error);
      setErrors(prev => ({ ...prev, upload: error.message }));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const isFormValid = isFormValidBase && files.length > 0;

  if (uploadComplete) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-blue-50 to-green-50 opacity-60 rounded-3xl"></div>
          <div className="relative bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200 p-12 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-blue-600 rounded-full blur-lg opacity-20"></div>
              <div className="relative bg-gradient-to-r from-green-600 to-blue-600 p-6 rounded-full w-fit mx-auto shadow-xl">
                <Check className="h-12 w-12 text-white" />
              </div>
            </div>
            
            <div className="mb-6">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg mb-4">
                <Check className="h-4 w-4" />
                <span>Upload Complete</span>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-transparent bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text mb-6">
              Upload Successful!
            </h2>
            
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              Thank you for sharing your memories! We'll review your submission
              and may feature it on our social media.
            </p>
            
            <button
              onClick={() => setUploadComplete(false)}
              className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 py-4 rounded-xl hover:scale-105 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl inline-flex items-center space-x-2"
            >
              <UploadIcon className="h-5 w-5" />
              <span>Upload More</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="relative overflow-hidden mb-12">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50 to-blue-50 opacity-60"></div>
        <div className="relative text-center py-16">
          <div className="mb-6">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              <UploadIcon className="h-4 w-4" />
              <span>Share Your Memories</span>
            </div>
          </div>
          
          {/* Bismillah */}
          <div className="mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="/Bismillah_Calligraphy1.svg"
                alt="Bismillah - In the name of Allah, the Most Gracious, the Most Merciful"
                className="h-16 md:h-20 lg:h-24 w-auto mx-auto opacity-80"
              />
            </div>
            <p className="text-sm md:text-base text-gray-600 font-medium italic">
              In the name of Allah, the Most Gracious, the Most Merciful
            </p>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-gradient-to-r from-blue-600 via-green-600 to-blue-600 bg-clip-text mb-6">
            Upload Your Media
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Share your UTM MSA event photos and videos with the community. 
            <span className="block mt-2 text-base text-gray-500">
              Choose whether to be credited or remain anonymous.
            </span>
          </p>

          {/* Visual Elements */}
          <div className="flex justify-center items-center space-x-8 mt-8 opacity-60">
            <div className="bg-gradient-to-br from-blue-100 to-green-100 p-3 rounded-2xl">
              <Image className="h-6 w-6 text-blue-600" />
            </div>
            <div className="bg-gradient-to-br from-green-100 to-blue-100 p-3 rounded-2xl">
              <Video className="h-6 w-6 text-green-600" />
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-green-100 p-3 rounded-2xl">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Error Display */}
        {(errors.fetch || errors.upload || fileErrors.length > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  {errors.fetch ? "Loading Error" : "Upload Error"}
                </h3>
                {errors.fetch && (
                  <div className="mb-3">
                    <p className="text-sm text-red-700">{errors.fetch}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setErrors(prev => ({ ...prev, fetch: null }));
                        fetchEventsFromAPI();
                      }}
                      className="mt-2 inline-flex items-center space-x-1 text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}
                {errors.upload && (
                  <p className="text-sm text-red-700 mb-2">{errors.upload}</p>
                )}
                {fileErrors.length > 0 && (
                  <div>
                    <p className="text-sm text-red-700 mb-1">File errors:</p>
                    <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                      {fileErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            {validationErrors.event && (
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {validationErrors.event}
              </p>
            )}
          </div>
        )}

        {/* File Upload Area */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-xl">
              <UploadIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Select Files
            </h2>
          </div>

          <div
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
              isDragging
                ? "border-blue-500 bg-gradient-to-br from-blue-50 to-green-50 scale-105"
                : "border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isProcessingFiles ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600 mb-2">Processing files...</p>
                <p className="text-sm text-gray-500">
                  Converting HEIC images for preview
                </p>
              </>
            ) : (
              <>
                <UploadIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  Drag and drop your files here, or{" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 font-medium underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-sm text-gray-500">
                  Supports: Images (JPG, PNG, HEIC) and Videos (MP4, MOV, AVI)
                  up to 100MB
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
              aria-label="Select files to upload"
            />
          </div>

          {files.length > 0 && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {files.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl">
                    {file.type === "image" ? (
                      file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log(
                              `Preview failed for ${file.file.name}, showing placeholder`
                            );
                            e.target.style.display = "none";
                            e.target.nextSibling.style.display = "flex";
                          }}
                        />
                      ) : null
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
                        <div className="bg-gradient-to-r from-blue-600 to-green-600 p-3 rounded-xl">
                          <Video className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    )}
                    {/* Fallback for images that can't be previewed (like HEIC) */}
                    <div
                      className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-gray-50 to-blue-50"
                      style={{
                        display:
                          file.type === "image" && !file.preview
                            ? "flex"
                            : "none",
                      }}
                    >
                      <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-xl mb-3">
                        <Image className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-xs text-gray-700 font-semibold truncate w-full">
                        {file.file.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(file.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="text-sm text-gray-700 mt-3 truncate font-medium text-center">
                    {file.file.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Details Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-xl">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              User Details
            </h2>
          </div>

          <div className="space-y-6">
            {/* Anonymous Mode */}
            <div>
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  name="isAnon"
                  checked={formData.isAnon}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Submit anonymously
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Check this if you don't want your name to appear if your
                    content is featured in the gallery
                  </p>
                </div>
              </label>
            </div>

            {/* Instagram Handle */}
            <div>
              <label
                htmlFor="instagram"
                className={`block text-sm font-medium mb-2 transition-colors ${
                  formData.isAnon ? 'text-gray-400' : 'text-gray-700'
                }`}
              >
                Instagram Handle
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors ${
                  formData.isAnon ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  @
                </span>
                <input
                  type="text"
                  id="instagram"
                  name="instagram"
                  value={formData.isAnon ? '' : formData.instagram}
                  onChange={handleInputChange}
                  disabled={formData.isAnon}
                  className={`w-full pl-8 pr-3 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                    formData.isAnon
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : validationErrors.instagram
                      ? 'border-red-300 focus:ring-red-500 bg-red-50'
                      : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300'
                  }`}
                  placeholder={formData.isAnon ? 'Hidden for anonymous submissions' : 'your_instagram_handle'}
                />
              </div>
              {validationErrors.instagram && !formData.isAnon && (
                <p className="text-xs text-red-600 mt-1 flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {validationErrors.instagram}
                </p>
              )}
              <p className={`text-xs mt-1 transition-colors ${
                formData.isAnon ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {formData.isAnon 
                  ? 'Instagram handle is disabled for anonymous submissions'
                  : 'Optional - Only provide if you\'d like to be tagged when your content is featured on our social media. Only letters, numbers, dots, and underscores allowed (max 30 characters).'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Event Details Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-xl">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Event Details
            </h2>
          </div>

          {/* Event Dropdown */}
          <div>
            <label
              htmlFor="event"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Event Name *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setEventDropdownOpen(!eventDropdownOpen)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent bg-white text-left flex items-center justify-between transition-all duration-200 ${
                  validationErrors.event
                    ? 'border-red-300 focus:ring-red-500 bg-red-50'
                    : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300'
                }`}
                disabled={loadingEvents}
              >
                <span
                  className={formData.event ? "text-gray-900" : "text-gray-500"}
                >
                  {loadingEvents
                    ? "Loading events..."
                    : formData.event || "Select an event"}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    eventDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {eventDropdownOpen && !loadingEvents && (
                <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                  {events.length > 0 ? (
                    events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => handleEventSelect(event.name, event.id)}
                        className="w-full px-4 py-3 text-left hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 focus:bg-gradient-to-r focus:from-blue-50 focus:to-green-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900">{event.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">
                              {formatDate(event.date)}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                event.status === "ONGOING"
                                ? "bg-green-100 text-green-800"
                                : event.status === "PAST"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {event.status}
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
            {validationErrors.event && (
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {validationErrors.event}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-300 transition-all duration-200"
              placeholder="Tell us about these photos/videos..."
            />
          </div>

        </div>

        {/* Terms and Consent Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-xl">
              <Check className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Terms & Consent
            </h2>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl border border-blue-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Media Usage Agreement</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p>By uploading your media, you agree that:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>UTM MSA may use your submitted media for promotional purposes on social media platforms</li>
                <li>Your content may be featured on UTM MSA's official social media accounts</li>
                <li>You have permission to share these files from everyone appearing in the media</li>
                <li>You own the rights to the media or have permission to share it</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-start space-x-3 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all duration-200 cursor-pointer">
              <input
                type="checkbox"
                name="consent"
                checked={formData.consent}
                onChange={handleInputChange}
                className={`mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-all duration-200 ${
                  validationErrors.consent ? 'ring-2 ring-red-500 border-red-300' : ''
                }`}
              />
              <div className="flex-1">
                <span className="text-base font-medium text-gray-800">
                  I consent to the Media Usage Agreement *
                </span>
                <p className="text-sm text-gray-600 mt-1">
                  Required - This confirms you understand and agree to how your media may be used
                </p>
              </div>
            </label>
            
            {validationErrors.consent && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  {validationErrors.consent}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Intention Renewal Reminder */}
        <div className="bg-gradient-to-br from-green-50 via-white to-blue-50 rounded-2xl border-2 border-green-200 p-8 text-center shadow-xl">
          <div className="mb-6">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 p-3 rounded-full w-fit mx-auto mb-4">
              <span className="text-2xl">🤲</span>
            </div>
            <h3 className="text-2xl font-bold text-transparent bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text mb-3">
              Intention Reminder
            </h3>
            <p className="text-gray-700 mb-4">
              Before uploading, take a moment to renew your niyyah:
            </p>
            <blockquote className="text-2xl md:text-3xl text-gray-800 font-arabic leading-relaxed mb-2 text-center">
              إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ
              مَا نَوَى{" "}
            </blockquote>
            <p className="text-base text-gray-700 italic mb-2 text-center">
              "The reward of deeds depends upon the intentions and every person
              will get the reward according to what he has intended"{" "}
            </p>
            <p className="text-sm text-gray-600 text-center">
              <a
                href="https://sunnah.com/bukhari:1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline transition-colors"
              >
                Sahih al-Bukhari 1
              </a>
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={!isFormValid || isUploading}
            className={`inline-flex items-center space-x-2 px-8 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl ${
              isFormValid && !isUploading
                ? "bg-gradient-to-r from-blue-600 to-green-600 text-white hover:scale-105"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
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
              <span>
                Please fill in all required fields and upload at least one file
              </span>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

export default Upload;
