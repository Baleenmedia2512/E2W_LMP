'use client';

import {
  Box,
  Flex,
  Text,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Badge,
  useColorModeValue,
  Button,
} from '@chakra-ui/react';
import { FiBell, FiLogOut, FiRotateCcw } from 'react-icons/fi';
import { signOut } from 'next-auth/react';
import { useApi, apiPost } from '@/lib/swr';
import { Notification } from '@/types';

export default function Header() {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const { data: notificationData, mutate } = useApi<{
    notifications: Notification[];
    unreadCount: number;
  }>('/api/notifications?unreadOnly=true');

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  const handleUndo = async () => {
    try {
      await apiPost('/api/undo', {});
      // Refresh the page or update state
      window.location.reload();
    } catch (error) {
      console.error('Undo failed:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await apiPost('/api/notifications', { markAllRead: true });
      mutate();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  return (
    <Box bg={bgColor} borderBottom="1px" borderColor={borderColor} px={6} py={4}>
      <Flex justify="space-between" align="center">
        <Text fontSize="lg" fontWeight="600">
          Welcome back!
        </Text>

        <Flex align="center" gap={3}>
          {/* Undo Button */}
          <Button
            leftIcon={<FiRotateCcw />}
            size="sm"
            variant="ghost"
            colorScheme="brand"
            onClick={handleUndo}
          >
            Undo
          </Button>

          {/* Notifications */}
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<FiBell />}
              variant="ghost"
              position="relative"
              aria-label="Notifications"
            >
              {notificationData && notificationData.unreadCount > 0 && (
                <Badge
                  position="absolute"
                  top="0"
                  right="0"
                  colorScheme="red"
                  borderRadius="full"
                  fontSize="xs"
                >
                  {notificationData.unreadCount}
                </Badge>
              )}
            </MenuButton>
            <MenuList maxH="400px" overflowY="auto">
              {notificationData && notificationData.notifications.length > 0 ? (
                <>
                  {notificationData.notifications.map((notification) => (
                    <MenuItem key={notification.id} flexDirection="column" alignItems="start">
                      <Text fontWeight="600" fontSize="sm">
                        {notification.title}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {notification.message}
                      </Text>
                    </MenuItem>
                  ))}
                  <MenuDivider />
                  <MenuItem onClick={markAllRead}>
                    <Text fontSize="sm" color="brand.500">
                      Mark all as read
                    </Text>
                  </MenuItem>
                </>
              ) : (
                <MenuItem>
                  <Text fontSize="sm" color="gray.500">
                    No new notifications
                  </Text>
                </MenuItem>
              )}
            </MenuList>
          </Menu>

          {/* Logout */}
          <IconButton
            icon={<FiLogOut />}
            variant="ghost"
            colorScheme="red"
            onClick={handleSignOut}
            aria-label="Sign out"
          />
        </Flex>
      </Flex>
    </Box>
  );
}
