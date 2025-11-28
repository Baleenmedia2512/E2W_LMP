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
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HiDotsVertical, HiEye } from 'react-icons/hi';
import { formatDateTime } from '@/shared/lib/date-utils';

interface CallLog {
  id: string;
  leadId: string;
  lead: {
    id: string;
    name: string;
    phone: string;
  };
  caller: {
    id: string;
    name: string;
    email: string;
  };
  duration: number | null;
  callStatus: string;
  remarks: string | null;
  startedAt: string;
  createdAt: string;
}

export default function CallsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCallLogs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/calls?limit=100');
        const result = await response.json();
        if (result.success) {
          setCallLogs(result.data);
        } else {
          setError(result.error || 'Failed to fetch call logs');
        }
      } catch (err) {
        setError('Failed to fetch call logs');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCallLogs();
  }, []);

  const filteredCalls = statusFilter === 'all' 
    ? callLogs 
    : callLogs.filter(c => c.callStatus === statusFilter);

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
          <option value="busy">Busy</option>
          <option value="ring_not_response">Ring Not Response</option>
        </Select>
      </HStack>

      {error && (
        <Box bg="red.50" p={4} borderRadius="lg" mb={4} color="red.700">
          {error}
        </Box>
      )}

      {loading && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">Loading call logs...</Text>
        </Box>
      )}

      {!loading && (
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
                    <Td fontWeight="medium">{call.lead.name}</Td>
                    <Td>{formatDateTime(call.createdAt)}</Td>
                    <Td>
                      {call.duration
                        ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                        : 'N/A'}
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={
                          call.callStatus === 'completed' 
                            ? 'green' 
                            : call.callStatus === 'busy' 
                            ? 'red' 
                            : 'orange'
                        }
                      >
                        {call.callStatus}
                      </Badge>
                    </Td>
                    <Td>{call.caller.name || 'N/A'}</Td>
                    <Td>
                      <Text noOfLines={2}>{call.remarks || '-'}</Text>
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
      )}
    </Box>
  );
}





