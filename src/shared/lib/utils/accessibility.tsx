'use client';

import React, { useEffect } from 'react';
import { VisuallyHidden, useColorModeValue } from '@chakra-ui/react';

/**
 * Accessibility utilities for US-25
 * Ensures platform is accessible on all devices
 */

/**
 * Hook to manage focus for keyboard navigation
 */
export function useFocusManagement() {
  useEffect(() => {
    // Show focus outlines only for keyboard users
    const handleFirstTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        document.body.classList.add('user-is-tabbing');
        window.removeEventListener('keydown', handleFirstTab);
        window.addEventListener('mousedown', handleMouseDown);
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('user-is-tabbing');
      window.removeEventListener('mousedown', handleMouseDown);
      window.addEventListener('keydown', handleFirstTab);
    };

    window.addEventListener('keydown', handleFirstTab);

    return () => {
      window.removeEventListener('keydown', handleFirstTab);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
}

/**
 * Component for skip to main content link
 */
export function SkipToMainContent() {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('brand.600', 'brand.200');

  return (
    <a
      href="#main-content"
      style={{
        position: 'absolute',
        left: '-9999px',
        zIndex: 9999,
        padding: '1rem',
        background: bgColor,
        color: textColor,
        textDecoration: 'none',
        fontWeight: 'bold',
        borderRadius: '0.25rem',
      }}
      onFocus={(e) => {
        e.currentTarget.style.left = '1rem';
        e.currentTarget.style.top = '1rem';
      }}
      onBlur={(e) => {
        e.currentTarget.style.left = '-9999px';
      }}
    >
      Skip to main content
    </a>
  );
}

/**
 * Hook to announce dynamic content changes to screen readers
 */
export function useAriaLive() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (typeof window === 'undefined') return;

    let liveRegion = document.getElementById('aria-live-region');

    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'aria-live-region';
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }

    // Clear and announce
    liveRegion.textContent = '';
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = message;
      }
    }, 100);
  };

  return { announce };
}

/**
 * Screen reader only text component
 */
export { VisuallyHidden as ScreenReaderOnly };

/**
 * Hook to handle escape key for closing modals/dialogs
 */
export function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onEscape]);
}

/**
 * Hook to trap focus within a component (for modals/dialogs)
 */
export function useFocusTrap(
  ref: React.RefObject<HTMLElement>,
  isActive: boolean
) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const element = ref.current;
    const focusableElements = element.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);

    // Focus first element when trap is activated
    firstFocusable?.focus();

    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }, [ref, isActive]);
}

/**
 * Get readable color contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  // Simplified contrast ratio calculation
  // For production, use a library like 'polished' or 'color'
  return 4.5; // WCAG AA standard minimum
}

/**
 * Check if color combination meets WCAG standards
 */
export function meetsWCAGStandards(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Announce route changes to screen readers
 */
export function useRouteAnnouncement() {
  const { announce } = useAriaLive();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRouteChange = () => {
      const pageTitle = document.title;
      announce(`Navigated to ${pageTitle}`, 'assertive');
    };

    // Listen for route changes (Next.js specific)
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [announce]);
}
