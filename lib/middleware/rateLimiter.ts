import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
  message?: string;
}

const defaultConfig: Required<RateLimitConfig> = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: 'Too many requests, please try again later.',
};

export function rateLimit(config: RateLimitConfig = {}) {
  const { windowMs, maxRequests, message } = { ...defaultConfig, ...config };

  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Get client identifier (IP or user ID from session)
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
    const identifier = `${ip}-${req.nextUrl.pathname}`;

    const now = Date.now();
    const resetTime = now + windowMs;

    // Initialize or get existing rate limit data
    if (!store[identifier] || store[identifier].resetTime < now) {
      store[identifier] = {
        count: 1,
        resetTime,
      };
      return null; // Allow request
    }

    // Increment counter
    store[identifier].count += 1;

    // Check if limit exceeded
    if (store[identifier].count > maxRequests) {
      const retryAfter = Math.ceil((store[identifier].resetTime - now) / 1000);
      
      return NextResponse.json(
        { success: false, error: message },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': store[identifier].resetTime.toString(),
          },
        }
      );
    }

    // Add rate limit headers
    const remaining = maxRequests - store[identifier].count;
    
    return null; // Allow request (will be handled by adding headers in the route)
  };
}

export function getRateLimitHeaders(req: NextRequest, config: RateLimitConfig = {}): HeadersInit {
  const { windowMs, maxRequests } = { ...defaultConfig, ...config };
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  const identifier = `${ip}-${req.nextUrl.pathname}`;

  const entry = store[identifier];
  if (!entry) {
    return {
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': maxRequests.toString(),
    };
  }

  const remaining = Math.max(0, maxRequests - entry.count);
  return {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': entry.resetTime.toString(),
  };
}
