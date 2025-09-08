import { useState, useCallback, useRef } from 'react';
import { DirectUploadService } from '../services/DirectUploadService';
import { useAuth } from '../context/AuthContext';

export const useDirectUpload = () => {
  const { makeAuthenticatedRequest } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [fileProgresses, setFileProgresses] = useState({});
  const [uploadLimits, setUploadLimits] = useState(null);
  const [uploadResults, setUploadResults] = useState([]);
  
  const uploadServiceRef = useRef(null);

  // Initialize upload service
  const getUploadService = useCallback(() => {
    if (!uploadServiceRef.current) {
      uploadServiceRef.current = new DirectUploadService(makeAuthenticatedRequest);
    }
    return uploadServiceRef.current;
  }, [makeAuthenticatedRequest]);

  // Fetch upload limits
  const fetchUploadLimits = useCallback(async () => {
    try {
      const service = getUploadService();
      const limits = await service.getUploadLimits();
      setUploadLimits(limits);
      return limits;
    } catch (error) {
      console.error('Failed to fetch upload limits:', error);
      throw error;
    }
  }, [getUploadService]);

  // Validate a single file against upload limits
  const validateFile = useCallback((file, limits) => {
    if (!limits) {
      return { valid: false, error: 'Upload limits not available' };
    }

    // Check file size
    if (file.size > limits.maxSizeBytes) {
      return {
        valid: false,
        error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds limit (${limits.maxSizeMB}MB)`
      };
    }

    // Check content type
    if (!limits.allowedContentTypes.includes(file.type)) {
      // Handle HEIC files that might have wrong MIME type
      const fileName = file.name.toLowerCase();
      const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif');
      
      if (isHeic && limits.allowedContentTypes.includes('image/heic')) {
        return { valid: true, error: null };
      }
      
      return {
        valid: false,
        error: `File type ${file.type} is not supported`
      };
    }

    return { valid: true, error: null };
  }, []);

  // Validate multiple files
  const validateFiles = useCallback((files, limits) => {
    const results = files.map(file => ({
      file,
      ...validateFile(file, limits)
    }));

    const validFiles = results.filter(r => r.valid).map(r => r.file);
    const errors = results.filter(r => !r.valid).map(r => `${r.file.name}: ${r.error}`);

    return { validFiles, errors };
  }, [validateFile]);

  // Upload multiple files
  const uploadFiles = useCallback(async (files, eventId, uploadOptions = {}) => {
    if (!files || files.length === 0) {
      throw new Error('No files to upload');
    }

    if (!eventId) {
      throw new Error('Event ID is required');
    }

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentStage('Preparing upload...');
    setFileProgresses({});
    setUploadResults([]);

    try {
      // Get upload limits if not already fetched
      let limits = uploadLimits;
      if (!limits) {
        limits = await fetchUploadLimits();
      }

      // Validate all files first
      const { validFiles, errors } = validateFiles(files, limits);
      
      if (errors.length > 0) {
        throw new Error(`File validation failed:\n${errors.join('\n')}`);
      }

      if (validFiles.length === 0) {
        throw new Error('No valid files to upload');
      }

      // Prepare files with corrected MIME types for HEIC
      const processedFiles = validFiles.map(file => {
        const fileName = file.name.toLowerCase();
        const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif');
        
        // Fix MIME type for HEIC files if browser didn't set it correctly
        if (isHeic && (file.type === 'application/octet-stream' || file.type === '' || !file.type.startsWith('image/'))) {
          return new File([file], file.name, {
            type: 'image/heic',
            lastModified: file.lastModified,
          });
        }
        
        return file;
      });

      const service = getUploadService();
      
      // Upload files
      const results = await service.uploadFiles(processedFiles, eventId, {
        ...uploadOptions,
        onOverallProgress: setUploadProgress,
        onFileProgress: (fileIndex, fileName, progress, stage) => {
          setFileProgresses(prev => ({
            ...prev,
            [fileName]: { progress, stage, fileIndex }
          }));
          
          if (stage) {
            setCurrentStage(`File ${fileIndex}/${processedFiles.length}: ${stage}`);
          }
        }
      });

      setUploadResults(results);
      
      // Check if any uploads failed
      const failedUploads = results.filter(r => !r.success);
      if (failedUploads.length > 0) {
        const failedFiles = failedUploads.map(f => `${f.file}: ${f.error}`).join('\n');
        throw new Error(`Some uploads failed:\n${failedFiles}`);
      }

      setCurrentStage('All uploads completed successfully!');
      return results;

    } catch (error) {
      setCurrentStage('Upload failed');
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [uploadLimits, fetchUploadLimits, validateFiles, getUploadService]);

  // Upload a single file
  const uploadFile = useCallback(async (file, eventId, uploadOptions = {}) => {
    return uploadFiles([file], eventId, uploadOptions);
  }, [uploadFiles]);

  // Reset upload state
  const resetUploadState = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentStage('');
    setFileProgresses({});
    setUploadResults([]);
  }, []);

  return {
    // State
    isUploading,
    uploadProgress,
    currentStage,
    fileProgresses,
    uploadLimits,
    uploadResults,
    
    // Actions
    uploadFile,
    uploadFiles,
    fetchUploadLimits,
    validateFile,
    validateFiles,
    resetUploadState,
    
    // Utils
    getUploadService
  };
};

export default useDirectUpload;
