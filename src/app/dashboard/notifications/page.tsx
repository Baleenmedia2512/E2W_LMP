'use client';

import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
} from '@chakra-ui/react';
import { FiBell } from 'react-icons/fi';
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
  return (
    <Box>
      <Heading size="lg" mb={6}>
        Notifications
      </Heading>

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
            notifications.map((notification) => (
              <Box
                key={notification.id}
                bg="white"
                p={4}
                borderRadius="lg"
                boxShadow="sm"
                borderLeft="4px"
                borderColor={notification.isRead ? 'gray.200' : 'blue.500'}
              >
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <Icon as={FiBell} color={notification.isRead ? 'gray.400' : 'blue.500'} />
                    <Text fontWeight={notification.isRead ? 'normal' : 'bold'}>
                      {notification.title}
                    </Text>
                  </HStack>
                  {!notification.isRead && <Badge colorScheme="blue">New</Badge>}
                </HStack>
                <Text fontSize="sm" color="gray.600" mb={2}>
                  {notification.message}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {formatDateTime(notification.createdAt)}
                </Text>
              </Box>
            ))
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





