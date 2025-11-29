'use client';

import { useState, useCallback } from 'react';

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  pincode?: boolean;
  noFutureDate?: boolean;
  noPastDate?: boolean;
  custom?: (value: any) => string | undefined;
}

export interface FieldConfig {
  [key: string]: ValidationRules;
}

export interface FormErrors {
  [key: string]: string;
}

export interface UseFormValidationReturn {
  errors: FormErrors;
  validateField: (name: string, value: any, rules: ValidationRules) => string | undefined;
  validateForm: (data: any, config: FieldConfig) => boolean;
  clearError: (name: string) => void;
  clearAllErrors: () => void;
  setError: (name: string, message: string) => void;
}

export function useFormValidation(): UseFormValidationReturn {
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback((name: string, value: any, rules: ValidationRules): string | undefined => {
    // Required check
    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${name} is required`;
    }

    // Skip other validations if empty and not required
    if (!value && !rules.required) {
      return undefined;
    }

    // String validations
    if (typeof value === 'string') {
      // Min length
      if (rules.minLength && value.length < rules.minLength) {
        return `${name} must be at least ${rules.minLength} characters`;
      }

      // Max length
      if (rules.maxLength && value.length > rules.maxLength) {
        return `${name} must be at most ${rules.maxLength} characters`;
      }

      // Email validation
      if (rules.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
      }

      // Phone validation
      if (rules.phone) {
        const phoneDigits = value.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
          return 'Please enter a valid 10-digit phone number';
        }
      }

      // Pincode validation (Indian - 6 digits)
      if (rules.pincode) {
        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if (!pincodeRegex.test(value)) {
          return 'Please enter a valid 6-digit Indian pincode';
        }
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        return `${name} format is invalid`;
      }
    }

    // Date validations
    if (value && (rules.noFutureDate || rules.noPastDate)) {
      const selectedDate = new Date(value);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (rules.noFutureDate && selectedDate > now) {
        return 'Date cannot be in the future';
      }

      if (rules.noPastDate && selectedDate < now) {
        return 'Date cannot be in the past';
      }
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return undefined;
  }, []);

  const validateForm = useCallback((data: any, config: FieldConfig): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(config).forEach((fieldName) => {
      const fieldRules = config[fieldName];
      if (fieldRules) {
        const error = validateField(fieldName, data[fieldName], fieldRules);
        if (error) {
          newErrors[fieldName] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validateField]);

  const clearError = useCallback((name: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setError = useCallback((name: string, message: string) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearError,
    clearAllErrors,
    setError,
  };
}




