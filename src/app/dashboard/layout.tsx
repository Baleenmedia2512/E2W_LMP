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

  // ✅ Meta leads now come via WEBHOOK (push-based) - no polling/cron needed!

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
    <Flex h="100dvh" overflow="hidden">
      {/* Desktop Sidebar */}
      {!isMobile && <Sidebar />}
      
      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW={{ base: '280px', sm: '320px' }}>
          <DrawerCloseButton />
          <DrawerBody p={0}>
            <Sidebar onNavigate={onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <Flex flex="1" direction="column" overflow="hidden" minW={0}>
        <Header onMenuClick={onOpen} />
        <Box 
          flex="1" 
          overflowY="auto"
          overflowX="hidden"
          bg="gray.50"
          id="dashboard-scroll-container"
          css={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Container 
            maxW="container.xl" 
            py={{ base: 3, md: 6 }} 
            px={{ base: 3, sm: 4, md: 6 }}
          >
            {children}
          </Container>
        </Box>
      </Flex>
    </Flex>
  );
}





