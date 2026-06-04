'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/lib/auth/auth-context';
import { Center, Spinner } from '@chakra-ui/react';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/dashboard');
    } else if (!isLoading) {
      // Redirect to new OTP login flow
      router.push('/auth/welcome');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <Center minH="100vh" bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
      <Spinner size="xl" color="white" thickness="4px" />
    </Center>
  );
}
