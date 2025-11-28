'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Spinner, Center } from '@chakra-ui/react';
import { useAuth } from '@/shared/lib/auth/auth-context';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <Center h="100vh">
      <Spinner size="xl" color="brand.500" thickness="4px" />
    </Center>
  );
}




