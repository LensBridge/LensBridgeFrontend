import { useState, useCallback } from 'react';
import heic2any from 'heic2any';
import API_CONFIG from '../config/api';

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

  // Process gallery items to convert HEIC images
  const processGalleryItems = useCallback(async (items) => {
    const processedItems = await Promise.all(
      items.map(async (item) => {
        if (item.type === 'image' && (item.src.toLowerCase().includes('.heic') || item.src.toLowerCase().includes('.heif'))) {
          const convertedSrc = await convertHeicToJpeg(item.src);
          return { ...item, src: convertedSrc, originalSrc: item.src };
        }
        return item;
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
      
      // Build URL with pagination parameters
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
        sort: 'createdDate,desc'
      });
      
      // Add filter parameters
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      if (selectedFilter !== 'all') {
        if (selectedFilter === 'featured') {
          params.append('featured', 'true');
        } else if (selectedFilter === 'images') {
          params.append('type', 'image');
        } else if (selectedFilter === 'videos') {
          params.append('type', 'video');
        }
      }
      
      console.log('Fetching gallery data from API');
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GALLERY}?${params}`, {
        headers: API_CONFIG.HEADERS
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch gallery: ${response.status}`);
      }
      
      const data = await response.json();
      
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
