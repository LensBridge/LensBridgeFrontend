import { useState, useCallback } from 'react';

export const useUploadForm = () => {
  const [formData, setFormData] = useState({
    instagram: '',
    event: '',
    eventId: '',
    description: '',
    isAnon: false,
    consent: false,
  });

  const [validationErrors, setValidationErrors] = useState({});

  const validateInstagram = (value) => {
    if (!value) return null; // Optional field
    
    const instagramPattern = /^[a-zA-Z0-9._]*$/;
    if (!instagramPattern.test(value)) {
      return 'Only letters, numbers, dots, and underscores allowed';
    }
    
    if (value.length > 30) {
      return 'Instagram handle must be 30 characters or less';
    }
    
    return null;
  };

  const validateForm = useCallback(() => {
    const errors = {};

    // Instagram validation (only if not anonymous)
    if (!formData.isAnon) {
      const instagramError = validateInstagram(formData.instagram);
      if (instagramError) {
        errors.instagram = instagramError;
      }
    }

    // Required fields
    if (!formData.eventId) {
      errors.event = 'Please select an event';
    }

    if (!formData.consent) {
      errors.consent = 'You must agree to the terms of use';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const updateField = useCallback((field, value) => {
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Special handling for Instagram field
    if (field === 'instagram') {
      const instagramPattern = /^[a-zA-Z0-9._]*$/;
      if (value && (!instagramPattern.test(value) || value.length > 30)) {
        return; // Don't update if invalid
      }
    }

    // Special handling for anonymous mode
    if (field === 'isAnon' && value === true) {
      // Clear Instagram field when enabling anonymous mode
      setFormData(prev => ({
        ...prev,
        [field]: value,
        instagram: '', // Clear Instagram handle
      }));
      // Also clear any Instagram validation errors
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.instagram;
        return newErrors;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  }, [validationErrors]);

  const resetForm = useCallback(() => {
    setFormData({
      instagram: '',
      event: '',
      eventId: '',
      description: '',
      isAnon: false,
      consent: false,
    });
    setValidationErrors({});
  }, []);

  const isFormValid = formData.eventId && formData.consent;

  return {
    formData,
    validationErrors,
    updateField,
    validateForm,
    resetForm,
    isFormValid,
  };
};
