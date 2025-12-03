/**
 * Phone Number Utilities - US-7
 * Handles phone number formatting, validation, and cleaning for Indian mobile numbers
 */

/**
 * Clean phone number to last 10 digits only
 * Removes country code, spaces, hyphens, and other formatting
 * 
 * @param phone - Raw phone number (can include +91, 0091, 91, spaces, hyphens)
 * @returns Last 10 digits or original if less than 10 digits
 * 
 * Examples:
 * - "+91 6759795759" → "6759795759"
 * - "091-98765-43210" → "9876543210"
 * - "9876543210" → "9876543210"
 * - "+91 7788995566" → "7788995566"
 */
export function cleanPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Extract last 10 digits
  const last10Digits = digitsOnly.slice(-10);
  
  return last10Digits;
}

/**
 * Format phone number for UI display
 * Always shows only the last 10 digits
 * 
 * @param phone - Raw phone number
 * @returns Last 10 digits formatted for display
 * 
 * AC-1: UI Display Format
 * Example: "+91 6759795759" displays as "6759795759"
 */
export function formatPhoneForDisplay(phone: string | null | undefined): string {
  return cleanPhoneNumber(phone);
}

/**
 * Format phone number for dialer (tel: link or phone app)
 * Returns ONLY the last 10 digits without any country code or formatting
 * 
 * @param phone - Raw phone number
 * @returns Last 10 digits for dialer, or null if invalid
 * 
 * AC-2: Dialer Format
 * Dialer must NEVER receive +91, spaces, or extra characters
 * Example: Stored "+91 9876543210" → Dialer receives "9876543210"
 */
export function formatPhoneForDialer(phone: string | null | undefined): string | null {
  const cleaned = cleanPhoneNumber(phone);
  
  // Validate: must be exactly 10 digits
  if (cleaned.length !== 10) {
    return null;
  }
  
  return cleaned;
}

/**
 * Validate if phone number is valid (has at least 10 digits after cleaning)
 * 
 * @param phone - Raw phone number
 * @returns true if valid (10 digits after cleaning), false otherwise
 * 
 * AC-6: Error Handling
 * If cleaned number is less than 10 digits, it's invalid
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  const cleaned = cleanPhoneNumber(phone);
  return cleaned.length === 10;
}

/**
 * Get validation error message for invalid phone
 * 
 * @param phone - Raw phone number
 * @returns Error message or null if valid
 */
export function getPhoneValidationError(phone: string | null | undefined): string | null {
  if (!phone || !phone.trim()) {
    return 'Phone number is required';
  }
  
  const cleaned = cleanPhoneNumber(phone);
  
  if (cleaned.length === 0) {
    return 'Phone number must contain digits';
  }
  
  if (cleaned.length < 10) {
    return 'Invalid phone number';
  }
  
  if (cleaned.length === 10) {
    return null; // Valid
  }
  
  // If more than 10 digits, we'll use last 10, so it's still valid
  return null;
}

/**
 * Normalize phone number for storage
 * Stores only the last 10 digits in the database
 * 
 * @param phone - Raw phone number from user input or API
 * @returns Cleaned 10-digit number for database storage
 * 
 * AC-3: Auto-Imported Leads
 * AC-4: Manual Entry
 * System must clean and store only last 10 digits
 */
export function normalizePhoneForStorage(phone: string | null | undefined): string {
  return cleanPhoneNumber(phone);
}
