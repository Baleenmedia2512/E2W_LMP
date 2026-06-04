import { LRUCache } from 'lru-cache';

// Rate limit configuration
const OTP_RATE_LIMIT_PER_EMAIL = parseInt(process.env.OTP_RATE_LIMIT_PER_EMAIL || '3');
const OTP_RATE_LIMIT_WINDOW_MINUTES = parseFloat(process.env.OTP_RATE_LIMIT_WINDOW_MINUTES || '15');
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60');
const IP_RATE_LIMIT = 10; // 10 requests per window per IP

// Cache configuration
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL = OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000; // Convert to milliseconds

// Helper to format time message
function formatWaitTime(minutes: number): string {
  if (minutes < 1) {
    const seconds = Math.ceil(minutes * 60);
    return `${seconds} seconds`;
  }
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

// Create LRU cache instances
const emailRateLimitCache = new LRUCache<string, number>({
  max: CACHE_MAX_SIZE,
  ttl: CACHE_TTL,
});

const ipRateLimitCache = new LRUCache<string, number>({
  max: CACHE_MAX_SIZE,
  ttl: CACHE_TTL,
});

const resendCooldownCache = new LRUCache<string, number>({
  max: CACHE_MAX_SIZE,
  ttl: OTP_RESEND_COOLDOWN_SECONDS * 1000,
});

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // Seconds until retry allowed
  reason?: string;
}

/**
 * Check if email rate limit is exceeded
 */
export function checkEmailRateLimit(email: string): RateLimitResult {
  const key = `email:${email.toLowerCase()}`;
  const attempts = emailRateLimitCache.get(key) || 0;

  if (attempts >= OTP_RATE_LIMIT_PER_EMAIL) {
    return {
      allowed: false,
      retryAfter: Math.ceil(OTP_RATE_LIMIT_WINDOW_MINUTES * 60),
      reason: `Too many OTP requests. Please try again in ${formatWaitTime(OTP_RATE_LIMIT_WINDOW_MINUTES)}.`,
    };
  }

  // Increment counter
  emailRateLimitCache.set(key, attempts + 1);

  return { allowed: true };
}

/**
 * Check if IP rate limit is exceeded
 */
export function checkIpRateLimit(ipAddress: string): RateLimitResult {
  const key = `ip:${ipAddress}`;
  const attempts = ipRateLimitCache.get(key) || 0;

  if (attempts >= IP_RATE_LIMIT) {
    return {
      allowed: false,
      retryAfter: Math.ceil(OTP_RATE_LIMIT_WINDOW_MINUTES * 60),
      reason: 'Too many requests from this IP address. Please try again later.',
    };
  }

  // Increment counter
  ipRateLimitCache.set(key, attempts + 1);

  return { allowed: true };
}

/**
 * Check if resend cooldown is active
 */
export function checkResendCooldown(email: string): RateLimitResult {
  const key = `resend:${email.toLowerCase()}`;
  const lastSent = resendCooldownCache.get(key);

  if (lastSent) {
    const elapsed = Date.now() - lastSent;
    const remaining = OTP_RESEND_COOLDOWN_SECONDS * 1000 - elapsed;

    if (remaining > 0) {
      return {
        allowed: false,
        retryAfter: Math.ceil(remaining / 1000),
        reason: `Please wait ${Math.ceil(remaining / 1000)} seconds before requesting a new code.`,
      };
    }
  }

  // Set cooldown
  resendCooldownCache.set(key, Date.now());

  return { allowed: true };
}

/**
 * Check all rate limits (email, IP, and resend cooldown)
 */
export function checkAllRateLimits(
  email: string,
  ipAddress: string,
  isResend: boolean = false
): RateLimitResult {
  // Check email rate limit
  const emailCheck = checkEmailRateLimit(email);
  if (!emailCheck.allowed) {
    return emailCheck;
  }

  // Check IP rate limit
  const ipCheck = checkIpRateLimit(ipAddress);
  if (!ipCheck.allowed) {
    return ipCheck;
  }

  // Check resend cooldown only if this is a resend request
  if (isResend) {
    const resendCheck = checkResendCooldown(email);
    if (!resendCheck.allowed) {
      return resendCheck;
    }
  }

  return { allowed: true };
}

/**
 * Reset email rate limit (for testing purposes)
 */
export function resetEmailRateLimit(email: string): void {
  const key = `email:${email.toLowerCase()}`;
  emailRateLimitCache.delete(key);
}

/**
 * Reset IP rate limit (for testing purposes)
 */
export function resetIpRateLimit(ipAddress: string): void {
  const key = `ip:${ipAddress}`;
  ipRateLimitCache.delete(key);
}

/**
 * Reset resend cooldown (for testing purposes)
 */
export function resetResendCooldown(email: string): void {
  const key = `resend:${email.toLowerCase()}`;
  resendCooldownCache.delete(key);
}

/**
 * Get resend cooldown seconds
 */
export function getResendCooldownSeconds(): number {
  return OTP_RESEND_COOLDOWN_SECONDS;
}

/**
 * Clear all rate limit caches (for testing purposes)
 */
export function clearAllRateLimits(): void {
  emailRateLimitCache.clear();
  ipRateLimitCache.clear();
  resendCooldownCache.clear();
}
