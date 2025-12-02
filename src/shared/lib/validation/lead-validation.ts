/**
 * Lead Validation Utilities
 * Centralized validation logic for lead data
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateLeadName = (name: string): ValidationResult => {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (name.trim().length > 100) {
    return { isValid: false, error: 'Name must not exceed 100 characters' };
  }
  
  return { isValid: true };
};

export const validateLeadPhone = (phone: string): ValidationResult => {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Accept 10 digits (local) or 10-15 digits (international with country code)
  if (digitsOnly.length === 10 || (digitsOnly.length >= 10 && digitsOnly.length <= 15)) {
    return { isValid: true };
  }
  
  return { isValid: false, error: 'Phone number must be 10 digits or include valid country code' };
};

export const validateLeadEmail = (email: string, required = false): ValidationResult => {
  if (!email || !email.trim()) {
    if (required) {
      return { isValid: false, error: 'Email is required' };
    }
    return { isValid: true }; // Email is optional
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

export const validateLeadStatus = (status: string): ValidationResult => {
  const validStatuses = ['new', 'followup', 'contacted', 'qualified', 'unreach', 'unqualified', 'won', 'lost'];
  
  if (!validStatuses.includes(status)) {
    return { isValid: false, error: 'Invalid status value' };
  }
  
  return { isValid: true };
};

export const validateLeadSource = (source: string): ValidationResult => {
  if (!source || !source.trim()) {
    return { isValid: false, error: 'Source is required' };
  }
  
  const validSources = ['Website', 'Meta', 'Referral', 'Cold Call', 'WhatsApp', 'Direct'];
  
  if (!validSources.includes(source)) {
    return { isValid: false, error: 'Invalid source value' };
  }
  
  return { isValid: true };
};

export const validatePincode = (pincode: string, required = false): ValidationResult => {
  if (!pincode || !pincode.trim()) {
    if (required) {
      return { isValid: false, error: 'Pincode is required' };
    }
    return { isValid: true }; // Pincode is optional
  }
  
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  if (!pincodeRegex.test(pincode)) {
    return { isValid: false, error: 'Please enter a valid 6-digit pincode' };
  }
  
  return { isValid: true };
};

export const validateLeadData = (data: {
  name: string;
  phone: string;
  email?: string;
  alternatePhone?: string;
  source: string;
  status: string;
  priority?: string;
  pincode?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  const nameValidation = validateLeadName(data.name);
  if (!nameValidation.isValid) {
    errors.name = nameValidation.error!;
  }
  
  const phoneValidation = validateLeadPhone(data.phone);
  if (!phoneValidation.isValid) {
    errors.phone = phoneValidation.error!;
  }
  
  if (data.email) {
    const emailValidation = validateLeadEmail(data.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error!;
    }
  }
  
  if (data.alternatePhone) {
    const altPhoneValidation = validateLeadPhone(data.alternatePhone);
    if (!altPhoneValidation.isValid) {
      errors.alternatePhone = altPhoneValidation.error!;
    }
  }
  
  const sourceValidation = validateLeadSource(data.source);
  if (!sourceValidation.isValid) {
    errors.source = sourceValidation.error!;
  }
  
  const statusValidation = validateLeadStatus(data.status);
  if (!statusValidation.isValid) {
    errors.status = statusValidation.error!;
  }
  
  if (data.priority) {
    const priorityValidation = validateLeadPriority(data.priority);
    if (!priorityValidation.isValid) {
      errors.priority = priorityValidation.error!;
    }
  }
  
  if (data.pincode) {
    const pincodeValidation = validatePincode(data.pincode);
    if (!pincodeValidation.isValid) {
      errors.pincode = pincodeValidation.error!;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Protected fields that cannot be edited by users
 */
export const PROTECTED_LEAD_FIELDS = ['id', 'createdAt', 'createdById'] as const;

/**
 * Check if a field is protected (read-only)
 */
export const isProtectedField = (fieldName: string): boolean => {
  return PROTECTED_LEAD_FIELDS.includes(fieldName as any);
};
