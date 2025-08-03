import { useState, useCallback } from 'react';
import heic2any from 'heic2any';

export const useFileUpload = () => {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileErrors, setFileErrors] = useState([]);

  const processFile = async (file) => {
    try {
      const fileName = file.name.toLowerCase();
      const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif');
      
      let preview = null;

      if (isHeic) {
        try {
          if (typeof heic2any !== 'function') {
            throw new Error('HEIC conversion not available');
          }

          const convertedBlob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8,
          });

          const finalBlob = Array.isArray(convertedBlob) 
            ? convertedBlob[0] 
            : convertedBlob;

          if (finalBlob && finalBlob instanceof Blob && finalBlob.size > 0) {
            preview = URL.createObjectURL(finalBlob);
          }
        } catch (conversionError) {
          console.error(`HEIC conversion failed for ${file.name}:`, conversionError);
          // Still allow the file to be uploaded, just without preview
        }
      } else if (file.type.startsWith('image/')) {
        try {
          preview = URL.createObjectURL(file);
        } catch (previewError) {
          console.error(`Failed to create preview for ${file.name}:`, previewError);
        }
      }

      return {
        file,
        id: Date.now() + Math.random(),
        preview,
        type: file.type.startsWith('image/') || isHeic ? 'image' : 'video',
      };
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      return {
        file,
        id: Date.now() + Math.random(),
        preview: null,
        type: file.type.startsWith('image/') || 
               file.name.toLowerCase().endsWith('.heic') ||
               file.name.toLowerCase().endsWith('.heif') ? 'image' : 'video',
      };
    }
  };

  const validateFile = (file) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const fileName = file.name.toLowerCase();
    const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif');
    const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB limit

    if (!(isImage || isVideo || isHeic)) {
      return { valid: false, error: `${file.name}: Unsupported file type` };
    }
    
    if (!isValidSize) {
      return { valid: false, error: `${file.name}: File size exceeds 100MB limit` };
    }

    return { valid: true, error: null };
  };

  const addFiles = useCallback(async (newFiles) => {
    setIsProcessing(true);
    setFileErrors([]);

    const validationResults = newFiles.map(validateFile);
    const validFiles = [];
    const errors = [];

    validationResults.forEach((result, index) => {
      if (result.valid) {
        validFiles.push(newFiles[index]);
      } else {
        errors.push(result.error);
      }
    });

    if (errors.length > 0) {
      setFileErrors(errors);
    }

    if (validFiles.length > 0) {
      try {
        const processedFiles = await Promise.all(
          validFiles.map(processFile)
        );
        
        setFiles(prev => [...prev, ...processedFiles]);
      } catch (error) {
        console.error('Error processing files:', error);
        setFileErrors(prev => [...prev, 'Failed to process some files']);
      }
    }

    setIsProcessing(false);
  }, []);

  const removeFile = useCallback((fileId) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  const clearFiles = useCallback(() => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setFileErrors([]);
  }, [files]);

  return {
    files,
    isProcessing,
    fileErrors,
    addFiles,
    removeFile,
    clearFiles,
  };
};
