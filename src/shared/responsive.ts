/**
 * Responsive & Accessibility Module (US-25)
 * Central export for all responsive design utilities and components
 */

// Hooks
export {
  useResponsive,
  useTouch,
  useNetworkSpeed,
  usePrefersReducedMotion,
} from './hooks/useResponsive';

// Components
export { default as ResponsiveImage } from './components/ResponsiveImage';
export { default as ResponsiveTable } from './components/ResponsiveTable';
export type { Column as ResponsiveTableColumn, ResponsiveTableProps } from './components/ResponsiveTable';

export {
  ResponsiveContainer,
  HideOn,
  ShowOn,
  ResponsiveStack,
  TouchTarget,
} from './components/ResponsiveUtils';

// Performance utilities
export {
  usePreloadCriticalResources,
  useLazyLoadOnScroll,
  debounce,
  throttle,
  AdaptiveImage,
  useAdaptiveAnimations,
  registerServiceWorker,
  usePrefetchOnHover,
} from './lib/utils/performance';

// Accessibility utilities
export {
  useFocusManagement,
  SkipToMainContent,
  useAriaLive,
  ScreenReaderOnly,
  useEscapeKey,
  useFocusTrap,
  getContrastRatio,
  meetsWCAGStandards,
  useRouteAnnouncement,
} from './lib/utils/accessibility';
