'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Box, Spinner, Center } from '@chakra-ui/react';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
    } else {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  return (
    <Center h="100vh">
      <Spinner size="xl" color="brand.500" thickness="4px" />
    </Center>
  );
}
