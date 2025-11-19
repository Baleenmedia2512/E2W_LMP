'use client';

import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
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
    variants: {
      solid: {
        bg: 'brand.500',
        color: 'white',
      },
      subtle: {
        bg: 'brand.50',
        color: 'brand.700',
      },
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
});

export default theme;
