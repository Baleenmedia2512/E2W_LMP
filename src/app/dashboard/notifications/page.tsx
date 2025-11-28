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
import { mockNotifications } from '@/shared/lib/mock-data';
import { formatDateTime } from '@/shared/lib/date-utils';

export default function NotificationsPage() {
  return (
    <Box>
      <Heading size="lg" mb={6}>
        Notifications
      </Heading>

      <VStack spacing={4} align="stretch">
        {mockNotifications.map((notification) => (
          <Box
            key={notification.id}
            bg="white"
            p={4}
            borderRadius="lg"
            boxShadow="sm"
            borderLeft="4px"
            borderColor={notification.read ? 'gray.200' : 'blue.500'}
          >
            <HStack justify="space-between" mb={2}>
              <HStack>
                <Icon as={FiBell} color={notification.read ? 'gray.400' : 'blue.500'} />
                <Text fontWeight={notification.read ? 'normal' : 'bold'}>
                  {notification.title}
                </Text>
              </HStack>
              {!notification.read && <Badge colorScheme="blue">New</Badge>}
            </HStack>
            <Text fontSize="sm" color="gray.600" mb={2}>
              {notification.message}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {formatDateTime(notification.createdAt)}
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}





