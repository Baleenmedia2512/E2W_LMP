// Validation utilities for form inputs

export const validateEmail = (email: string, isRequired: boolean = false): { isValid: boolean; error?: string } => {
  // Allow empty if not required
  if (!email.trim()) {
    if (isRequired) {
      return { isValid: false, error: 'Email is required' };
    }
    return { isValid: true };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

export const validatePhone = (phone: string, isRequired: boolean = true): { isValid: boolean; error?: string } => {
  // Allow empty if not required
  if (!phone.trim()) {
    if (isRequired) {
      return { isValid: false, error: 'Phone number is required' };
    }
    return { isValid: true };
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check for Indian phone numbers (10 digits)
  if (digitsOnly.length === 10) {
    return { isValid: true };
  }
  
  // Check for international format with country code
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return { isValid: true };
  }
  
  return { isValid: false, error: 'Please enter a valid phone number (10 digits)' };
};

export const validatePincode = (pincode: string, country: string = 'IN', isRequired: boolean = false): { isValid: boolean; error?: string } => {
  // Allow empty if not required
  if (!pincode.trim()) {
    if (isRequired) {
      return { isValid: false, error: 'Pincode is required' };
    }
    return { isValid: true };
  }
  
  // Indian pincode validation (6 digits)
  if (country === 'IN') {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!pincodeRegex.test(pincode)) {
      return { isValid: false, error: 'Please enter a valid 6-digit Indian pincode' };
    }
  }
  
  return { isValid: true };
};

export const validateRequired = (value: string, fieldName: string): { isValid: boolean; error?: string } => {
  if (!value || !value.trim()) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
};

export const validateLength = (
  value: string, 
  min: number, 
  max: number, 
  fieldName: string
): { isValid: boolean; error?: string } => {
  const length = value.trim().length;
  
  if (length < min) {
    return { isValid: false, error: `${fieldName} must be at least ${min} characters` };
  }
  
  if (length > max) {
    return { isValid: false, error: `${fieldName} must not exceed ${max} characters` };
  }
  
  return { isValid: true };
};

export const validateFutureDate = (date: string, time?: string): { isValid: boolean; error?: string } => {
  const selectedDateTime = time ? new Date(`${date}T${time}`) : new Date(date);
  const now = new Date();
  
  if (selectedDateTime <= now) {
    return { isValid: false, error: 'Date and time must be in the future' };
  }
  
  return { isValid: true };
};

export const validatePastDate = (date: string): { isValid: boolean; error?: string } => {
  const selectedDate = new Date(date);
  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today
  
  if (selectedDate > now) {
    return { isValid: false, error: 'Date cannot be in the future' };
  }
  
  return { isValid: true };
};

export const sanitizeInput = (input: string, maxLength?: number): string => {
  let sanitized = input.trim();
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
};
