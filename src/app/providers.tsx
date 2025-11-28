'use client';

import { ChakraProvider } from '@chakra-ui/react';
import theme from '@/shared/lib/config/theme';
import { AuthProvider } from '@/shared/lib/auth/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </AuthProvider>
  );
}





