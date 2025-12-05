'use client';

import { Box, BoxProps, useBreakpointValue } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface ResponsiveContainerProps extends BoxProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  centerContent?: boolean;
  gutter?: boolean;
}

/**
 * Responsive container component with proper padding and max-width
 * Implements US-25 requirement for proper content layout on all devices
 */
export function ResponsiveContainer({
  children,
  maxWidth = 'xl',
  centerContent = false,
  gutter = true,
  ...props
}: ResponsiveContainerProps) {
  const containerMaxWidth = useBreakpointValue({
    base: '100%',
    sm: maxWidth === 'sm' ? '640px' : '100%',
    md: maxWidth === 'md' ? '768px' : maxWidth === 'sm' ? '640px' : '100%',
    lg: maxWidth === 'lg' ? '1024px' : maxWidth === 'md' ? '768px' : maxWidth === 'sm' ? '640px' : '100%',
    xl: maxWidth === 'xl' ? '1280px' : maxWidth === 'lg' ? '1024px' : maxWidth === 'md' ? '768px' : maxWidth === 'sm' ? '640px' : '100%',
    '2xl': maxWidth === '2xl' ? '1536px' : maxWidth === 'xl' ? '1280px' : maxWidth === 'lg' ? '1024px' : maxWidth === 'md' ? '768px' : maxWidth === 'sm' ? '640px' : '100%',
  });

  return (
    <Box
      width="100%"
      maxWidth={maxWidth === 'full' ? '100%' : containerMaxWidth}
      mx={centerContent ? 'auto' : undefined}
      px={gutter ? { base: 4, md: 6, lg: 8 } : undefined}
      {...props}
    >
      {children}
    </Box>
  );
}

interface HideOnProps extends BoxProps {
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  children: ReactNode;
}

/**
 * Utility component to hide content on specific breakpoints
 */
export function HideOn({ breakpoint, children, ...props }: HideOnProps) {
  const display = useBreakpointValue({
    base: breakpoint === 'mobile' ? 'none' : 'block',
    md: breakpoint === 'tablet' ? 'none' : 'block',
    lg: breakpoint === 'desktop' ? 'none' : 'block',
  });

  return (
    <Box display={display} {...props}>
      {children}
    </Box>
  );
}

interface ShowOnProps extends BoxProps {
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  children: ReactNode;
}

/**
 * Utility component to show content only on specific breakpoints
 */
export function ShowOn({ breakpoint, children, ...props }: ShowOnProps) {
  const display = useBreakpointValue({
    base: breakpoint === 'mobile' ? 'block' : 'none',
    md: breakpoint === 'tablet' ? 'block' : 'none',
    lg: breakpoint === 'desktop' ? 'block' : 'none',
  });

  return (
    <Box display={display} {...props}>
      {children}
    </Box>
  );
}

interface ResponsiveStackProps extends BoxProps {
  children: ReactNode;
  spacing?: number | string;
  direction?: 'horizontal' | 'vertical' | 'responsive';
}

/**
 * Responsive stack that changes direction based on screen size
 */
export function ResponsiveStack({
  children,
  spacing = 4,
  direction = 'responsive',
  ...props
}: ResponsiveStackProps) {
  const flexDirection = useBreakpointValue({
    base: direction === 'horizontal' ? 'row' : 'column',
    md: direction === 'vertical' ? 'column' : direction === 'horizontal' ? 'row' : 'row',
  }) as 'row' | 'column' | undefined;

  const gap = useBreakpointValue({
    base: typeof spacing === 'number' ? `${spacing * 0.25}rem` : spacing,
    md: typeof spacing === 'number' ? `${spacing * 0.25}rem` : spacing,
  });

  return (
    <Box display="flex" flexDirection={flexDirection || 'column'} gap={gap || '1rem'} {...props}>
      {children}
    </Box>
  );
}

interface TouchTargetProps extends BoxProps {
  children: ReactNode;
  minSize?: number;
}

/**
 * Ensures proper touch target size for mobile (minimum 44x44px)
 * Implements US-25 requirement: Touch-friendly buttons and inputs
 */
export function TouchTarget({
  children,
  minSize = 44,
  ...props
}: TouchTargetProps) {
  return (
    <Box
      minHeight={{ base: `${minSize}px`, md: 'auto' }}
      minWidth={{ base: `${minSize}px`, md: 'auto' }}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      {...props}
    >
      {children}
    </Box>
  );
}
