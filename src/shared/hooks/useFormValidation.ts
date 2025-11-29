'use client';

import { useState, useCallback } from 'react';

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
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
        const phoneRegex = /^[\d\s+\-()]{10,20}$/;
        if (!phoneRegex.test(value)) {
          return 'Please enter a valid phone number';
        }
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        return `${name} format is invalid`;
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




