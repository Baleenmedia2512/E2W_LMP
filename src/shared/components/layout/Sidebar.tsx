'use client';

import { Box, Flex, VStack, Text, Icon, useColorModeValue, Spinner } from '@chakra-ui/react';
import { usePathname, useRouter } from 'next/navigation';
import { useRoleBasedAccess } from '@/shared/hooks/useRoleBasedAccess';
import { useAuth } from '@/shared/lib/auth/auth-context';
import { useState, useRef, useEffect } from 'react';

interface SidebarProps {
  onNavigate?: () => void;
}
import {
  FiHome,
  FiUsers,
  FiFileText,
  FiBarChart2,
  FiPhone,
  FiClock,
  FiBell,
  FiTarget,
  FiFile,
} from 'react-icons/fi';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  permission: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: FiHome, permission: 'canViewOwnDashboard' },
  { name: 'Leads', href: '/dashboard/leads', icon: FiUsers, permission: 'canViewLeads' },
  // { name: 'Quotations', href: '/dashboard/quotations', icon: FiFile, permission: 'canViewLeads' },
  // { name: 'Lead Outcomes', href: '/dashboard/leads/outcomes', icon: FiTarget, permission: 'canViewLeads' },
  { name: 'Calls', href: '/dashboard/calls', icon: FiPhone, permission: 'canLogCall' },
  { name: 'DSR', href: '/dashboard/dsr', icon: FiBarChart2, permission: 'canViewDSR' },
  { name: 'Reports', href: '/dashboard/reports', icon: FiFileText, permission: 'canViewTeamReport' },
];

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const { user } = useAuth();
  const { hasPermission } = useRoleBasedAccess();
  
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetHref, setTargetHref] = useState<string | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout>();

  const filteredNavItems = navItems.filter((item) => hasPermission(item.permission as any));

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  // Reset navigation state when pathname changes
  useEffect(() => {
    setIsNavigating(false);
    setTargetHref(null);
  }, [pathname]);

  const handleNavClick = (href: string) => {
    // If clicking the same page, do nothing
    if (href === pathname) return;

    // Cancel any pending navigation
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Close drawer IMMEDIATELY (before navigation)
    if (onNavigate) {
      onNavigate();
    }

    // Set navigation state
    setIsNavigating(true);
    setTargetHref(href);

    // Navigate after a brief delay to allow drawer to close
    navigationTimeoutRef.current = setTimeout(() => {
      router.push(href);
    }, 100);
  };

  return (
    <Box
      w={{ base: 'full', lg: '64' }}
      minW={{ lg: '16rem' }}
      bg={bgColor}
      borderRight={{ base: 'none', lg: '1px' }}
      borderColor={borderColor}
      h="100dvh"
      overflowY="auto"
      overflowX="hidden"
      flexShrink={0}
    >
      <VStack spacing={0} align="stretch" h="full">
        {/* Logo */}
        <Box p={6} borderBottom="1px" borderColor={borderColor}>
          <Text fontSize="2xl" fontWeight="bold" color="brand.500">
            E2W LMS
          </Text>
          <Text fontSize="sm" color="gray.500">
            Lead Management
          </Text>
        </Box>

        {/* Navigation */}
        <VStack spacing={1} align="stretch" flex="1" p={4}>
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            const isLoadingThis = isNavigating && targetHref === item.href;
            return (
              <Flex
                key={item.href}
                align="center"
                px={4}
                py={3}
                borderRadius="md"
                cursor="pointer"
                bg={isActive ? 'brand.50' : 'transparent'}
                color={isActive ? 'brand.600' : 'gray.600'}
                fontWeight={isActive ? '600' : '400'}
                _hover={{
                  bg: isActive ? 'brand.50' : 'gray.100',
                }}
                transition="all 0.2s"
                onClick={() => handleNavClick(item.href)}
              >
                <Icon as={item.icon} boxSize={5} mr={3} />
                <Text>{item.name}</Text>
                {isLoadingThis && (
                  <Spinner size="sm" ml="auto" color="brand.500" thickness="2px" />
                )}
              </Flex>
            );
          })}
        </VStack>

        {/* User Profile */}
        <Box p={4} borderTop="1px" borderColor={borderColor}>
          <Flex align="center" gap={3}>
            <Box flex="1" minW="0">
              <Text fontSize="sm" fontWeight="600" noOfLines={1}>
                {user?.name || 'User'}
              </Text>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {user?.role || 'Agent'}
              </Text>
            </Box>
          </Flex>
        </Box>
      </VStack>
    </Box>
  );
}




