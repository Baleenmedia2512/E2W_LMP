'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Container, 
  Flex, 
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerBody,
  useBreakpointValue,
  Center,
  Spinner
} from '@chakra-ui/react';
import { useAuth } from '@/shared/lib/auth/auth-context';
import Sidebar from '@/shared/components/layout/Sidebar';
import Header from '@/shared/components/layout/Header';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, lg: false });
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="purple.500" thickness="4px" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}
      
      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerBody p={0}>
            <Sidebar onNavigate={onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Flex flex="1" direction="column" overflow="hidden">
        <Header onMenuClick={onOpen} />
        <Box flex="1" overflow="auto" bg="gray.50">
          <Container maxW="container.xl" py={{ base: 4, md: 6 }} px={{ base: 4, md: 6 }}>
            {children}
          </Container>
        </Box>
      </Flex>
    </Flex>
  );
}





