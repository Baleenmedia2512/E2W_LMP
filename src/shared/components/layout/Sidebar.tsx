'use client';

import { Box, Flex, VStack, Text, Icon, useColorModeValue } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRoleBasedAccess } from '@/shared/hooks/useRoleBasedAccess';
import { useAuth } from '@/shared/lib/auth/auth-context';

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
  { name: 'Lead Outcomes', href: '/dashboard/leads/outcomes', icon: FiTarget, permission: 'canViewLeads' },
  { name: 'Calls', href: '/dashboard/calls', icon: FiPhone, permission: 'canLogCall' },
  { name: 'DSR', href: '/dashboard/dsr', icon: FiBarChart2, permission: 'canViewDSR' },
  { name: 'Reports', href: '/dashboard/reports', icon: FiFileText, permission: 'canViewTeamReport' },
];

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const { user } = useAuth();
  const { hasPermission } = useRoleBasedAccess();

  const filteredNavItems = navItems.filter((item) => hasPermission(item.permission as any));

  return (
    <Box
      w={{ base: 'full', lg: '64' }}
      bg={bgColor}
      borderRight={{ base: 'none', lg: '1px' }}
      borderColor={borderColor}
      h="full"
      overflowY="auto"
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
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate}>
                <Flex
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
                >
                  <Icon as={item.icon} boxSize={5} mr={3} />
                  <Text>{item.name}</Text>
                </Flex>
              </Link>
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




