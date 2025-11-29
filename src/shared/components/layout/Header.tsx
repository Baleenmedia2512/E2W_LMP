'use client';

import {
  Box,
  Flex,
  Text,
  IconButton,
  useColorModeValue,
  Button,
  useBreakpointValue,
  HStack,
  Tooltip,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  Avatar,
} from '@chakra-ui/react';
import { FiLogOut, FiRotateCcw, FiMenu, FiUser, FiSettings } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/shared/components/NotificationBell';
import { useAuth } from '@/shared/lib/auth/auth-context';
import { useEffect, useState } from 'react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const isMobile = useBreakpointValue({ base: true, lg: false });
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleSettings = () => {
    router.push('/dashboard/settings');
  };

  return (
    <Box bg={bgColor} borderBottom="1px" borderColor={borderColor} px={{ base: 4, md: 6 }} py={{ base: 3, md: 4 }}>
      <Flex justify="space-between" align="center">
        <HStack spacing={3}>
          {isMobile && (
            <IconButton
              icon={<FiMenu />}
              variant="ghost"
              onClick={onMenuClick}
              aria-label="Open menu"
              size="md"
            />
          )}
          <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="600" display={{ base: 'none', sm: 'block' }}>
            Welcome back!
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="brand.500" display={{ base: 'block', sm: 'none' }}>
            E2W
          </Text>
        </HStack>

        <Flex align="center" gap={{ base: 2, md: 3 }}>
          {/* Notifications Bell */}
          <NotificationBell />

          {/* User Menu */}
          {user && (
            <Menu>
              <MenuButton as={Button} rounded="full" cursor="pointer" minW={0} p={0}>
                <Avatar
                  size="sm"
                  name={user.name || user.email}
                  src={user.image || undefined}
                  bg="purple.500"
                />
              </MenuButton>
              <MenuList>
                <MenuItem isDisabled>
                  <Flex direction="column">
                    <Text fontWeight="600">{user.name || 'User'}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {user.role}
                    </Text>
                  </Flex>
                </MenuItem>
                <Divider my={2} />
                <MenuItem icon={<FiUser />} onClick={() => router.push('/dashboard/settings')}>
                  Profile
                </MenuItem>
                <MenuItem icon={<FiSettings />} onClick={handleSettings}>
                  Settings
                </MenuItem>
                <Divider my={2} />
                <MenuItem icon={<FiLogOut />} onClick={handleLogout} color="red.500">
                  Logout
                </MenuItem>
              </MenuList>
            </Menu>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}






