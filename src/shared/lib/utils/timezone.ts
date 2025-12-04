/**
 * Timezone and Date Utilities for DSR Calculations
 * Handles IST timezone and provides reusable date comparison functions
 */

// Default timezone: IST (Indian Standard Time)
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current date in specified timezone
 */
export function getCurrentDate(timezone: string = DEFAULT_TIMEZONE): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
}

/**
 * Get start of day (00:00:00) for a given date in specified timezone
 */
export function getStartOfDay(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  tzDate.setHours(0, 0, 0, 0);
  return tzDate;
}

/**
 * Get end of day (23:59:59.999) for a given date in specified timezone
 */
export function getEndOfDay(date: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  tzDate.setHours(23, 59, 59, 999);
  return tzDate;
}

/**
 * Check if a date is today in the specified timezone
 */
export function isToday(date: Date | string | null | undefined, timezone: string = DEFAULT_TIMEZONE): boolean {
  if (!date) return false;
  
  try {
    const checkDate = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(checkDate.getTime())) return false;
    
    const today = getCurrentDate(timezone);
    
    const checkDateStr = checkDate.toLocaleDateString('en-US', { timeZone: timezone });
    const todayStr = today.toLocaleDateString('en-US', { timeZone: timezone });
    
    return checkDateStr === todayStr;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a date falls within a date range
 */
export function isDateInRange(
  date: Date | string,
  startDate: Date,
  endDate: Date,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const start = getStartOfDay(startDate, timezone);
  const end = getEndOfDay(endDate, timezone);
  
  return checkDate >= start && checkDate <= end;
}

/**
 * Get start of today in specified timezone
 */
export function getStartOfToday(timezone: string = DEFAULT_TIMEZONE): Date {
  return getStartOfDay(getCurrentDate(timezone), timezone);
}

/**
 * Get end of today in specified timezone
 */
export function getEndOfToday(timezone: string = DEFAULT_TIMEZONE): Date {
  return getEndOfDay(getCurrentDate(timezone), timezone);
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string, timezone: string = DEFAULT_TIMEZONE): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const now = getCurrentDate(timezone);
  return checkDate < now;
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string, timezone: string = DEFAULT_TIMEZONE): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const now = getCurrentDate(timezone);
  return checkDate > now;
}
