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
  SimpleGrid,
  Card,
  CardBody,
  Divider,
  ButtonGroup,
} from '@chakra-ui/react';
import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HiDotsVertical, HiEye, HiCheck, HiX, HiPlus, HiSearch, HiClock, HiViewGrid, HiViewList, HiCalendar } from 'react-icons/hi';
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
  status: 'pending' | 'cancelled';
  customerRequirement: string | null;
  notes: string | null;
  createdAt: string;
}

export default function FollowUpsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'tile' | 'calendar'>('list');
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch follow-ups function (reusable)
  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      // Note: API now returns only the latest follow-up per lead automatically
      const response = await fetch('/api/followups?limit=1000');
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

  // Set initial filter from URL params
  useEffect(() => {
    const filter = searchParams?.get('filter');
    // Filter handling removed
  }, [searchParams]);

  // Calculate days overdue
  const getDaysOverdue = (scheduledAt: string): number => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diffTime = now.getTime() - scheduled.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Fetch follow-ups from API on mount
  useEffect(() => {
    fetchFollowUps();
  }, []);

  // Filter follow-ups based on search and date
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

    // Apply date filter
    if (dateFilter !== 'all') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(followup => {
        const followupDate = new Date(followup.scheduledAt);
        const followupDay = new Date(followupDate.getFullYear(), followupDate.getMonth(), followupDate.getDate());
        
        if (dateFilter === 'overdue') {
          return followupDate < now;
        } else if (dateFilter === 'today') {
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

    // Separate into overdue and upcoming, then sort each group
    const overdue: FollowUp[] = [];
    const upcoming: FollowUp[] = [];

    filtered.forEach(followup => {
      const scheduledDate = new Date(followup.scheduledAt);
      if (scheduledDate < now && followup.status === 'pending') {
        overdue.push(followup);
      } else {
        upcoming.push(followup);
      }
    });

    // Sort upcoming by scheduled date (earliest/next one first)
    upcoming.sort((a, b) => {
      const aScheduled = new Date(a.scheduledAt);
      const bScheduled = new Date(b.scheduledAt);
      return aScheduled.getTime() - bScheduled.getTime();
    });

    // Sort overdue by scheduled date (most overdue first)
    overdue.sort((a, b) => {
      const aScheduled = new Date(a.scheduledAt);
      const bScheduled = new Date(b.scheduledAt);
      return aScheduled.getTime() - bScheduled.getTime();
    });

    // Return upcoming first, then overdue
    return [...upcoming, ...overdue];
  }, [searchQuery, dateFilter, followUps]);

  // Separate upcoming and overdue for display with sections
  const { upcomingFollowUps, overdueFollowUps } = useMemo(() => {
    const now = new Date();
    const upcoming: FollowUp[] = [];
    const overdue: FollowUp[] = [];

    filteredFollowUps.forEach(followup => {
      const scheduledDate = new Date(followup.scheduledAt);
      if (scheduledDate < now && followup.status === 'pending') {
        overdue.push(followup);
      } else {
        upcoming.push(followup);
      }
    });

    return { upcomingFollowUps: upcoming, overdueFollowUps: overdue };
  }, [filteredFollowUps]);

  // Count overdue follow-ups
  const overdueCount = useMemo(() => {
    const now = new Date();
    return followUps.filter(followup => {
      const scheduledDate = new Date(followup.scheduledAt);
      return scheduledDate < now;
    }).length;
  }, [followUps]);

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
        // Refresh the list to show updated latest follow-ups
        await fetchFollowUps();
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
        <ButtonGroup size="sm" isAttached variant="outline">
          <Button
            leftIcon={<HiViewList />}
            onClick={() => setViewMode('list')}
            colorScheme={viewMode === 'list' ? 'blue' : 'gray'}
            variant={viewMode === 'list' ? 'solid' : 'outline'}
          >
            List
          </Button>
          <Button
            leftIcon={<HiViewGrid />}
            onClick={() => setViewMode('tile')}
            colorScheme={viewMode === 'tile' ? 'blue' : 'gray'}
            variant={viewMode === 'tile' ? 'solid' : 'outline'}
          >
            Tiles
          </Button>
          <Button
            leftIcon={<HiCalendar />}
            onClick={() => setViewMode('calendar')}
            colorScheme={viewMode === 'calendar' ? 'blue' : 'gray'}
            variant={viewMode === 'calendar' ? 'solid' : 'outline'}
          >
            Calendar
          </Button>
        </ButtonGroup>
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
              onClick={() => setDateFilter('overdue')}
              variant={dateFilter === 'overdue' ? 'solid' : 'outline'}
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
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          maxW={{ base: 'full', md: '200px' }}
          bg="white"
        >
          <option value="all">All Time</option>
          <option value="overdue">⚠️ Overdue</option>
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
                <Th display={{ base: 'none', lg: 'table-cell' }}>Customer Requirement</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredFollowUps.length > 0 ? (
                filteredFollowUps.map((followup) => {
                  const now = new Date();
                  const scheduledDate = new Date(followup.scheduledAt);
                  const isOverdue = scheduledDate < now;
                  const daysOverdue = isOverdue ? getDaysOverdue(followup.scheduledAt) : 0;

                  return (
                    <Tr 
                      key={followup.id} 
                      _hover={{ bg: 'gray.50' }}
                      bg={isOverdue ? 'orange.50' : 'white'}
                    >
                      <Td fontWeight="medium" fontSize={{ base: 'xs', md: 'sm' }}>
                        <VStack align="start" spacing={1}>
                          <Text>{followup.lead.name}</Text>
                          {isOverdue && (
                            <Badge 
                              colorScheme="orange" 
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
                          </MenuList>
                        </Menu>
                      </Td>
                    </Tr>
                  );
                })
              ) : (
                <Tr>
                  <Td colSpan={4} textAlign="center" py={8}>
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
          ) : viewMode === 'tile' ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} p={4}>
              {filteredFollowUps.length > 0 ? (
                filteredFollowUps.map((followup) => {
                  const now = new Date();
                  const scheduledDate = new Date(followup.scheduledAt);
                  const isOverdue = scheduledDate < now;
                  const daysOverdue = isOverdue ? getDaysOverdue(followup.scheduledAt) : 0;

                  return (
                    <Card
                      key={followup.id}
                      variant="outline"
                      bg={isOverdue ? 'orange.50' : 'white'}
                      borderColor={isOverdue ? 'orange.300' : 'gray.200'}
                      borderWidth={isOverdue ? '2px' : '1px'}
                      _hover={{ boxShadow: 'md', borderColor: isOverdue ? 'orange.400' : 'blue.300' }}
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
                                onClick={() => router.push(`/dashboard/leads/${followup.leadId}`)}
                                _hover={{ textDecoration: 'underline' }}
                                mb={1}
                              >
                                {followup.lead.name}
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {followup.lead.phone}
                              </Text>
                            </Box>
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<HiDotsVertical />}
                                variant="ghost"
                                size="sm"
                                colorScheme={isOverdue ? 'red' : 'gray'}
                                aria-label="Actions"
                              />
                              <MenuList>
                                <MenuItem
                                  icon={<HiEye />}
                                  onClick={() => router.push(`/dashboard/leads/${followup.leadId}`)}
                                >
                                  View Lead
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
                              </MenuList>
                            </Menu>
                          </Flex>

                          {/* Overdue Badge */}
                          {isOverdue && (
                            <Badge
                              colorScheme="orange"
                              fontSize="sm"
                              fontWeight="bold"
                              p={2}
                              borderRadius="md"
                            >
                              🔴 {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                            </Badge>
                          )}

                          <Divider />

                          {/* Scheduled Date */}
                          <Box>
                            <Text fontSize="xs" color="gray.500" mb={1}>
                              Scheduled At
                            </Text>
                            <Text fontSize="sm" fontWeight="medium">
                              {formatDateTime(followup.scheduledAt)}
                            </Text>
                          </Box>

                          {/* Customer Requirement */}
                          {followup.customerRequirement && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" mb={1}>
                                Customer Requirement
                              </Text>
                              <Text
                                fontSize="sm"
                                noOfLines={3}
                                color="gray.700"
                              >
                                {followup.customerRequirement}
                              </Text>
                            </Box>
                          )}

                          {/* Notes */}
                          {followup.notes && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" mb={1}>
                                Notes
                              </Text>
                              <Text
                                fontSize="sm"
                                noOfLines={2}
                                color="gray.700"
                              >
                                {followup.notes}
                              </Text>
                            </Box>
                          )}

                          {/* Lead Status */}
                          {followup.lead.status && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" mb={1}>
                                Lead Status
                              </Text>
                              <Badge colorScheme="blue" variant="subtle">
                                {followup.lead.status}
                              </Badge>
                            </Box>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>
                  );
                })
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
                  <Text color="gray.500">No follow-ups found</Text>
                </Box>
              )}
            </SimpleGrid>
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

      {!loading && viewMode === 'tile' && filteredFollowUps.length > 0 && (
        <Box mt={4} p={4} bg="white" borderRadius="lg" boxShadow="sm">
          <Text fontSize="sm" color="gray.600">
            Showing {filteredFollowUps.length} follow-up{filteredFollowUps.length !== 1 ? 's' : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
}





