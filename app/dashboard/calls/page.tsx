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
  HStack,
  Select,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiDotsVertical, HiEye } from 'react-icons/hi';
import { mockCallLogs } from '@/lib/mock-data';
import { formatDateTime } from '@/lib/date-utils';

export default function CallsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCalls = statusFilter === 'all' 
    ? mockCallLogs 
    : mockCallLogs.filter(c => c.status === statusFilter);

  return (
    <Box>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={3}>
        <Heading size="lg">Call Logs</Heading>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          maxW="200px"
          size="sm"
        >
          <option value="all">All Calls</option>
          <option value="completed">Completed</option>
          <option value="missed">Missed</option>
          <option value="voicemail">Voicemail</option>
        </Select>
      </HStack>

      <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
        <Table variant="simple">
          <Thead bg="gray.50">
            <Tr>
              <Th>Lead Name</Th>
              <Th>Date & Time</Th>
              <Th>Duration</Th>
              <Th>Status</Th>
              <Th>Agent</Th>
              <Th>Notes</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredCalls.length > 0 ? (
              filteredCalls.map((call) => (
                <Tr key={call.id} _hover={{ bg: 'gray.50' }}>
                  <Td fontWeight="medium">{call.leadName}</Td>
                  <Td>{formatDateTime(call.createdAt)}</Td>
                  <Td>
                    {call.duration
                      ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                      : 'N/A'}
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={
                        call.status === 'completed' 
                          ? 'green' 
                          : call.status === 'missed' 
                          ? 'red' 
                          : 'orange'
                      }
                    >
                      {call.status}
                    </Badge>
                  </Td>
                  <Td>{call.userName || 'N/A'}</Td>
                  <Td>
                    <Text noOfLines={2}>{call.notes || '-'}</Text>
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
                          onClick={() => router.push(`/dashboard/leads/${call.leadId}`)}
                        >
                          View Lead
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={7} textAlign="center" py={8}>
                  <Text color="gray.500">No call logs found</Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>

        {filteredCalls.length > 0 && (
          <Box p={4} borderTopWidth="1px">
            <Text fontSize="sm" color="gray.600">
              Showing {filteredCalls.length} call{filteredCalls.length !== 1 ? 's' : ''}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
