/**
 * Direct-to-R2 Upload Service
 * Handles direct file uploads to Cloudflare R2 storage bypassing the backend server
 */

import API_CONFIG from '../config/api';

export class DirectUploadService {
  constructor(makeAuthenticatedRequest) {
    this.makeAuthenticatedRequest = makeAuthenticatedRequest;
    this.baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD}`;
  }

  /**
   * Get user's upload limits based on their role
   * @returns {Promise<Object>} Upload limits object
   */
  async getUploadLimits() {
    const response = await this.makeAuthenticatedRequest(
      `${this.baseUrl}/limits`,
      {
        headers: {
          ...API_CONFIG.HEADERS
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get upload limits: ${errorText}`);
    }
    
    return response.json();
  }

  /**
   * Calculate SHA-256 hash of a file for integrity verification
   * @param {File} file - The file to calculate hash for
   * @returns {Promise<string>} SHA-256 hash in hex format
   */
  async calculateSHA256(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get presigned URL for direct upload to R2
   * @param {string} eventId - Event ID to associate upload with
   * @param {string} filename - Original filename
   * @param {string} contentType - MIME type
   * @param {number} fileSize - File size in bytes
   * @param {string} expectedSha256 - SHA-256 hash for verification
   * @returns {Promise<Object>} Presigned URL response
   */
  async getPresignedUrl(eventId, filename, contentType, fileSize, expectedSha256) {
    const params = new URLSearchParams({
      filename,
      contentType,
      fileSize: fileSize.toString(),
      expectedSha256
    });

    const response = await this.makeAuthenticatedRequest(
      `${this.baseUrl}/${eventId}/direct/presign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...API_CONFIG.HEADERS
        },
        body: params
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to get presigned URL: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Upload file directly to R2 using presigned URL
   * @param {File} file - File to upload
   * @param {string} uploadUrl - Presigned upload URL
   * @param {Function} onProgress - Progress callback function
   * @returns {Promise<void>}
   */
  async uploadToR2(file, uploadUrl, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload failed: Request timeout'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      
      // Set timeout to 5 minutes for large files
      xhr.timeout = 5 * 60 * 1000;
      
      xhr.send(file);
    });
  }

  /**
   * Complete the upload process by creating the Upload record
   * @param {string} eventId - Event ID
   * @param {string} objectKey - R2 object key
   * @param {string} filename - Original filename
   * @param {string} contentType - MIME type
   * @param {number} fileSize - File size in bytes
   * @param {string} expectedSha256 - SHA-256 hash
   * @param {Object} options - Additional upload options
   * @returns {Promise<Object>} Upload completion response
   */
  async completeUpload(eventId, objectKey, filename, contentType, fileSize, expectedSha256, options = {}) {
    const params = new URLSearchParams({
      objectKey,
      filename,
      contentType,
      fileSize: fileSize.toString(),
      expectedSha256,
      anon: (options.anon || false).toString()
    });

    if (options.description) {
      params.append('description', options.description);
    }
    if (options.instagramHandle) {
      params.append('instagramHandle', options.instagramHandle);
    }

    const response = await this.makeAuthenticatedRequest(
      `${this.baseUrl}/${eventId}/direct/complete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...API_CONFIG.HEADERS
        },
        body: params
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Failed to complete upload: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Upload a single file using the direct-to-R2 flow
   * @param {File} file - File to upload
   * @param {string} eventId - Event ID to associate upload with
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(file, eventId, options = {}) {
    const {
      description,
      instagramHandle,
      anon = false,
      onProgress = () => {},
      onStageChange = () => {}
    } = options;

    try {
      // Stage 1: Get upload limits and validate
      onStageChange('Validating file...');
      onProgress(5);
      
      const limits = await this.getUploadLimits();
      
      if (file.size > limits.maxSizeBytes) {
        throw new Error(
          `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds limit (${limits.maxSizeMB}MB) for role ${limits.role}`
        );
      }
      
      if (!limits.allowedContentTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} is not allowed`);
      }

      // Stage 2: Calculate file hash
      onStageChange('Calculating file integrity hash...');
      onProgress(10);
      
      const sha256Hash = await this.calculateSHA256(file);
      onProgress(20);

      // Stage 3: Get presigned URL
      onStageChange('Requesting upload authorization...');
      onProgress(25);
      
      const presignResponse = await this.getPresignedUrl(
        eventId, 
        file.name, 
        file.type, 
        file.size, 
        sha256Hash
      );
      onProgress(30);

      // Stage 4: Upload directly to R2
      onStageChange('Uploading file...');
      
      await this.uploadToR2(file, presignResponse.uploadUrl, (uploadProgress) => {
        // Map upload progress to 30-85% of total progress
        const mappedProgress = 30 + Math.round(uploadProgress * 0.55);
        onProgress(mappedProgress);
      });
      
      onProgress(85);

      // Stage 5: Complete the upload
      onStageChange('Finalizing upload...');
      onProgress(90);
      
      const completeResponse = await this.completeUpload(
        eventId,
        presignResponse.objectKey,
        file.name,
        file.type,
        file.size,
        sha256Hash,
        { description, instagramHandle, anon }
      );
      
      onStageChange('Upload complete!');
      onProgress(100);

      return {
        ...completeResponse,
        fileName: file.name,
        fileSize: file.size
      };

    } catch (error) {
      onStageChange('Upload failed');
      throw error;
    }
  }

  /**
   * Upload multiple files sequentially
   * @param {File[]} files - Array of files to upload
   * @param {string} eventId - Event ID to associate uploads with
   * @param {Object} options - Upload options
   * @returns {Promise<Object[]>} Array of upload results
   */
  async uploadFiles(files, eventId, options = {}) {
    const { onOverallProgress = () => {}, onFileProgress = () => {} } = options;
    const results = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIndex = i + 1;

      try {
        const result = await this.uploadFile(file, eventId, {
          ...options,
          onProgress: (progress) => {
            onFileProgress(fileIndex, file.name, progress);
            
            // Calculate overall progress
            const completedFiles = i;
            const currentFileProgress = progress / 100;
            const overallProgress = Math.round(
              ((completedFiles + currentFileProgress) / totalFiles) * 100
            );
            onOverallProgress(overallProgress);
          },
          onStageChange: (stage) => {
            onFileProgress(fileIndex, file.name, null, stage);
          }
        });

        results.push({ success: true, file: file.name, result });

      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        results.push({ 
          success: false, 
          file: file.name, 
          error: error.message 
        });
      }
    }

    return results;
  }
}

export default DirectUploadService;
