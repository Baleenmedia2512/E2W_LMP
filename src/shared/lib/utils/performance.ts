'use client';

import { useEffect } from 'react';
import { useNetworkSpeed } from '@/shared/hooks/useResponsive';

/**
 * Performance optimization utilities for mobile networks
 * Implements US-25 requirement: Optimized for slower mobile networks
 */

/**
 * Preload critical resources
 */
export function usePreloadCriticalResources() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Preload critical API endpoints
      const criticalEndpoints = ['/api/leads', '/api/followups', '/api/users'];
      
      criticalEndpoints.forEach((endpoint) => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = endpoint;
        document.head.appendChild(link);
      });
    }
  }, []);
}

/**
 * Lazy load components based on viewport
 */
export function useLazyLoadOnScroll(
  ref: React.RefObject<HTMLElement>,
  callback: () => void,
  options?: IntersectionObserverInit
) {
  useEffect(() => {
    if (!ref.current || typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback();
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px',
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref, callback, options]);
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Component to optimize images based on network speed
 */
interface AdaptiveImageProps {
  src: string;
  lowQualitySrc?: string;
  alt: string;
  className?: string;
}

export function AdaptiveImage({
  src,
  lowQualitySrc,
  alt,
  className,
}: AdaptiveImageProps) {
  const { isSlowNetwork } = useNetworkSpeed();
  const imageSrc = isSlowNetwork && lowQualitySrc ? lowQualitySrc : src;

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
    />
  );
}

/**
 * Hook to reduce animations on slow networks or reduced motion preference
 */
export function useAdaptiveAnimations() {
  const { isSlowNetwork } = useNetworkSpeed();
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    shouldAnimate: !isSlowNetwork && !prefersReducedMotion,
    animationDuration: isSlowNetwork ? 0 : prefersReducedMotion ? 0 : undefined,
  };
}

/**
 * Service Worker registration for offline support and caching
 */
export function registerServiceWorker() {
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    process.env.NODE_ENV === 'production'
  ) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}

/**
 * Prefetch resources for faster navigation
 */
export function usePrefetchOnHover(url: string) {
  const prefetch = () => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  };

  return { prefetch };
}
