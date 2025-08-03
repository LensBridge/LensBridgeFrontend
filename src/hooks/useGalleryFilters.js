import { useState, useEffect, useCallback } from 'react';

export const useGalleryFilters = (fetchGalleryData) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const handleSearchChange = useCallback((value) => {
    setSearchInput(value);
  }, []);

  const handleFilterChange = useCallback((filter) => {
    setSelectedFilter(filter);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedFilter('all');
  }, []);

  return {
    searchTerm,
    searchInput,
    selectedFilter,
    handleSearchChange,
    handleFilterChange,
    clearFilters
  };
};
