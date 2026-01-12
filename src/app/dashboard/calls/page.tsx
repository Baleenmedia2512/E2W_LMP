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
  SimpleGrid,
  Card,
  CardBody,
  Flex,
  Divider,
  ButtonGroup,
  Button,
} from '@chakra-ui/react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HiDotsVertical, HiEye, HiSearch, HiViewGrid, HiViewList } from 'react-icons/hi';
import { formatDateTime, formatDate } from '@/shared/lib/date-utils';
import { formatPhoneForDisplay } from '@/shared/utils/phone';

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

interface CallHistoryGroup {
  leadId: string;
  leadName: string;
  leadPhone: string;
  latestCall: CallLog;
  totalAttempts: number;
  allCalls: CallLog[];
}

export default function CallsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlDateFilter = searchParams.get('date');
  
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<string>(urlDateFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedRemark, setSelectedRemark] = useState<string | null>(null);
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure();
  const [selectedLeadHistory, setSelectedLeadHistory] = useState<CallLog[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'tile'>('table');

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

  // Group calls by lead and get latest attempt for each
  const groupedCalls = useMemo(() => {
    const groups = new Map<string, CallHistoryGroup>();
    
    callLogs.forEach(call => {
      if (!groups.has(call.leadId)) {
        groups.set(call.leadId, {
          leadId: call.leadId,
          leadName: call.lead.name,
          leadPhone: call.lead.phone,
          latestCall: call,
          totalAttempts: 1,
          allCalls: [call],
        });
      } else {
        const group = groups.get(call.leadId)!;
        group.allCalls.push(call);
        group.totalAttempts++;
        // Update latest call if this one is more recent
        if (new Date(call.createdAt) > new Date(group.latestCall.createdAt)) {
          group.latestCall = call;
        }
      }
    });
    
    return Array.from(groups.values());
  }, [callLogs]);

  // Filter and search
  const filteredCalls = useMemo(() => {
    let filtered = groupedCalls;

    // Date filter - filter by call date
    if (dateFilter === 'today') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      filtered = filtered.filter(g => {
        const callDate = new Date(g.latestCall.createdAt);
        return callDate >= todayStart && callDate <= todayEnd;
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(g => g.latestCall.callStatus === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.leadName?.toLowerCase().includes(query) ||
        g.leadPhone?.toLowerCase().includes(query) ||
        g.latestCall?.caller?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [groupedCalls, statusFilter, searchQuery, dateFilter]);

  const getCallStatusColor = (status: string) => {
    if (!status) return 'gray';
    switch (status?.toLowerCase()) {
      case 'answer':
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

  const handleViewHistory = (calls: CallLog[]) => {
    // Sort calls by date descending (most recent first)
    const sorted = [...calls].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setSelectedLeadHistory(sorted);
    onHistoryOpen();
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>Call History</Heading>
        <ButtonGroup size={{ base: 'xs', sm: 'sm' }} isAttached variant="outline">
          <Button
            leftIcon={<HiViewList />}
            onClick={() => setViewMode('table')}
            colorScheme={viewMode === 'table' ? 'blue' : 'gray'}
            variant={viewMode === 'table' ? 'solid' : 'outline'}
            fontSize={{ base: 'xs', sm: 'sm' }}
          >
            Table
          </Button>
          <Button
            leftIcon={<HiViewGrid />}
            onClick={() => setViewMode('tile')}
            colorScheme={viewMode === 'tile' ? 'blue' : 'gray'}
            variant={viewMode === 'tile' ? 'solid' : 'outline'}
            fontSize={{ base: 'xs', sm: 'sm' }}
          >
            Tiles
          </Button>
        </ButtonGroup>
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
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              maxW={{ base: 'full', sm: '150px' }}
              flex={{ base: '1 1 48%', md: '0 1 auto' }}
              size="sm"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
            </Select>

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
            </Select>
          </HStack>

          {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all') && (
            <HStack>
              <Text fontSize="sm" color="gray.600">
                Showing {filteredCalls.length} of {groupedCalls.length} leads
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

      {!loading && viewMode === 'table' && (
        <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          <Box overflowX="auto" mx={{ base: -4, md: 0 }}>
            <Table variant="simple" size={{ base: 'sm', md: 'sm' }}>
              <Thead bg="gray.50">
                <Tr>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Lead Name</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} display={{ base: 'none', sm: 'table-cell' }}>Last Called</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Attempts</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} display={{ base: 'none', md: 'table-cell' }}>Duration (min)</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Status</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} display={{ base: 'none', lg: 'table-cell' }}>Agent Name</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredCalls.length > 0 ? (
                  filteredCalls.map((group) => (
                    <Tr key={group.leadId} _hover={{ bg: 'gray.50' }}>
                      <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                        <Text
                          fontWeight="medium"
                          cursor="pointer"
                          color="blue.600"
                          onClick={() => router.push(`/dashboard/leads/${group.leadId}`)}
                          _hover={{ textDecoration: 'underline' }}
                          noOfLines={1}
                        >
                          {group.leadName}
                        </Text>
                      </Td>
                      <Td fontSize={{ base: 'xs', sm: 'sm' }} whiteSpace="nowrap" px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }} display={{ base: 'none', sm: 'table-cell' }}>
                        {formatDateTime(group.latestCall.createdAt)}
                      </Td>
                      <Td px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                        <Badge colorScheme="purple" variant="subtle" fontSize={{ base: '0.6rem', sm: 'xs' }}>
                          {group.totalAttempts}
                        </Badge>
                      </Td>
                      <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }} display={{ base: 'none', md: 'table-cell' }}>
                        {formatDuration(group.latestCall.duration)}
                      </Td>
                      <Td px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                        <Badge colorScheme={getCallStatusColor(group.latestCall.callStatus)} fontSize={{ base: '0.6rem', sm: 'xs' }}>
                          {getCallStatusLabel(group.latestCall.callStatus)}
                        </Badge>
                      </Td>
                      <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }} display={{ base: 'none', lg: 'table-cell' }}>
                        <Text noOfLines={1}>{group.latestCall.caller.name || 'N/A'}</Text>
                      </Td>
                      <Td px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<HiDotsVertical />}
                            variant="ghost"
                            size={{ base: 'xs', sm: 'sm' }}
                            aria-label="Actions"
                          />
                          <MenuList>
                            {group.totalAttempts > 1 && (
                              <MenuItem
                                icon={<HiEye />}
                                onClick={() => handleViewHistory(group.allCalls)}
                                fontSize={{ base: 'xs', sm: 'sm' }}
                              >
                                View All Calls ({group.totalAttempts})
                              </MenuItem>
                            )}
                            <MenuItem
                              icon={<HiEye />}
                              onClick={() => router.push(`/dashboard/leads/${group.leadId}`)}
                              fontSize={{ base: 'xs', sm: 'sm' }}
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
                      <Text color="gray.500" fontSize={{ base: 'xs', sm: 'sm' }}>
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
            <Box p={{ base: 3, md: 4 }} borderTopWidth="1px">
              <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.600">
                Showing {filteredCalls.length} lead{filteredCalls.length !== 1 ? 's' : ''} with {filteredCalls.reduce((sum, g) => sum + g.totalAttempts, 0)} total call{filteredCalls.reduce((sum, g) => sum + g.totalAttempts, 0) !== 1 ? 's' : ''}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {!loading && viewMode === 'tile' && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
          {filteredCalls.length > 0 ? (
            filteredCalls.map((group) => (
              <Card
                key={group.leadId}
                variant="outline"
                _hover={{ boxShadow: 'md', borderColor: 'blue.300' }}
                transition="all 0.2s"
              >
                <CardBody>
                  <VStack align="stretch" spacing={3}>
                    {/* Header */}
                    <Flex justify="space-between" align="start">
                      <Box flex="1">
                        <Text
                          fontSize="lg"
                          fontWeight="bold"
                          color="blue.600"
                          cursor="pointer"
                          onClick={() => router.push(`/dashboard/leads/${group.leadId}`)}
                          _hover={{ textDecoration: 'underline' }}
                          mb={1}
                        >
                          {group.leadName}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          {formatPhoneForDisplay(group.leadPhone)}
                        </Text>
                      </Box>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<HiDotsVertical />}
                          variant="ghost"
                          size="sm"
                          aria-label="Actions"
                        />
                        <MenuList>
                          {group.totalAttempts > 1 && (
                            <MenuItem
                              icon={<HiEye />}
                              onClick={() => handleViewHistory(group.allCalls)}
                            >
                              View All Calls ({group.totalAttempts})
                            </MenuItem>
                          )}
                          <MenuItem
                            icon={<HiEye />}
                            onClick={() => router.push(`/dashboard/leads/${group.leadId}`)}
                          >
                            View Lead
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Flex>

                    <Divider />

                    {/* Stats Row */}
                    <SimpleGrid columns={3} spacing={2}>
                      <Box>
                        <Text fontSize="xs" color="gray.500" mb={1}>
                          Attempts
                        </Text>
                        <Badge colorScheme="purple" fontSize="md">
                          {group.totalAttempts}
                        </Badge>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500" mb={1}>
                          Duration
                        </Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {formatDuration(group.latestCall.duration)} min
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500" mb={1}>
                          Status
                        </Text>
                        <Badge colorScheme={getCallStatusColor(group.latestCall.callStatus)} fontSize="xs">
                          {getCallStatusLabel(group.latestCall.callStatus)}
                        </Badge>
                      </Box>
                    </SimpleGrid>

                    <Divider />

                    {/* Last Called */}
                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        Last Called
                      </Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {formatDateTime(group.latestCall.createdAt)}
                      </Text>
                    </Box>

                    {/* Agent */}
                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        Agent
                      </Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {group.latestCall.caller.name || 'N/A'}
                      </Text>
                    </Box>

                    {/* Remarks */}
                    {group.latestCall.customerRequirement && (
                      <Box>
                        <Text fontSize="xs" color="gray.500" mb={1}>
                          Remarks
                        </Text>
                        <Text
                          fontSize="sm"
                          noOfLines={2}
                          cursor="pointer"
                          color="gray.700"
                          onClick={() => handleShowRemark(group.latestCall.customerRequirement)}
                          _hover={{ color: 'blue.600' }}
                        >
                          {group.latestCall.customerRequirement}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            ))
          ) : (
            <Box
              gridColumn="1 / -1"
              textAlign="center"
              py={12}
              bg="white"
              borderRadius="lg"
              border="1px solid"
              borderColor="gray.200"
            >
              <Text color="gray.500">
                {searchQuery || statusFilter !== 'all'
                  ? 'No call logs match your filters'
                  : 'No call logs found'}
              </Text>
            </Box>
          )}
        </SimpleGrid>
      )}

      {!loading && viewMode === 'tile' && filteredCalls.length > 0 && (
        <Box mt={4} p={4} bg="white" borderRadius="lg" boxShadow="sm">
          <Text fontSize="sm" color="gray.600">
            Showing {filteredCalls.length} lead{filteredCalls.length !== 1 ? 's' : ''} with {filteredCalls.reduce((sum, g) => sum + g.totalAttempts, 0)} total call{filteredCalls.reduce((sum, g) => sum + g.totalAttempts, 0) !== 1 ? 's' : ''}
          </Text>
        </Box>
      )}

      {/* Remarks Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Remarks Details</ModalHeader>
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
                {selectedRemark || 'No remarks provided'}
              </Text>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Call History Modal */}
      <Modal isOpen={isHistoryOpen} onClose={onHistoryClose} size="4xl">
        <ModalOverlay />
        <ModalContent mx={{ base: 4, md: 0 }}>
          <ModalHeader fontSize={{ base: 'md', md: 'lg' }}>
            All Call History
            {selectedLeadHistory[0]?.lead?.name && ` - ${selectedLeadHistory[0].lead.name}`}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Box overflowX="auto" mx={{ base: -4, md: 0 }}>
              <Table variant="simple" size={{ base: 'sm', md: 'sm' }}>
                <Thead bg="gray.50">
                  <Tr>
                    <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Date/Time</Th>
                    <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} display={{ base: 'none', sm: 'table-cell' }}>Duration (min)</Th>
                    <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Status</Th>
                    <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} display={{ base: 'none', md: 'table-cell' }}>Agent Name</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {selectedLeadHistory.map((call, index) => (
                    <Tr key={call.id} bg={index === 0 ? 'blue.50' : 'white'} _hover={{ bg: index === 0 ? 'blue.100' : 'gray.50' }}>
                      <Td fontSize={{ base: 'xs', sm: 'sm' }} whiteSpace="nowrap" px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                        {formatDateTime(call.createdAt)}
                        {index === 0 && (
                          <Badge ml={2} colorScheme="blue" fontSize="xs">Latest</Badge>
                        )}
                      </Td>
                      <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }} display={{ base: 'none', sm: 'table-cell' }}>
                        {formatDuration(call.duration)}
                      </Td>
                      <Td px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                        <Badge colorScheme={getCallStatusColor(call.callStatus)} fontSize={{ base: '0.6rem', sm: 'xs' }}>
                          {getCallStatusLabel(call.callStatus)}
                        </Badge>
                      </Td>
                      <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }} display={{ base: 'none', md: 'table-cell' }}>
                        <Text noOfLines={1}>{call.caller.name || 'N/A'}</Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
            <Box mt={4} p={{ base: 2, md: 3 }} bg="blue.50" borderRadius="md">
              <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.700">
                Total Calls: <strong>{selectedLeadHistory.length}</strong>
              </Text>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}





