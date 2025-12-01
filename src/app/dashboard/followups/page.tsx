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
  VStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useToast,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Flex,
} from '@chakra-ui/react';
import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HiDotsVertical, HiEye, HiCheck, HiX, HiPlus, HiSearch, HiClock } from 'react-icons/hi';
import { formatDateTime } from '@/shared/lib/date-utils';
import CalendarView from '@/shared/components/CalendarView';

interface FollowUp {
  id: string;
  leadId: string;
  lead: {
    id: string;
    name: string;
    phone: string;
    status?: string;
  };
  scheduledAt: string;
  status: 'pending' | 'completed' | 'cancelled';
  customerRequirement: string | null;
  notes: string | null;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export default function FollowUpsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set initial filter from URL params
  useEffect(() => {
    const filter = searchParams?.get('filter');
    if (filter === 'overdue') {
      setStatusFilter('overdue');
    }
  }, [searchParams]);

  // Calculate days overdue
  const getDaysOverdue = (scheduledAt: string): number => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diffTime = now.getTime() - scheduled.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Fetch follow-ups from API
  useEffect(() => {
    const fetchFollowUps = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/followups?limit=100');
        const result = await response.json();
        if (result.success) {
          setFollowUps(result.data);
        } else {
          setError(result.error || 'Failed to fetch follow-ups');
        }
      } catch (err) {
        setError('Failed to fetch follow-ups');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFollowUps();
  }, []);

