import { useState, useCallback } from 'react';
import heic2any from 'heic2any';
import { api } from '../api/client';

export const useGallery = () => {
  const [galleryItems, setGalleryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);

  // HEIC conversion utility
  const convertHeicToJpeg = useCallback(async (imageUrl) => {
    try {
      console.log('Converting HEIC image:', imageUrl);
      
      if (!heic2any) {
        console.warn('heic2any library not available, returning original URL');
        return imageUrl;
      }
      
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      if (!blob.type.includes('heic') && !blob.type.includes('heif')) {
        console.log('Not a HEIC file, returning original URL');
        return imageUrl;
      }
      
      const convertedBlob = await heic2any({
        blob: blob,
        toType: 'image/jpeg',
        quality: 0.8
      });
      
      const convertedUrl = URL.createObjectURL(convertedBlob);
      console.log('HEIC conversion successful:', convertedUrl);
      
      return convertedUrl;
    } catch (error) {
      console.error('Error converting HEIC image:', error);
      return imageUrl;
    }
  }, []);

  // Process gallery items to convert HEIC images and map backend fields
  const processGalleryItems = useCallback(async (items) => {
    const processedItems = await Promise.all(
      items.map(async (item) => {
        // Map backend response fields to gallery format
        const mappedItem = {
          id: item.uuid || item.id,
          src: item.secureUrl || item.src, // Full-size URL
          thumbnail: item.thumbnail, // Thumbnail URL from backend
          type: item.contentType === 'VIDEO' ? 'video' : 'image',
          title: item.uploadDescription || item.fileName || 'Untitled',
          event: item.eventName || 'Event',
          author: item.anon ? 'Anonymous' : `${item.uploaderFirstName || ''} ${item.uploaderLastName || ''}`.trim() || 'Unknown',
          date: item.createdDate,
          featured: item.featured || false,
          approved: item.approved || false
        };
        
        // Convert HEIC images if needed (for the full-size src)
        if (mappedItem.type === 'image' && mappedItem.src && (mappedItem.src.toLowerCase().includes('.heic') || mappedItem.src.toLowerCase().includes('.heif'))) {
          const convertedSrc = await convertHeicToJpeg(mappedItem.src);
          return { ...mappedItem, src: convertedSrc, originalSrc: mappedItem.src };
        }
        
        return mappedItem;
      })
    );
    
    return processedItems;
  }, [convertHeicToJpeg]);

  const fetchGalleryData = useCallback(async (page = 0, size = 12, searchTerm = '', selectedFilter = 'all') => {
    try {
      // Show appropriate loading state
      if (galleryItems.length === 0) {
        setIsLoading(true);
      } else {
        setIsPaginating(true);
      }
      setError(null);
      
      // NOTE: `searchTerm` and `selectedFilter` are accepted by this hook but not
      // sent. GET /api/gallery binds only Pageable (GalleryController.getGalleryUploads
      // -> GalleryService.getAllApprovedGalleryItems), so the previous `search`,
      // `featured` and `type` query params were discarded by the server, and nothing
      // filters client-side either. Search and the featured/images/videos filters
      // therefore do not work today; making them work needs backend support first.
      const { data, error } = await api.GET('/api/gallery', {
        params: { query: { page, size, sort: ['createdDate,desc'] } }
      });

      if (error) {
        throw new Error(`Failed to fetch gallery: ${error.message ?? 'unknown error'}`);
      }

      // Handle Spring Boot Page response
      if (data.content) {
        const processedItems = await processGalleryItems(data.content);
        setGalleryItems(processedItems);
        setCurrentPage(data.number);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
        setPageSize(data.size);
      } else {
        // Fallback for non-paginated response
        const items = Array.isArray(data) ? data : data.items || [];
        const processedItems = await processGalleryItems(items);
        setGalleryItems(processedItems);
        setTotalElements(processedItems.length);
        setTotalPages(1);
      }
      
    } catch (err) {
      console.error('Error fetching gallery data:', err);
      setError(err.message || 'Failed to load gallery');
    } finally {
      setIsLoading(false);
      setIsPaginating(false);
    }
  }, [processGalleryItems]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [totalPages]);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setCurrentPage(0);
  }, []);

  // Enhanced cleanup with cache management
  const cleanupUrls = useCallback(() => {
    galleryItems.forEach(item => {
      if (item.src && item.src.startsWith('blob:')) {
        URL.revokeObjectURL(item.src);
      }
    });
  }, [galleryItems]);

  return {
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
  };
};
