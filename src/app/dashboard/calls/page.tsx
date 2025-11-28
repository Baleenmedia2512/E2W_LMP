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
        const response = await fetch('/api/calls?limit=100');
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
  }, []);

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
    switch (status) {
      case 'completed':
        return 'green';
      case 'busy':
        return 'orange';
      case 'ring_not_response':
        return 'gray';
      default:
        return 'blue';
    }
  };

  const getCallStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Answer';
      case 'busy':
        return 'Busy';
      case 'ring_not_response':
        return 'Wrong Number';
      default:
        return status;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0m';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
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
              <option value="all">All Calls</option>
              <option value="completed">Answer</option>
              <option value="busy">Busy</option>
              <option value="ring_not_response">Wrong Number</option>
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
                  <Th>Phone</Th>
                  <Th>Date & Time</Th>
                  <Th>Duration</Th>
                  <Th>Status</Th>
                  <Th>Agent</Th>
                  <Th>Customer Requirement</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredCalls.length > 0 ? (
                  filteredCalls.map((call) => (
                    <Tr key={call.id} _hover={{ bg: 'gray.50' }}>
                      <Td fontWeight="medium" cursor="pointer" color="blue.600">
                        <Text
                          onClick={() => router.push(`/dashboard/leads/${call.leadId}`)}
                          _hover={{ textDecoration: 'underline' }}
                        >
                          {call.lead.name}
                        </Text>
                      </Td>
                      <Td>{call.lead.phone}</Td>
                      <Td fontSize="xs" whiteSpace="nowrap">
                        {formatDateTime(call.createdAt)}
                      </Td>
                      <Td>{formatDuration(call.duration)}</Td>
                      <Td>
                        <Badge colorScheme={getCallStatusColor(call.callStatus)}>
                          {getCallStatusLabel(call.callStatus)}
                        </Badge>
                      </Td>
                      <Td>{call.caller.name || 'N/A'}</Td>
                      <Td maxW="200px">
                        {call.customerRequirement ? (
                          <Tooltip label={call.customerRequirement} placement="top">
                            <Text
                              noOfLines={2}
                              fontSize="xs"
                              cursor="pointer"
                              color="blue.600"
                              onClick={() => handleShowRemark(call.customerRequirement)}
                              _hover={{ textDecoration: 'underline' }}
                            >
                              {call.customerRequirement}
                            </Text>
                          </Tooltip>
                        ) : (
                          <Text fontSize="xs" color="gray.500">-</Text>
                        )}
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
                    <Td colSpan={8} textAlign="center" py={8}>
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

      {/* Remark Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Customer Requirement / Remarks</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text whiteSpace="pre-wrap">{selectedRemark}</Text>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}





