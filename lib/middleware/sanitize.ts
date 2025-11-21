/**
 * Input sanitization utilities
 * Protects against XSS, SQL injection, and other attacks
 */

// Remove HTML tags and encode special characters
export function sanitizeString(input: string | undefined | null): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

// Sanitize email
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  
  const cleaned = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(cleaned) ? cleaned : '';
}

// Sanitize phone number (allow only digits, spaces, +, -, (, ))
export function sanitizePhone(phone: string | undefined | null): string {
  if (!phone) return '';
  
  return phone
    .replace(/[^\d\s+\-()]/g, '')
    .substring(0, 20);
}

// Sanitize object (recursively sanitize all string values)
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// Validate and sanitize lead data
export function sanitizeLeadData(data: any) {
  return {
    name: sanitizeString(data.name),
    email: sanitizeEmail(data.email),
    phone: sanitizePhone(data.phone),
    company: sanitizeString(data.company),
    jobTitle: sanitizeString(data.jobTitle),
    location: sanitizeString(data.location),
    source: sanitizeString(data.source),
    notes: sanitizeString(data.notes),
    metadata: data.metadata ? sanitizeObject(data.metadata) : {},
  };
}

// Validate and sanitize call log data
export function sanitizeCallLogData(data: any) {
  return {
    duration: Math.max(0, Math.min(parseInt(data.duration) || 0, 7200)), // Max 2 hours
    outcome: sanitizeString(data.outcome),
    notes: sanitizeString(data.notes),
    followUpDate: data.followUpDate, // Keep as-is, will be validated separately
  };
}

// Prevent SQL injection in search queries
export function sanitizeSearchQuery(query: string | undefined | null): string {
  if (!query) return '';
  
  return query
    .trim()
    .replace(/[';\"\\]/g, '') // Remove SQL special characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments
    .substring(0, 100); // Limit length
}

// Sanitize URL parameters
export function sanitizeUrlParam(param: string | undefined | null): string {
  if (!param) return '';
  
  return param
    .replace(/[^\w\-_.]/g, '') // Allow only alphanumeric, dash, underscore, dot
    .substring(0, 100);
}

// Validate UUID format
export function isValidUUID(id: string | undefined | null): boolean {
  if (!id) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Validate enum values
export function validateEnum<T extends string>(
  value: string | undefined | null,
  allowedValues: readonly T[]
): T | null {
  if (!value) return null;
  
  const cleaned = value.toLowerCase() as T;
  return allowedValues.includes(cleaned) ? cleaned : null;
}
