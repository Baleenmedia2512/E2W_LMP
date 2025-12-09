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
  Icon,
} from '@chakra-ui/react';
import { FiBell, FiEye, FiInfo, FiCheckCircle, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  isRead: boolean;
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

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const unreadCount = unreadNotifications.length;
  const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return { icon: FiCheckCircle, color: 'green.500' };
      case 'warning':
        return { icon: FiAlertTriangle, color: 'orange.500' };
      case 'error':
        return { icon: FiAlertCircle, color: 'red.500' };
      default:
        return { icon: FiInfo, color: 'blue.500' };
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-read', notificationId }),
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const userId = notifications[0]?.userId;
      if (!userId) return;

      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-all-read', userId }),
      });

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleViewAll = () => {
    router.push('/dashboard/notifications');
  };

  return (
    <Menu closeOnSelect={false}>
      <Box position="relative">
        <MenuButton
          as={IconButton}
          icon={<FiBell />}
          variant="ghost"
          aria-label="Notifications"
          size="md"
        />
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
            zIndex={1}
          >
            {displayCount}
          </Badge>
        )}
      </Box>
      <MenuList maxH="500px" overflowY="auto" minW="350px" maxW="400px">
        {/* Header */}
        <Box px={4} py={3} borderBottomWidth="1px">
          <HStack justify="space-between">
            <Text fontWeight="bold" fontSize="md">
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Button
                size="xs"
                variant="ghost"
                colorScheme="blue"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </Button>
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
              {notifications.map((notification) => {
                const { icon: NotificationIcon, color } = getNotificationIcon(notification.type);
                
                return (
                  <MenuItem
                    key={notification.id}
                    bg={notification.isRead ? 'transparent' : 'blue.50'}
                    _hover={{ bg: notification.isRead ? 'gray.50' : 'blue.100' }}
                    py={3}
                    px={4}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <HStack align="start" spacing={3} w="full">
                      <Icon as={NotificationIcon} color={color} mt={1} boxSize={5} />
                      <VStack align="stretch" spacing={1} flex="1">
                        <HStack justify="space-between" align="start">
                          <Text
                            fontWeight={notification.isRead ? 'normal' : 'bold'}
                            fontSize="sm"
                            flex="1"
                            color={notification.isRead ? 'gray.700' : 'blue.700'}
                          >
                            {notification.title}
                          </Text>
                          {!notification.isRead && (
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
                    </HStack>
                  </MenuItem>
                );
              })}
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

