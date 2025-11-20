'use client';

import React, { useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  Button,
  Spinner,
  Badge,
  Card,
  CardBody,
  Flex,
  IconButton,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { formatDistanceToNow } from 'date-fns';
import { FiCheck, FiCheckCircle, FiTrash2, FiEye } from 'react-icons/fi';

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
  readAt?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  // Fetch all notifications
  const { data: allData, mutate: mutateAll } = useSWR<{
    data: {
      notifications: Notification[];
      unreadCount: number;
      totalCount: number;
    };
  }>('/api/notifications?limit=100', fetcher);

  // Fetch unread notifications
  const { data: unreadData, mutate: mutateUnread } = useSWR<{
    data: {
      notifications: Notification[];
      unreadCount: number;
    };
  }>('/api/notifications?unreadOnly=true&limit=100', fetcher);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await fetch(`/api/notifications/mark-read/${notification.id}`, {
          method: 'PATCH',
        });
        mutateAll();
        mutateUnread();
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to lead details if leadId exists
    if (notification.metadata?.leadId) {
      router.push(`/dashboard/leads/${notification.metadata.leadId}`);
    }
  };

  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await fetch(`/api/notifications/mark-read/${notificationId}`, {
        method: 'PATCH',
      });
      
      toast({
        title: 'Marked as read',
        status: 'success',
        duration: 2000,
      });
      
      mutateAll();
      mutateUnread();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAllRead) return;

    setIsMarkingAllRead(true);
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
        mutateAll();
        mutateUnread();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const allNotifications = allData?.data?.notifications || [];
  const unreadNotifications = unreadData?.data?.notifications || [];
  const unreadCount = allData?.data?.unreadCount || 0;
  const isLoading = !allData && !unreadData;

  const NotificationCard = ({ notification }: { notification: Notification }) => (
    <Card
      cursor="pointer"
      onClick={() => handleNotificationClick(notification)}
      bg={notification.isRead ? 'white' : 'blue.50'}
      _hover={{ boxShadow: 'md', transform: 'translateY(-1px)' }}
      transition="all 0.2s"
      borderLeft="4px solid"
      borderColor={notification.isRead ? 'gray.200' : 'blue.500'}
    >
      <CardBody>
        <HStack justify="space-between" align="start" spacing={4}>
          <VStack align="stretch" spacing={2} flex="1">
            <HStack justify="space-between">
              <HStack spacing={3}>
                <Text
                  fontWeight={notification.isRead ? 'medium' : 'bold'}
                  fontSize="md"
                  color={notification.isRead ? 'gray.700' : 'blue.700'}
                >
                  {notification.title}
                </Text>
                {!notification.isRead && (
                  <Box w={2} h={2} borderRadius="full" bg="blue.500" />
                )}
              </HStack>
              <Badge
                colorScheme={
                  notification.type === 'new_lead_assigned' ? 'blue' :
                  notification.type === 'new_lead_created' ? 'green' :
                  'gray'
                }
              >
                {notification.type.replace(/_/g, ' ')}
              </Badge>
            </HStack>

            <Text fontSize="sm" color="gray.600">
              {notification.message}
            </Text>

            {notification.metadata && (
              <HStack spacing={4} flexWrap="wrap" fontSize="xs" color="gray.500">
                {notification.metadata.leadName && (
                  <Text>
                    <strong>Lead:</strong> {notification.metadata.leadName}
                  </Text>
                )}
                {notification.metadata.createdBy && (
                  <Text>
                    <strong>By:</strong> {notification.metadata.createdBy}
                  </Text>
                )}
                {notification.metadata.assignedTo && (
                  <Text>
                    <strong>Assigned:</strong> {notification.metadata.assignedTo}
                  </Text>
                )}
              </HStack>
            )}

            <HStack spacing={4} fontSize="xs" color="gray.500">
              <Text>
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </Text>
              {notification.readAt && (
                <>
                  <Text>•</Text>
                  <Text>
                    Read {formatDistanceToNow(new Date(notification.readAt), { addSuffix: true })}
                  </Text>
                </>
              )}
            </HStack>
          </VStack>

          {!notification.isRead && (
            <IconButton
              aria-label="Mark as read"
              icon={<FiCheck />}
              size="sm"
              colorScheme="blue"
              variant="ghost"
              onClick={(e) => handleMarkAsRead(notification.id, e)}
            />
          )}
        </HStack>
      </CardBody>
    </Card>
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="brand.500" />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={3}>
        <HStack spacing={3}>
          <Heading size={{ base: 'md', md: 'lg' }}>🔔 Notifications</Heading>
          {unreadCount > 0 && (
            <Badge colorScheme="red" borderRadius="full" px={3} py={1} fontSize="sm">
              {unreadCount} unread
            </Badge>
          )}
        </HStack>

        {unreadCount > 0 && (
          <Button
            leftIcon={<FiCheckCircle />}
            colorScheme="blue"
            size={{ base: 'sm', md: 'md' }}
            onClick={handleMarkAllRead}
            isLoading={isMarkingAllRead}
          >
            Mark all as read
          </Button>
        )}
      </Flex>

      {/* Tabs */}
      <Tabs colorScheme="blue" index={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab>
            All ({allNotifications.length})
          </Tab>
          <Tab>
            Unread ({unreadNotifications.length})
          </Tab>
        </TabList>

        <TabPanels>
          {/* All Notifications Tab */}
          <TabPanel px={0} pt={6}>
            {allNotifications.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {allNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </VStack>
            ) : (
              <Box textAlign="center" py={12}>
                <Text fontSize="lg" color="gray.500">
                  No notifications yet
                </Text>
                <Text fontSize="sm" color="gray.400" mt={2}>
                  You'll see notifications here when leads are assigned to you
                </Text>
              </Box>
            )}
          </TabPanel>

          {/* Unread Notifications Tab */}
          <TabPanel px={0} pt={6}>
            {unreadNotifications.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {unreadNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} />
                ))}
              </VStack>
            ) : (
              <Box textAlign="center" py={12}>
                <Text fontSize="lg" color="gray.500">
                  All caught up! 🎉
                </Text>
                <Text fontSize="sm" color="gray.400" mt={2}>
                  No unread notifications
                </Text>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
