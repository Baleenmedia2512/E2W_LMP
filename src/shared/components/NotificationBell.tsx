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
  readAt: string | null;
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications?limit=50');
        if (!res.ok) throw new Error('Failed to fetch notifications');
        const data = await res.json();
        
        const notificationsList = Array.isArray(data) ? data : data.data || [];
        
        // Check if there are new unread notifications
        const prevUnreadCount = notifications.filter(n => !n.isRead).length;
        const newUnreadCount = notificationsList.filter((n: Notification) => !n.isRead).length;
        
        // Show toast for new notifications (only if we had notifications before)
        if (notifications.length > 0 && newUnreadCount > prevUnreadCount) {
          const newNotifications = notificationsList.filter(
            (n: Notification) => !n.isRead && !notifications.find(old => old.id === n.id)
          );
          
          if (newNotifications.length > 0) {
            const latestNotification = newNotifications[0];
            toast({
              title: latestNotification.title,
              description: latestNotification.message,
              status: latestNotification.type as any,
              duration: 5000,
              isClosable: true,
              position: 'top-right',
            });
          }
        }
        
        setNotifications(notificationsList);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Real-time polling: Check every 10 seconds for new notifications
    const interval = setInterval(() => {
      if (isPolling) {
        fetchNotifications();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [toast, isPolling, notifications.length]);

  // Pause polling when page is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPolling(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
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

      // Update local state with readAt timestamp
      const now = new Date().toISOString();
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true, readAt: now } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const userId = notifications[0]?.userId;
      if (!userId) return;

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-all-read', userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }

      // Update local state with readAt timestamp
      const now = new Date().toISOString();
      setNotifications(prev => prev.map(n => ({ 
        ...n, 
        isRead: true,
        readAt: now
      })));
      
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

  const handleClearAll = async () => {
    try {
      const userId = notifications[0]?.userId;
      if (!userId) return;

      await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-all', userId }),
      });

      // Update local state
      setNotifications([]);
      
      toast({
        title: 'Success',
        description: 'All notifications cleared',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear notifications',
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
            <HStack spacing={1}>
              {unreadCount > 0 && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="blue"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={handleClearAll}
                >
                  Clear all
                </Button>
              )}
            </HStack>
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

