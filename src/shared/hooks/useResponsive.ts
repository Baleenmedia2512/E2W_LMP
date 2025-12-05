'use client';

import { useEffect, useState } from 'react';

type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints: Record<Breakpoint, number> = {
  base: 0,
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Hook to detect current responsive breakpoint
 * Implements US-25 breakpoint requirements:
 * - Mobile: < 768px
 * - Tablet: 768–1024px
 * - Desktop: > 1024px
 */
export function useResponsive() {
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Debounce resize events
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const getCurrentBreakpoint = (): Breakpoint => {
    if (windowWidth >= breakpoints['2xl']) return '2xl';
    if (windowWidth >= breakpoints.xl) return 'xl';
    if (windowWidth >= breakpoints.lg) return 'lg';
    if (windowWidth >= breakpoints.md) return 'md';
    if (windowWidth >= breakpoints.sm) return 'sm';
    return 'base';
  };

  const currentBreakpoint = getCurrentBreakpoint();

  return {
    windowWidth,
    currentBreakpoint,
    isMobile: windowWidth < breakpoints.md,
    isTablet: windowWidth >= breakpoints.md && windowWidth < breakpoints.lg,
    isDesktop: windowWidth >= breakpoints.lg,
    isSmallMobile: windowWidth < breakpoints.sm,
    isLargeDesktop: windowWidth >= breakpoints.xl,
  };
}

/**
 * Hook for touch device detection
 */
export function useTouch() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasTouchScreen = 
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0;
      
      setIsTouch(hasTouchScreen);
    }
  }, []);

  return { isTouch, isTouchDevice: isTouch };
}

/**
 * Hook for network speed detection
 * Used for performance optimizations like lazy loading
 */
export function useNetworkSpeed() {
  const [networkSpeed, setNetworkSpeed] = useState<'slow' | 'fast'>('fast');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        const updateConnectionStatus = () => {
          const effectiveType = connection.effectiveType;
          // 'slow-2g', '2g', '3g' are considered slow
          // '4g' is considered fast
          const isSlow = ['slow-2g', '2g', '3g'].includes(effectiveType);
          setNetworkSpeed(isSlow ? 'slow' : 'fast');
        };

        updateConnectionStatus();
        connection.addEventListener('change', updateConnectionStatus);

        return () => {
          connection.removeEventListener('change', updateConnectionStatus);
        };
      }
    }
    return undefined;
  }, []);

  return { 
    networkSpeed, 
    isSlowNetwork: networkSpeed === 'slow',
    isFastNetwork: networkSpeed === 'fast',
  };
}

/**
 * Hook for reduced motion preference (accessibility)
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (event: MediaQueryListEvent) => {
        setPrefersReducedMotion(event.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    return undefined;
  }, []);

  return prefersReducedMotion;
}
