'use client';

import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Button,
  useToast,
} from '@chakra-ui/react';
import { FiBell, FiInfo, FiCheckCircle, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';
import { formatDateTime } from '@/shared/lib/date-utils';
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/notifications?limit=100');
        const result = await response.json();
        if (result.success) {
          setNotifications(result.data);
        } else {
          setError(result.error || 'Failed to fetch notifications');
        }
      } catch (err) {
        setError('Failed to fetch notifications');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return { icon: FiCheckCircle, color: 'green.500', bgColor: 'green.50', borderColor: 'green.500' };
      case 'warning':
        return { icon: FiAlertTriangle, color: 'orange.500', bgColor: 'orange.50', borderColor: 'orange.500' };
      case 'error':
        return { icon: FiAlertCircle, color: 'red.500', bgColor: 'red.50', borderColor: 'red.500' };
      default:
        return { icon: FiInfo, color: 'blue.500', bgColor: 'blue.50', borderColor: 'blue.500' };
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-read', notificationId }),
      });

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

  const unreadCount = notifications.filter(n => !n.isRead).length;
  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Notifications</Heading>
        {unreadCount > 0 && (
          <Button
            size="sm"
            colorScheme="blue"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read ({unreadCount})
          </Button>
        )}
      </HStack>

      {error && (
        <Box bg="red.50" p={4} borderRadius="lg" mb={4} color="red.700">
          {error}
        </Box>
      )}

      {loading && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">Loading notifications...</Text>
        </Box>
      )}

      {!loading && (
        <VStack spacing={4} align="stretch">
          {notifications.length > 0 ? (
            notifications.map((notification) => {
              const { icon: NotificationIcon, color, bgColor, borderColor } = getNotificationIcon(notification.type);
              
              return (
                <Box
                  key={notification.id}
                  bg={notification.isRead ? 'white' : bgColor}
                  p={4}
                  borderRadius="lg"
                  boxShadow="sm"
                  borderLeft="4px"
                  borderColor={notification.isRead ? 'gray.200' : borderColor}
                  cursor="pointer"
                  onClick={() => handleNotificationClick(notification.id)}
                  _hover={{ boxShadow: 'md' }}
                  transition="all 0.2s"
                >
                  <HStack align="start" spacing={3}>
                    <Icon 
                      as={NotificationIcon} 
                      color={notification.isRead ? 'gray.400' : color} 
                      boxSize={5}
                      mt={0.5}
                    />
                    <VStack align="stretch" spacing={2} flex="1">
                      <HStack justify="space-between">
                        <Text fontWeight={notification.isRead ? 'normal' : 'bold'}>
                          {notification.title}
                        </Text>
                        {!notification.isRead && <Badge colorScheme="blue">New</Badge>}
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        {notification.message}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatDateTime(notification.createdAt)}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              );
            })
          ) : (
            <Box textAlign="center" py={8}>
              <Text color="gray.500">No notifications yet</Text>
            </Box>
          )}
        </VStack>
      )}
    </Box>
  );
}





