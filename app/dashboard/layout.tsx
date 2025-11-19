'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Box, Container, Flex, Spinner, Center } from '@chakra-ui/react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="brand.500" thickness="4px" />
      </Center>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <Flex h="100vh" overflow="hidden">
      <Sidebar />
      <Flex flex="1" direction="column" overflow="hidden">
        <Header />
        <Box flex="1" overflow="auto" bg="gray.50">
          <Container maxW="container.xl" py={6}>
            {children}
          </Container>
        </Box>
      </Flex>
    </Flex>
  );
}
