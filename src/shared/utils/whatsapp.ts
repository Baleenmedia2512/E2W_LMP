/**
 * WhatsApp Integration Utility
 * Handles opening WhatsApp on mobile and desktop with proper fallback
 */

/**
 * Validate and format phone number for WhatsApp
 * Extracts last 10 digits and validates
 */
export function formatPhoneForWhatsApp(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Extract last 10 digits
  const last10Digits = digitsOnly.slice(-10);
  
  // Validate: must be exactly 10 digits
  if (last10Digits.length !== 10) {
    return null;
  }
  
  return last10Digits;
}

/**
 * Get default WhatsApp message template
 */
export function getDefaultWhatsAppMessage(): string {
  return 'Hello, this is regarding your enquiry.';
}

/**
 * Check if user is on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Open WhatsApp with pre-filled message
 * AC-2: Mobile → Opens WhatsApp app directly (not WhatsApp Web)
 * AC-3: Desktop → Tries WhatsApp Desktop, falls back to WhatsApp Web
 * AC-5: Uses correct URL schemes
 */
export function openWhatsApp(phone: string, customMessage?: string): boolean {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  
  // AC-7: Error handling for invalid phone numbers
  if (!formattedPhone) {
    return false;
  }
  
  const messageText = customMessage || getDefaultWhatsAppMessage();
  const encodedMessage = encodeURIComponent(messageText);
  
  // Use phone number with India country code (91)
  const whatsappPhone = '91' + formattedPhone;
  
  if (isMobileDevice()) {
    // AC-2 & AC-5: Mobile → Use whatsapp:// scheme to open app directly
    const mobileUrl = `whatsapp://send?phone=${whatsappPhone}&text=${encodedMessage}`;
    window.location.href = mobileUrl;
  } else {
    // AC-3 & AC-5: Desktop → Use wa.me for better compatibility
    // wa.me automatically redirects to desktop app if installed, otherwise web
    const desktopUrl = `https://wa.me/${whatsappPhone}?text=${encodedMessage}`;
    window.open(desktopUrl, '_blank');
  }
  
  return true;
}

/**
 * Check if phone number is valid for WhatsApp
 */
export function isValidWhatsAppPhone(phone: string): boolean {
  return formatPhoneForWhatsApp(phone) !== null;
}
