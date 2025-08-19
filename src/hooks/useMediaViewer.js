import { useState, useEffect, useCallback } from 'react';

export const useMediaViewer = (filteredItems) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const openViewer = useCallback((item) => {
    const index = filteredItems.findIndex(i => i.id === item.id);
    setCurrentIndex(index);
    setSelectedItem(item);
    setIsVideoPlaying(false);
  }, [filteredItems]);

  const closeViewer = useCallback(() => {
    setSelectedItem(null);
    setIsVideoPlaying(false);
    
    // Clean up any HEIC object URLs to prevent memory leaks
    if (selectedItem && selectedItem.src && selectedItem.src.startsWith('blob:')) {
      URL.revokeObjectURL(selectedItem.src);
    }
  }, [selectedItem]);

  const navigateViewer = useCallback((direction) => {
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % filteredItems.length
      : (currentIndex - 1 + filteredItems.length) % filteredItems.length;
    
    setCurrentIndex(newIndex);
    setSelectedItem(filteredItems[newIndex]);
    setIsVideoPlaying(false);
  }, [currentIndex, filteredItems]);

  const toggleVideoPlayback = useCallback(() => {
    const video = document.querySelector('.viewer-video');
    if (video) {
      if (isVideoPlaying) {
        video.pause();
        setIsVideoPlaying(false);
      } else {
        video.play();
        setIsVideoPlaying(true);
      }
    }
  }, [isVideoPlaying]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedItem) return;
      
      switch (e.key) {
        case 'Escape':
          closeViewer();
          break;
        case 'ArrowLeft':
          navigateViewer('prev');
          break;
        case 'ArrowRight':
          navigateViewer('next');
          break;
        case ' ':
          if (selectedItem.type === 'video') {
            e.preventDefault();
            toggleVideoPlayback();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, closeViewer, navigateViewer, toggleVideoPlayback]);

  return {
    selectedItem,
    currentIndex,
    isVideoPlaying,
    openViewer,
    closeViewer,
    navigateViewer,
    toggleVideoPlayback
  };
};
