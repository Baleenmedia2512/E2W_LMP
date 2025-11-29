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
  InputGroup,
  InputLeftElement,
  Input,
  VStack,
  Tooltip,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { HiDotsVertical, HiEye, HiSearch } from 'react-icons/hi';
import { formatDateTime, formatDate } from '@/shared/lib/date-utils';

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
  customerRequirement: string | null;
  startedAt: string;
  createdAt: string;
}

export default function CallsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedRemark, setSelectedRemark] = useState<string | null>(null);

  useEffect(() => {
    const fetchCallLogs = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ limit: '100' });
        if (statusFilter !== 'all') {
          params.append('status', statusFilter);
        }
        const response = await fetch(`/api/calls?${params.toString()}`);
        const result = await response.json();
        if (result.success) {
          // Sort by createdAt in descending order (most recent first)
          const sorted = [...result.data].sort((a: CallLog, b: CallLog) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setCallLogs(sorted);
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
  }, [statusFilter]);

  // Filter and search
  const filteredCalls = useMemo(() => {
    let filtered = callLogs;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.callStatus === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.lead.name.toLowerCase().includes(query) ||
        c.lead.phone.toLowerCase().includes(query) ||
        c.caller.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [callLogs, statusFilter, searchQuery]);

  const getCallStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'answer':
      case 'completed':
        return 'green';
      case 'busy':
        return 'orange';
      case 'wrong_number':
        return 'gray';
      case 'ring_not_response':
        return 'red';
      default:
        return 'blue';
    }
  };

  const getCallStatusLabel = (status: string) => {
    if (!status) return 'Unknown';
    switch (status.toLowerCase()) {
      case 'answer':
        return 'Answer';
      case 'completed':
        return 'Completed';
      case 'busy':
        return 'Busy';
      case 'wrong_number':
        return 'Wrong Number';
      case 'ring_not_response':
        return 'Ring Not Response';
      default:
        // Handle any status by capitalizing first letter
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds || seconds === 0) return '0';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}`;
    return `${mins}.${Math.floor((secs / 60) * 100)}`;
  };

  const handleShowRemark = (remark: string | null) => {
    setSelectedRemark(remark);
    onOpen();
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={3}>
        <Heading size="lg">Call History</Heading>
      </HStack>

      {error && (
        <Box bg="red.50" p={4} borderRadius="lg" mb={4} color="red.700">
          {error}
        </Box>
      )}

      {/* Filters */}
      <Box bg="white" p={4} borderRadius="lg" boxShadow="sm" mb={4}>
        <VStack spacing={3} align="stretch">
          <HStack spacing={3} flexWrap="wrap">
            <InputGroup maxW={{ base: 'full', md: '300px' }} flex={{ base: '1 1 100%', md: '0 1 auto' }}>
              <InputLeftElement>
                <HiSearch />
              </InputLeftElement>
              <Input
                placeholder="Search lead name, phone or agent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="sm"
              />
            </InputGroup>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              maxW={{ base: 'full', sm: '200px' }}
              flex={{ base: '1 1 48%', md: '0 1 auto' }}
              size="sm"
            >
              <option value="all">All Status</option>
              <option value="answer">Answer</option>
              <option value="busy">Busy</option>
              <option value="wrong_number">Wrong Number</option>
              <option value="ring_not_response">Ring Not Response</option>
              <option value="completed">Completed</option>
            </Select>
          </HStack>

          {(searchQuery || statusFilter !== 'all') && (
            <HStack>
              <Text fontSize="sm" color="gray.600">
                Showing {filteredCalls.length} of {callLogs.length} calls
              </Text>
            </HStack>
          )}
        </VStack>
      </Box>

      {loading && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">Loading call logs...</Text>
        </Box>
      )}

      {!loading && (
        <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Lead Name</Th>
                  <Th>Date/Time</Th>
                  <Th>Duration (min)</Th>
                  <Th>Status</Th>
                  <Th>Customer Requirement</Th>
                  <Th>Agent Name</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredCalls.length > 0 ? (
                  filteredCalls.map((call) => (
                    <Tr key={call.id} _hover={{ bg: 'gray.50' }}>
                      <Td>
                        <Text
                          fontWeight="medium"
                          cursor="pointer"
                          color="blue.600"
                          onClick={() => router.push(`/dashboard/leads/${call.leadId}`)}
                          _hover={{ textDecoration: 'underline' }}
                        >
                          {call.lead.name}
                        </Text>
                      </Td>
                      <Td fontSize="sm" whiteSpace="nowrap">
                        {formatDateTime(call.createdAt)}
                      </Td>
                      <Td>{formatDuration(call.duration)}</Td>
                      <Td>
                        <Badge colorScheme={getCallStatusColor(call.callStatus)}>
                          {getCallStatusLabel(call.callStatus)}
                        </Badge>
                      </Td>
                      <Td maxW="250px">
                        {call.customerRequirement ? (
                          <Tooltip label="Click to view full text" placement="top" hasArrow>
                            <Text
                              noOfLines={2}
                              fontSize="sm"
                              cursor="pointer"
                              onClick={() => handleShowRemark(call.customerRequirement)}
                              _hover={{ color: 'blue.600' }}
                            >
                              {call.customerRequirement}
                            </Text>
                          </Tooltip>
                        ) : (
                          <Text fontSize="sm" color="gray.400">-</Text>
                        )}
                      </Td>
                      <Td>{call.caller.name || 'N/A'}</Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<HiDotsVertical />}
                            variant="ghost"
                            size="sm"
                            aria-label="Actions"
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
                      <Text color="gray.500">
                        {searchQuery || statusFilter !== 'all'
                          ? 'No call logs match your filters'
                          : 'No call logs found'}
                      </Text>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>

          {filteredCalls.length > 0 && (
            <Box p={4} borderTopWidth="1px">
              <Text fontSize="sm" color="gray.600">
                Showing {filteredCalls.length} call{filteredCalls.length !== 1 ? 's' : ''}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Customer Requirement Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Customer Requirement Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Box 
              bg="gray.50" 
              p={4} 
              borderRadius="md" 
              border="1px solid" 
              borderColor="gray.200"
            >
              <Text whiteSpace="pre-wrap" fontSize="md">
                {selectedRemark || 'No customer requirement provided'}
              </Text>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}





