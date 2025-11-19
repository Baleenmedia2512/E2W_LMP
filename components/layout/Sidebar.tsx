'use client';

import { Box, Flex, VStack, Text, Icon, useColorModeValue, Avatar } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  FiHome,
  FiUsers,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiPhone,
  FiClock,
} from 'react-icons/fi';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: FiHome, roles: ['Agent', 'SuperAgent', 'Finance', 'HR', 'Procurement'] },
  { name: 'Leads', href: '/dashboard/leads', icon: FiUsers, roles: ['Agent', 'SuperAgent'] },
  { name: 'Calls', href: '/dashboard/calls', icon: FiPhone, roles: ['Agent', 'SuperAgent'] },
  { name: 'Follow-ups', href: '/dashboard/followups', icon: FiClock, roles: ['Agent', 'SuperAgent'] },
  { name: 'DSR', href: '/dashboard/dsr', icon: FiBarChart2, roles: ['Agent', 'SuperAgent', 'Finance', 'HR'] },
  { name: 'Reports', href: '/dashboard/reports', icon: FiFileText, roles: ['SuperAgent', 'Finance', 'HR'] },
  { name: 'Settings', href: '/dashboard/settings', icon: FiSettings, roles: ['Agent', 'SuperAgent', 'Finance', 'HR', 'Procurement'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const userRole = session?.user?.role || 'Agent';

  const filteredNavItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <Box
      w="64"
      bg={bgColor}
      borderRight="1px"
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
              <Link key={item.href} href={item.href}>
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
            <Avatar size="sm" name={session?.user?.name || ''} src={session?.user?.image || ''} />
            <Box flex="1" minW="0">
              <Text fontSize="sm" fontWeight="600" noOfLines={1}>
                {session?.user?.name}
              </Text>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {session?.user?.role}
              </Text>
            </Box>
          </Flex>
        </Box>
      </VStack>
    </Box>
  );
}
