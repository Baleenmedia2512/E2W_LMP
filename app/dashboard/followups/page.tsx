'use client';

import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Select,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiDotsVertical, HiEye, HiCheck, HiX, HiPlus } from 'react-icons/hi';
import { mockFollowUps, updateFollowUpStatus } from '@/lib/mock-data';
import { formatDateTime } from '@/lib/date-utils';

export default function FollowUpsPage() {
  const router = useRouter();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredFollowUps = statusFilter === 'all' 
    ? mockFollowUps 
    : mockFollowUps.filter(f => f.status === statusFilter);

  const handleMarkCompleted = (id: string, leadName: string) => {
    updateFollowUpStatus(id, 'completed');
    toast({
      title: 'Follow-up marked complete',
      description: `Follow-up with ${leadName} has been marked as completed`,
      status: 'success',
      duration: 3000,
    });
    setTimeout(() => window.location.reload(), 500);
  };

  const handleMarkCancelled = (id: string, leadName: string) => {
    updateFollowUpStatus(id, 'cancelled');
    toast({
      title: 'Follow-up cancelled',
      description: `Follow-up with ${leadName} has been cancelled`,
      status: 'info',
      duration: 3000,
    });
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>Follow-ups</Heading>
        <HStack spacing={3} flexWrap="wrap">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            maxW="200px"
            minW="150px"
            size={{ base: 'sm', md: 'md' }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </HStack>
      </HStack>

      <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
        <Box overflowX="auto">
        <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
          <Thead bg="gray.50">
            <Tr>
              <Th>Lead Name</Th>
              <Th display={{ base: 'none', sm: 'table-cell' }}>Scheduled At</Th>
              <Th display={{ base: 'none', md: 'table-cell' }}>Priority</Th>
              <Th>Status</Th>
              <Th display={{ base: 'none', lg: 'table-cell' }}>Notes</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredFollowUps.length > 0 ? (
              filteredFollowUps.map((followup) => (
                <Tr key={followup.id} _hover={{ bg: 'gray.50' }}>
                  <Td fontWeight="medium" fontSize={{ base: 'xs', md: 'sm' }}>{followup.leadName}</Td>
                  <Td fontSize={{ base: 'xs', md: 'sm' }} display={{ base: 'none', sm: 'table-cell' }}>{formatDateTime(followup.scheduledFor)}</Td>
                  <Td display={{ base: 'none', md: 'table-cell' }}>
                    <Badge
                      colorScheme={
                        followup.priority === 'high'
                          ? 'red'
                          : followup.priority === 'medium'
                          ? 'orange'
                          : 'gray'
                      }
                    >
                      {followup.priority}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={
                        followup.status === 'completed'
                          ? 'green'
                          : followup.status === 'pending'
                          ? 'yellow'
                          : 'gray'
                      }
                      fontSize={{ base: 'xs', md: 'sm' }}
                    >
                      {followup.status}
                    </Badge>
                  </Td>
                  <Td display={{ base: 'none', lg: 'table-cell' }}>
                    <Text noOfLines={2} fontSize={{ base: 'xs', md: 'sm' }}>{followup.notes || '-'}</Text>
                  </Td>
                  <Td>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<HiDotsVertical />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem
                          icon={<HiEye />}
                          onClick={() => router.push(`/dashboard/leads/${followup.leadId}`)}
                        >
                          View Lead
                        </MenuItem>
                        {followup.status === 'pending' && (
                          <>
                            <MenuItem
                              icon={<HiCheck />}
                              onClick={() => handleMarkCompleted(followup.id, followup.leadName)}
                            >
                              Mark Complete
                            </MenuItem>
                            <MenuItem
                              icon={<HiX />}
                              onClick={() => handleMarkCancelled(followup.id, followup.leadName)}
                            >
                              Cancel
                            </MenuItem>
                          </>
                        )}
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={6} textAlign="center" py={8}>
                  <Text color="gray.500">No follow-ups found</Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
        </Box>

        {filteredFollowUps.length > 0 && (
          <Box p={4} borderTopWidth="1px">
            <Text fontSize="sm" color="gray.600">
              Showing {filteredFollowUps.length} follow-up{filteredFollowUps.length !== 1 ? 's' : ''}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
