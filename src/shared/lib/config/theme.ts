'use client';

import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Responsive breakpoints as per US-25 requirements
// Mobile: < 768px (base)
// Tablet: 768–1024px (md)
// Desktop: > 1024px (lg, xl, 2xl)
const breakpoints = {
  base: '0px',    // Mobile: 0-767px
  sm: '480px',    // Small mobile landscape
  md: '768px',    // Tablet: 768px+
  lg: '1024px',   // Desktop: 1024px+
  xl: '1280px',   // Large desktop
  '2xl': '1536px', // Extra large desktop
};

const colors = {
  brand: {
    50: '#fef5f3',
    100: '#fce8e3',
    200: '#f9d1c7',
    300: '#f5b9ab',
    400: '#d08973',
    500: '#9c5342', // Primary brand color
    600: '#8c4b3b',
    700: '#753f32',
    800: '#5e3228',
    900: '#4d2920',
  },
  dark: {
    50: '#e8e9ea',
    100: '#c5c7c9',
    200: '#9ea2a5',
    300: '#777c81',
    400: '#5a6065',
    500: '#3d4449',
    600: '#373e42',
    700: '#2f3539',
    800: '#272d31',
    900: '#0b1316', // Dark brand color
  },
  neutral: {
    50: '#faf9f8',
    100: '#f3f1ef',
    200: '#e9e5e2',
    300: '#dfd9d5',
    400: '#cfc5bf',
    500: '#b4a097', // Neutral brand color
    600: '#a29088',
    700: '#877871',
    800: '#6c605a',
    900: '#594e49',
  },
  warm: {
    50: '#f5f3f2',
    100: '#e5e1df',
    200: '#d5cdc9',
    300: '#c4b9b3',
    400: '#b7aba3',
    500: '#7a5f58', // Warm brand color
    600: '#6e574f',
    700: '#5c4943',
    800: '#4a3b37',
    900: '#3c302d',
  },
  cool: {
    50: '#f1f3f3',
    100: '#dce0e0',
    200: '#c5ccca',
    300: '#aeb7b4',
    400: '#9da8a5',
    500: '#8c9b96', // Cool brand color
    600: '#7e8c88',
    700: '#6a7672',
    800: '#555f5c',
    900: '#454e4b',
  },
};

const fonts = {
  heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
  body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
};

const styles = {
  global: {
    body: {
      bg: 'gray.50',
      color: 'gray.800',
      // Prevent text size adjustments on mobile
      WebkitTextSizeAdjust: '100%',
      // Smooth scrolling
      scrollBehavior: 'smooth',
    },
    // Improve touch targets on mobile
    'button, a, input, select, textarea': {
      minHeight: { base: '44px', md: 'auto' },
      minWidth: { base: '44px', md: 'auto' },
    },
  },
};

const components = {
  Button: {
    baseStyle: {
      fontWeight: '600',
      borderRadius: 'md',
    },
    variants: {
      solid: {
        bg: 'brand.500',
        color: 'white',
        _hover: {
          bg: 'brand.600',
        },
        _active: {
          bg: 'brand.700',
        },
      },
      outline: {
        borderColor: 'brand.500',
        color: 'brand.500',
        _hover: {
          bg: 'brand.50',
        },
      },
      ghost: {
        color: 'brand.500',
        _hover: {
          bg: 'brand.50',
        },
      },
    },
    defaultProps: {
      variant: 'solid',
      size: 'md',
    },
  },
  Card: {
    baseStyle: {
      container: {
        borderRadius: 'lg',
        boxShadow: 'sm',
        bg: 'white',
        p: 4,
      },
    },
  },
  Input: {
    variants: {
      outline: {
        field: {
          borderColor: 'gray.300',
          _hover: {
            borderColor: 'brand.400',
          },
          _focus: {
            borderColor: 'brand.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
          },
        },
      },
    },
    defaultProps: {
      variant: 'outline',
      size: 'md',
    },
  },
  Select: {
    variants: {
      outline: {
        field: {
          borderColor: 'gray.300',
          _hover: {
            borderColor: 'brand.400',
          },
          _focus: {
            borderColor: 'brand.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
          },
        },
      },
    },
    defaultProps: {
      variant: 'outline',
      size: 'md',
    },
  },
  Textarea: {
    variants: {
      outline: {
        borderColor: 'gray.300',
        _hover: {
          borderColor: 'brand.400',
        },
        _focus: {
          borderColor: 'brand.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
        },
      },
    },
    defaultProps: {
      variant: 'outline',
      size: 'md',
    },
  },
  Badge: {
    baseStyle: {
      fontWeight: '600',
      borderRadius: 'md',
      px: 2,
      py: 1,
    },
    defaultProps: {
      variant: 'subtle',
    },
  },
  Table: {
    variants: {
      simple: {
        th: {
          borderColor: 'gray.200',
          color: 'gray.600',
          fontWeight: '600',
          textTransform: 'uppercase',
          fontSize: 'xs',
          letterSpacing: 'wide',
        },
        td: {
          borderColor: 'gray.200',
        },
      },
    },
  },
};

const theme = extendTheme({
  config,
  breakpoints,
  colors,
  fonts,
  styles,
  components,
  semanticTokens: {
    colors: {
      'chakra-body-bg': { _light: 'gray.50', _dark: 'dark.900' },
      'chakra-body-text': { _light: 'gray.800', _dark: 'gray.100' },
    },
  },
  shadows: {
    outline: '0 0 0 3px rgba(156, 83, 66, 0.6)',
  },
  // Responsive font sizes
  fontSizes: {
    xs: '0.75rem',   // 12px
    sm: '0.875rem',  // 14px
    md: '1rem',      // 16px
    lg: '1.125rem',  // 18px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
  },
  // Spacing scale optimized for touch targets
  space: {
    px: '1px',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
  },
});

export default theme;




