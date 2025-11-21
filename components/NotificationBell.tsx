'use client';

import {
  Box,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Badge,
  Text,
  VStack,
  HStack,
  Spinner,
  Button,
  useToast,
} from '@chakra-ui/react';
import { FiBell, FiCheck, FiEye } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { playNotificationSound, requestNotificationPermission, showDesktopNotification } from '@/lib/notifications';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: {
    leadId?: string;
    leadName?: string;
    createdBy?: string;
    assignedTo?: string;
  };
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const toast = useToast();
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const previousUnreadCount = useRef<number>(0);

  // Fetch unread count for badge
  const { data: countData, mutate: mutateCount } = useSWR<{ data: { unreadCount: number } }>(
    '/api/notifications/unread-count',
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Fetch notifications for dropdown
  const { data: notificationsData, mutate: mutateNotifications } = useSWR<{
    data: {
      notifications: Notification[];
      unreadCount: number;
    };
  }>('/api/notifications?limit=10', fetcher);

  const unreadCount = countData?.data?.unreadCount || 0;
  const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString();

  // Play sound and show desktop notification when new notifications arrive
  useEffect(() => {
    // Only trigger on unread count increase (not on first load)
    if (unreadCount > previousUnreadCount.current && previousUnreadCount.current > 0) {
      const newNotifications = notificationsData?.data?.notifications?.filter(n => !n.isRead) || [];
      
      if (newNotifications.length > 0) {
        const latestNotification = newNotifications[0];
        
        // Play different sounds based on notification type
        if (latestNotification.type === 'lead_assigned' || 
            latestNotification.type === 'assignment' || 
            latestNotification.type === 'new_lead') {
          playNotificationSound('new_lead');
          
          // Show desktop notification
          showDesktopNotification(latestNotification.title, {
            body: latestNotification.message,
            tag: latestNotification.id,
            requireInteraction: true,
            playSound: false, // Already played above
            soundType: 'new_lead',
          });
        } else if (latestNotification.type === 'follow_up_due') {
          playNotificationSound('follow_up');
          
          showDesktopNotification(latestNotification.title, {
            body: latestNotification.message,
            tag: latestNotification.id,
            playSound: false,
            soundType: 'follow_up',
          });
        } else {
          playNotificationSound('general');
        }
      }
    }
    
    // Update the ref AFTER checking
    previousUnreadCount.current = unreadCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount]); // Only depend on unreadCount, not notificationsData

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await fetch(`/api/notifications/mark-read/${notification.id}`, {
          method: 'PATCH',
        });
        mutateNotifications();
        mutateCount();
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to lead details if leadId exists
    if (notification.metadata?.leadId) {
      router.push(`/dashboard/leads/${notification.metadata.leadId}`);
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingRead) return;

    setIsMarkingRead(true);
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'All notifications marked as read',
          status: 'success',
          duration: 2000,
        });
        mutateNotifications();
        mutateCount();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notifications as read',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleViewAll = () => {
    router.push('/dashboard/notifications');
  };

  const notifications = notificationsData?.data?.notifications || [];

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
              <HStack spacing={2}>
                <Badge colorScheme="red" borderRadius="full">
                  {displayCount} new
                </Badge>
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="blue"
                  leftIcon={<FiCheck />}
                  onClick={handleMarkAllRead}
                  isLoading={isMarkingAllRead}
                  loadingText="Marking..."
                >
                  Mark all read
                </Button>
              </HStack>
            )}
          </HStack>
        </Box>

        {/* Notifications List */}
        {notifications.length > 0 ? (
          <>
            <Box maxH="350px" overflowY="auto">
              {notifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  bg={notification.isRead ? 'transparent' : 'blue.50'}
                  _hover={{ bg: notification.isRead ? 'gray.50' : 'blue.100' }}
                  py={3}
                  px={4}
                >
                  <VStack align="stretch" spacing={1} w="full">
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
                    <HStack spacing={2} fontSize="xs" color="gray.500">
                      <Text>
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </Text>
                      {notification.metadata?.leadName && (
                        <>
                          <Text>•</Text>
                          <Text fontWeight="medium" color="gray.600">
                            {notification.metadata.leadName}
                          </Text>
                        </>
                      )}
                    </HStack>
                  </VStack>
                </MenuItem>
              ))}
            </Box>

            {/* Actions */}
            <MenuDivider />
            <Box px={3} py={2}>
              <HStack spacing={2}>
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<FiCheck />}
                    onClick={handleMarkAllRead}
                    isLoading={isMarkingRead}
                    flex="1"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="ghost"
                  leftIcon={<FiEye />}
                  onClick={handleViewAll}
                  flex="1"
                >
                  View all
                </Button>
              </HStack>
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