  // Filter follow-ups based on search, date, and status
  const filteredFollowUps = useMemo(() => {
    let filtered = [...followUps];
    const now = new Date();

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(followup => 
        followup.lead.name.toLowerCase().includes(query) ||
        followup.lead.phone.toLowerCase().includes(query) ||
        (followup.notes && followup.notes.toLowerCase().includes(query))
      );
    }

    // Apply status filter (including overdue)
    if (statusFilter === 'overdue') {
      filtered = filtered.filter(followup => {
        const scheduledDate = new Date(followup.scheduledAt);
        return followup.status === 'pending' && scheduledDate < now;
      });
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(followup => followup.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(followup => {
        const followupDate = new Date(followup.scheduledAt);
        const followupDay = new Date(followupDate.getFullYear(), followupDate.getMonth(), followupDate.getDate());
        
        if (dateFilter === 'today') {
          return followupDay.getTime() === today.getTime();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return followupDay >= weekAgo && followupDay <= today;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          return followupDay >= monthAgo && followupDay <= today;
        }
        return true;
      });
    }

    // Sort: Overdue first (high priority first), then by scheduled date
    filtered.sort((a, b) => {
      const aScheduled = new Date(a.scheduledAt);
      const bScheduled = new Date(b.scheduledAt);
      const aOverdue = a.status === 'pending' && aScheduled < now;
      const bOverdue = b.status === 'pending' && bScheduled < now;

      // Overdue items first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Within overdue, high priority first
      if (aOverdue && bOverdue) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
      }

      // Sort by date
      return aScheduled.getTime() - bScheduled.getTime();
    });

    return filtered;
  }, [searchQuery, dateFilter, statusFilter, followUps]);

  // Count overdue follow-ups
  const overdueCount = useMemo(() => {
    const now = new Date();
    return followUps.filter(followup => {
      const scheduledDate = new Date(followup.scheduledAt);
      return followup.status === 'pending' && scheduledDate < now;
    }).length;
  }, [followUps]);

  const handleMarkCompleted = async (id: string, leadName: string) => {
    try {
      const response = await fetch(`/api/followups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (response.ok) {
        toast({
          title: 'Follow-up marked complete',
          description: `Follow-up with ${leadName} has been marked as completed`,
          status: 'success',
          duration: 3000,
        });
        setFollowUps(followUps.map(f => f.id === id ? { ...f, status: 'completed' } : f));
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update follow-up',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleMarkCancelled = async (id: string, leadName: string) => {
    try {
      const response = await fetch(`/api/followups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (response.ok) {
        toast({
          title: 'Follow-up cancelled',
          description: `Follow-up with ${leadName} has been cancelled`,
          status: 'info',
          duration: 3000,
        });
        setFollowUps(followUps.map(f => f.id === id ? { ...f, status: 'cancelled' } : f));
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update follow-up',
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>Follow-ups</Heading>
        <HStack>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'solid' : 'outline'}
            colorScheme={viewMode === 'list' ? 'blue' : 'gray'}
            onClick={() => setViewMode('list')}
          >
            List View
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'calendar' ? 'solid' : 'outline'}
            colorScheme={viewMode === 'calendar' ? 'blue' : 'gray'}
            onClick={() => setViewMode('calendar')}
          >
            Calendar View
          </Button>
        </HStack>
      </HStack>

      {/* Overdue Count Badge */}
      {overdueCount > 0 && (
        <Box bg="red.50" borderRadius="lg" p={4} mb={4} borderWidth="1px" borderColor="red.200">
          <HStack justify="space-between">
            <HStack>
              <Badge colorScheme="red" fontSize="lg" px={3} py={1}>
                {overdueCount} Overdue
              </Badge>
              <Text fontSize="sm" color="red.700">
                You have {overdueCount} overdue follow-up{overdueCount !== 1 ? 's' : ''} that need immediate attention
              </Text>
            </HStack>
            <Button
              size="sm"
              colorScheme="red"
              onClick={() => setStatusFilter('overdue')}
              variant={statusFilter === 'overdue' ? 'solid' : 'outline'}
            >
              View Overdue
            </Button>
          </HStack>
        </Box>
      )}

      {/* Search and Filter Bar */}
      <Flex gap={3} mb={4} flexWrap="wrap">
        <InputGroup flex="1" minW={{ base: 'full', md: '300px' }}>
          <InputLeftElement>
            <HiSearch color="gray" />
          </InputLeftElement>
          <Input
            placeholder="Search name, phone or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg="white"
          />
        </InputGroup>

        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          maxW={{ base: 'full', md: '200px' }}
          bg="white"
        >
          <option value="all">All Status</option>
          <option value="overdue">⚠️ Overdue Only</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>

        <Select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          maxW={{ base: 'full', md: '200px' }}
          bg="white"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
        </Select>
      </Flex>

      {error && (
        <Box bg="red.50" p={4} borderRadius="lg" mb={4} color="red.700">
          {error}
        </Box>
      )}

      {loading && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">Loading follow-ups...</Text>
        </Box>
      )}

      {!loading && (
        <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          {viewMode === 'list' ? (
            <>
          <Box overflowX="auto">
          <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
            <Thead bg="gray.50">
              <Tr>
                <Th>Lead Name</Th>
                <Th display={{ base: 'none', sm: 'table-cell' }}>Scheduled At</Th>
                <Th display={{ base: 'none', md: 'table-cell' }}>Priority</Th>
                <Th>Status</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Customer Requirement</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredFollowUps.length > 0 ? (
                filteredFollowUps.map((followup) => {
                  const now = new Date();
                  const scheduledDate = new Date(followup.scheduledAt);
                  const isOverdue = followup.status === 'pending' && scheduledDate < now;
                  const daysOverdue = isOverdue ? getDaysOverdue(followup.scheduledAt) : 0;
                  const isHighPriorityOverdue = isOverdue && followup.priority === 'high';

                  return (
                    <Tr 
                      key={followup.id} 
                      _hover={{ bg: 'gray.50' }}
                      bg={isHighPriorityOverdue ? 'red.50' : isOverdue ? 'orange.50' : 'white'}
                    >
                      <Td fontWeight="medium" fontSize={{ base: 'xs', md: 'sm' }}>
                        <VStack align="start" spacing={1}>
                          <Text>{followup.lead.name}</Text>
                          {isOverdue && (
                            <Badge 
                              colorScheme={isHighPriorityOverdue ? 'red' : 'orange'} 
                              fontSize="xs"
                              fontWeight="bold"
                            >
                              🔴 {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                            </Badge>
                          )}
                        </VStack>
                      </Td>
                      <Td fontSize={{ base: 'xs', md: 'sm' }} display={{ base: 'none', sm: 'table-cell' }}>
                        {formatDateTime(followup.scheduledAt)}
                      </Td>
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
                              ? isOverdue ? 'red' : 'yellow'
                              : 'gray'
                          }
                          fontSize={{ base: 'xs', md: 'sm' }}
                        >
                          {isOverdue ? 'OVERDUE' : followup.status}
                        </Badge>
                      </Td>
                      <Td display={{ base: 'none', lg: 'table-cell' }}>
                        <Text noOfLines={2} fontSize={{ base: 'xs', md: 'sm' }}>
                          {followup.customerRequirement || '-'}
                        </Text>
                      </Td>
                      <Td>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<HiDotsVertical />}
                            variant="ghost"
                            size="sm"
                            colorScheme={isOverdue ? 'red' : 'gray'}
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
                                  onClick={() => handleMarkCompleted(followup.id, followup.lead.name)}
                                  color="green.600"
                                >
                                  Mark Complete
                                </MenuItem>
                                <MenuItem
                                  icon={<HiClock />}
                                  onClick={() => router.push(`/dashboard/leads/${followup.leadId}/followup`)}
                                  color="blue.600"
                                >
                                  Reschedule
                                </MenuItem>
                                <MenuItem
                                  icon={<HiX />}
                                  onClick={() => handleMarkCancelled(followup.id, followup.lead.name)}
                                  color="red.600"
                                >
                                  Cancel
                                </MenuItem>
                              </>
                            )}
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  );
                })
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
            </>
          ) : (
            <CalendarView followUps={filteredFollowUps} onSelectFollowUp={(id) => {
              const followup = filteredFollowUps.find(f => f.id === id);
              if (followup) {
                router.push(`/dashboard/leads/${followup.leadId}`);
              }
            }} />
          )}
        </Box>
      )}
    </Box>
  );
}





