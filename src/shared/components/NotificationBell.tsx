'use client';

import {
  Box,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Text,
  VStack,
  HStack,
  Button,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { FiBell, FiEye } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications?limit=50');
        if (!res.ok) throw new Error('Failed to fetch notifications');
        const data = await res.json();
        
        const notificationsList = Array.isArray(data) ? data : data.data || [];
        setNotifications(notificationsList);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadNotifications = notifications.filter(n => !n.read);
  const unreadCount = unreadNotifications.length;
  const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString();

  const handleViewAll = () => {
    router.push('/dashboard/notifications');
  };

  return (
    <Menu closeOnSelect={false}>
      <MenuButton
        as={IconButton}
        icon={<FiBell />}
        variant="ghost"
        position="relative"
        aria-label="Notifications"
        size="md"
      >
        {unreadCount > 0 && (
          <Badge
            position="absolute"
            top="-1"
            right="-1"
            colorScheme="red"
            borderRadius="full"
            fontSize="xs"
            px={1.5}
            minW="20px"
            textAlign="center"
          >
            {displayCount}
          </Badge>
        )}
      </MenuButton>
      <MenuList maxH="500px" overflowY="auto" minW="350px" maxW="400px">
        {/* Header */}
        <Box px={4} py={3} borderBottomWidth="1px">
          <HStack justify="space-between">
            <Text fontWeight="bold" fontSize="md">
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Badge colorScheme="red" borderRadius="full">
                {displayCount} new
              </Badge>
            )}
          </HStack>
        </Box>

        {/* Notifications List */}
        {loading ? (
          <Box py={8} textAlign="center">
            <Spinner size="sm" color="blue.500" />
          </Box>
        ) : notifications.length > 0 ? (
          <>
            <Box maxH="350px" overflowY="auto">
              {notifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  bg={notification.read ? 'transparent' : 'blue.50'}
                  _hover={{ bg: notification.read ? 'gray.50' : 'blue.100' }}
                  py={3}
                  px={4}
                >
                  <VStack align="stretch" spacing={1} w="full">
                    <HStack justify="space-between" align="start">
                      <Text
                        fontWeight={notification.read ? 'normal' : 'bold'}
                        fontSize="sm"
                        flex="1"
                        color={notification.read ? 'gray.700' : 'blue.700'}
                      >
                        {notification.title}
                      </Text>
                      {!notification.read && (
                        <Box w={2} h={2} borderRadius="full" bg="blue.500" mt={1} />
                      )}
                    </HStack>
                    <Text fontSize="xs" color="gray.600" noOfLines={2}>
                      {notification.message}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </Text>
                  </VStack>
                </MenuItem>
              ))}
            </Box>

            {/* Actions */}
            <Box px={3} py={2} borderTopWidth="1px">
              <Button
                size="sm"
                colorScheme="blue"
                variant="ghost"
                leftIcon={<FiEye />}
                onClick={handleViewAll}
                width="full"
              >
                View all
              </Button>
            </Box>
          </>
        ) : (
          <Box py={8} textAlign="center">
            <Text fontSize="sm" color="gray.500">
              No notifications
            </Text>
          </Box>
        )}
      </MenuList>
    </Menu>
  );
}

