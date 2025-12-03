'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  VStack,
  IconButton,
  InputGroup,
  InputLeftElement,
  Input,
  Select,
  Button,
  Spinner,
  useToast,
  Divider,
  Flex,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react';
import { HiEye, HiSearch, HiRefresh, HiPhone } from 'react-icons/hi';
import { formatDate } from '@/shared/lib/date-utils';
import { formatPhoneForDisplay } from '@/shared/utils/phone';
import { useAuth } from '@/shared/lib/auth/auth-context';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  assignedTo?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  notes?: string;
  status: string;
}

interface OutcomeSection {
  title: string;
  status: string;
  colorScheme: string;
  leads: Lead[];
}

export default function LeadOutcomesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();
  
  // Get initial filters from URL params
  const initialDateFilter = searchParams.get('date') as 'all' | 'today' | 'week' | 'month' || 'all';
  const initialStatusFilter = searchParams.get('status') || null;
  
  // State for filters (applies to all sections)
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>(initialDateFilter);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [highlightStatus, setHighlightStatus] = useState<string | null>(initialStatusFilter);
  
  // Ref for scrolling to Won section
  const wonSectionRef = useRef<HTMLDivElement>(null);
  
  // State for data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleLeadId, setRescheduleLeadId] = useState<string | null>(null);
  const [rescheduleLeadName, setRescheduleLeadName] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('tomorrow');
  const [isRescheduling, setIsRescheduling] = useState(false);
  
  const { isOpen: isRescheduleOpen, onOpen: onRescheduleOpen, onClose: onRescheduleClose } = useDisclosure();
  
  // Sorting state for each section (default: newest first)
  const [sortConfig, setSortConfig] = useState<{
    [key: string]: { field: string; direction: 'asc' | 'desc' };
  }>({
    unqualified: { field: 'updatedAt', direction: 'desc' },
    unreach: { field: 'updatedAt', direction: 'desc' },
    won: { field: 'updatedAt', direction: 'desc' },
    lost: { field: 'updatedAt', direction: 'desc' },
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (ownerFilter !== 'all') params.append('assignedToId', ownerFilter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      
      // Handle date range filter
      if (dateRangeFilter !== 'all') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Format date as YYYY-MM-DD in local timezone
        const formatLocalDate = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        if (dateRangeFilter === 'today') {
          const todayStr = formatLocalDate(today);
          params.append('startDate', todayStr);
          params.append('endDate', todayStr);
        } else if (dateRangeFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          params.append('startDate', formatLocalDate(weekAgo));
          params.append('endDate', formatLocalDate(today));
        } else if (dateRangeFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          params.append('startDate', formatLocalDate(monthAgo));
          params.append('endDate', formatLocalDate(today));
        }
      }
      
      // Custom date range (overrides dateRangeFilter if both are set)
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      params.append('limit', '500');
      
      const [leadsRes, usersRes] = await Promise.all([
        fetch(`/api/leads/outcomes?${params.toString()}`),
        fetch('/api/users'),
      ]);
      
      const leadsData = await leadsRes.json();
      const usersData = await usersRes.json();
      
      if (leadsData.success) {
        setLeads(leadsData.data || []);
      }
      
      if (usersData.success) {
        setOwners(usersData.data || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, ownerFilter, sourceFilter, dateRangeFilter, startDate, endDate]);

  // Auto-scroll to highlighted section on mount
  useEffect(() => {
    if (highlightStatus === 'won' && wonSectionRef.current) {
      setTimeout(() => {
        wonSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500); // Wait for data to load
    }
  }, [highlightStatus, leads]);

  // Filter and sort leads by status
  const filterLeadsByStatus = (status: string) => {
    // Only filter by status - other filters are already applied by the API
    let filtered = leads.filter(lead => lead.status === status);

    // Apply sorting
    const config = sortConfig[status];
    if (config) {
      filtered.sort((a, b) => {
        let aValue: any = a[config.field as keyof Lead];
        let bValue: any = b[config.field as keyof Lead];

        // Handle nested assignedTo field
        if (config.field === 'assignedTo') {
          aValue = a.assignedTo?.name || '';
          bValue = b.assignedTo?.name || '';
        }

        if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const handleSort = (status: string, field: string) => {
    setSortConfig(prev => ({
      ...prev,
      [status]: {
        field,
        direction: prev[status]?.field === field && prev[status]?.direction === 'asc' ? 'desc' : 'asc',
      },
    }));
  };

  const sections: OutcomeSection[] = [
    {
      title: 'Unqualified',
      status: 'unqualified',
      colorScheme: 'gray',
      leads: filterLeadsByStatus('unqualified'),
    },
    {
      title: 'Unreachable',
      status: 'unreach',
      colorScheme: 'pink',
      leads: filterLeadsByStatus('unreach'),
    },
    {
      title: 'Won',
      status: 'won',
      colorScheme: 'green',
      leads: filterLeadsByStatus('won'),
    },
    {
      title: 'Lost',
      status: 'lost',
      colorScheme: 'red',
      leads: filterLeadsByStatus('lost'),
    },
  ];

  const clearFilters = () => {
    setSearchQuery('');
    setOwnerFilter('all');
    setSourceFilter('all');
    setDateRangeFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = searchQuery || ownerFilter !== 'all' || sourceFilter !== 'all' || dateRangeFilter !== 'all' || startDate || endDate;

  const openRescheduleModal = (leadId: string, leadName: string) => {
    setRescheduleLeadId(leadId);
    setRescheduleLeadName(leadName);
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    setFollowUpDate(tomorrowDate || '');
    
    // Set default time to 10:00 AM
    setFollowUpTime('10:00');
    setFollowUpNotes('');
    setSelectedTimeframe('tomorrow');
    
    onRescheduleOpen();
  };

  const handleTimeframeSelect = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    const now = new Date();
    let scheduledDate = new Date();

    switch (timeframe) {
      case 'after1hour':
        scheduledDate = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'tomorrow':
        scheduledDate.setDate(now.getDate() + 1);
        scheduledDate.setHours(10, 0, 0, 0);
        break;
      case 'after1week':
        scheduledDate.setDate(now.getDate() + 7);
        scheduledDate.setHours(10, 0, 0, 0);
        break;
      case 'after1month':
        scheduledDate.setMonth(now.getMonth() + 1);
        scheduledDate.setHours(10, 0, 0, 0);
        break;
      case 'custom':
        return; // User will select custom date
      default:
        scheduledDate.setDate(now.getDate() + 1);
    }

    const dateStr = scheduledDate.toISOString().split('T')[0];
    const timeStr = `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`;
    
    setFollowUpDate(dateStr || '');
    setFollowUpTime(timeStr);
  };

  const handleRescheduleSubmit = async () => {
    if (!rescheduleLeadId || !followUpDate || !followUpTime) {
      toast({
        title: 'Error',
        description: 'Please select date and time for follow-up',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      setIsRescheduling(true);
      
      // Combine date and time
      const scheduledAt = new Date(`${followUpDate}T${followUpTime}`);
      
      // Check if scheduled time is in the future
      const now = new Date();
      if (scheduledAt <= now) {
        toast({
          title: 'Error',
          description: 'Follow-up date and time must be in the future',
          status: 'error',
          duration: 3000,
        });
        setIsRescheduling(false);
        return;
      }
      
      // Get current user ID from session/auth
      const userId = user?.id;
      
      if (!userId) {
        toast({
          title: 'Error',
          description: 'User not authenticated. Please log in again.',
          status: 'error',
          duration: 3000,
        });
        setIsRescheduling(false);
        return;
      }
      
      // Update lead status and create follow-up
      const leadResponse = await fetch(`/api/leads/${rescheduleLeadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'followup',
        }),
      });

      const followUpResponse = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: rescheduleLeadId,
          scheduledAt: scheduledAt.toISOString(),
          customerRequirement: followUpNotes || 'Rescheduled from unreachable status',
          notes: followUpNotes || 'Rescheduled from unreachable status',
          createdById: userId,
        }),
      });

      const followUpData = await followUpResponse.json();

      if (leadResponse.ok && followUpResponse.ok) {
        toast({
          title: 'Success',
          description: `Follow-up scheduled for ${rescheduleLeadName}. Redirecting to Leads page...`,
          status: 'success',
          duration: 3000,
        });
        onRescheduleClose();
        
        // Redirect to leads page after a brief delay
        setTimeout(() => {
          router.push('/dashboard/leads');
        }, 1000);
      } else {
        throw new Error(followUpData.error || 'Failed to reschedule lead');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reschedule lead',
        status: 'error',
        duration: 3000,
      });
      console.error(error);
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleReschedule = async (leadId: string, leadName: string) => {
    openRescheduleModal(leadId, leadName);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color="gray.600">Loading lead outcomes...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>Lead Outcomes</Heading>
        <Button
          size={{ base: 'sm', md: 'md' }}
          leftIcon={<HiRefresh />}
          onClick={fetchData}
          variant="outline"
        >
          Refresh
        </Button>
      </Flex>

      {/* Global Filters */}
      <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={6}>
        <VStack spacing={3} align="stretch">
          <Heading size="sm" mb={2}>Filters (Apply to All Sections)</Heading>
          
          {/* Search */}
          <InputGroup maxW={{ base: 'full', md: '400px' }}>
            <InputLeftElement>
              <HiSearch />
            </InputLeftElement>
            <Input
              placeholder="Search name or phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size={{ base: 'sm', md: 'md' }}
            />
          </InputGroup>

          {/* Filter Row */}
          <Flex gap={3} flexWrap="wrap">
            <Select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              maxW={{ base: 'full', sm: '200px' }}
              size={{ base: 'sm', md: 'md' }}
            >
              <option value="all">All Owners</option>
              {owners.map(owner => (
                <option key={owner.id} value={owner.id}>{owner.name}</option>
              ))}
            </Select>

            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              maxW={{ base: 'full', sm: '200px' }}
              size={{ base: 'sm', md: 'md' }}
            >
              <option value="all">All Sources</option>
              <option value="Website">Website</option>
              <option value="Meta">Meta</option>
              <option value="Referral">Referral</option>
              <option value="Direct">Direct</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Cold Call">Cold Call</option>
            </Select>

            <Select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              maxW={{ base: 'full', sm: '200px' }}
              size={{ base: 'sm', md: 'md' }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </Select>
          </Flex>

          {/* Custom Date Range */}
          <Flex gap={3} flexWrap="wrap">
            <Box flex={{ base: '1 1 100%', sm: '0 1 auto' }}>
              <Text fontSize="sm" mb={1}>Start Date</Text>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                size={{ base: 'sm', md: 'md' }}
                max={endDate || undefined}
              />
            </Box>
            <Box flex={{ base: '1 1 100%', sm: '0 1 auto' }}>
              <Text fontSize="sm" mb={1}>End Date</Text>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                size={{ base: 'sm', md: 'md' }}
                min={startDate || undefined}
              />
            </Box>
          </Flex>

          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} alignSelf="flex-start">
              Clear All Filters
            </Button>
          )}
        </VStack>
      </Box>

      {/* Outcome Sections */}
      <VStack spacing={6} align="stretch">
        {sections.map((section) => (
          <Box 
            key={section.status}
            ref={section.status === 'won' ? wonSectionRef : null}
            border={highlightStatus === section.status ? '2px solid' : 'none'}
            borderColor={highlightStatus === section.status ? `${section.colorScheme}.400` : 'transparent'}
            borderRadius="lg"
            p={highlightStatus === section.status ? 2 : 0}
            transition="all 0.3s"
          >
            <Flex
              align="center"
              mb={4}
              p={3}
              bg={`${section.colorScheme}.50`}
              borderRadius="md"
              borderLeft="4px"
              borderColor={`${section.colorScheme}.500`}
            >
              <Heading size={{ base: 'sm', md: 'md' }} color={`${section.colorScheme}.700`}>
                {section.title}
              </Heading>
              <Badge ml={3} colorScheme={section.colorScheme} fontSize={{ base: 'sm', md: 'md' }}>
                {section.leads.length}
              </Badge>
            </Flex>

            <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
              {section.leads.length > 0 ? (
                <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
                  <Thead bg="gray.50">
                    <Tr>
                      <Th 
                        cursor="pointer" 
                        onClick={() => handleSort(section.status, 'name')}
                        _hover={{ bg: 'gray.100' }}
                      >
                        Lead Name {sortConfig[section.status]?.field === 'name' && (sortConfig[section.status]?.direction === 'asc' ? '↑' : '↓')}
                      </Th>
                      <Th 
                        cursor="pointer" 
                        onClick={() => handleSort(section.status, 'phone')}
                        _hover={{ bg: 'gray.100' }}
                      >
                        Phone {sortConfig[section.status]?.field === 'phone' && (sortConfig[section.status]?.direction === 'asc' ? '↑' : '↓')}
                      </Th>
                      <Th>Status</Th>
                      <Th 
                        cursor="pointer" 
                        onClick={() => handleSort(section.status, 'updatedAt')}
                        _hover={{ bg: 'gray.100' }}
                      >
                        Last Updated {sortConfig[section.status]?.field === 'updatedAt' && (sortConfig[section.status]?.direction === 'asc' ? '↑' : '↓')}
                      </Th>
                      <Th 
                        cursor="pointer" 
                        onClick={() => handleSort(section.status, 'assignedTo')}
                        _hover={{ bg: 'gray.100' }}
                      >
                        Owner {sortConfig[section.status]?.field === 'assignedTo' && (sortConfig[section.status]?.direction === 'asc' ? '↑' : '↓')}
                      </Th>
                      <Th width="120px">Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {section.leads.map((lead) => (
                      <Tr 
                        key={lead.id} 
                        _hover={{ bg: 'gray.50', cursor: 'pointer' }}
                        onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                      >
                        <Td fontWeight="medium">{lead.name}</Td>
                        <Td>{formatPhoneForDisplay(lead.phone)}</Td>
                        <Td>
                          <Badge colorScheme={section.colorScheme}>
                            {section.title}
                          </Badge>
                        </Td>
                        <Td>{formatDate(lead.updatedAt)}</Td>
                        <Td>{lead.assignedTo?.name || 'Unassigned'}</Td>
                        <Td onClick={(e) => e.stopPropagation()}>
                          <HStack spacing={1}>
                            <IconButton
                              aria-label="View details"
                              icon={<HiEye />}
                              size="sm"
                              variant="ghost"
                              onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            />
                            {section.status === 'unreach' && (
                              <IconButton
                                aria-label="Reschedule"
                                icon={<HiPhone />}
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                onClick={() => handleReschedule(lead.id, lead.name)}
                                title="Move to Follow-up and reschedule"
                              />
                            )}
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Box p={8} textAlign="center">
                  <Text color="gray.500">
                    {hasActiveFilters ? `No ${section.title.toLowerCase()} leads match your filters` : `No ${section.title.toLowerCase()} leads`}
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </VStack>

      {/* Reschedule Follow-up Modal */}
      <Modal isOpen={isRescheduleOpen} onClose={onRescheduleClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Schedule Follow-up</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={5} align="stretch">
              <Text fontWeight="medium" fontSize="lg">
                Lead: <Text as="span" color="blue.600">{rescheduleLeadName}</Text>
              </Text>
              
              {/* Follow-up Timeframe Buttons */}
              <Box>
                <Text fontWeight="semibold" mb={3}>Follow-up Timeframe</Text>
                <VStack spacing={2} align="stretch">
                  <HStack spacing={2}>
                    <Button
                      flex="1"
                      variant={selectedTimeframe === 'after1hour' ? 'solid' : 'outline'}
                      colorScheme={selectedTimeframe === 'after1hour' ? 'orange' : 'gray'}
                      onClick={() => handleTimeframeSelect('after1hour')}
                      size="md"
                    >
                      After 1 Hour
                    </Button>
                    <Button
                      flex="1"
                      variant={selectedTimeframe === 'tomorrow' ? 'solid' : 'outline'}
                      colorScheme={selectedTimeframe === 'tomorrow' ? 'orange' : 'gray'}
                      onClick={() => handleTimeframeSelect('tomorrow')}
                      size="md"
                    >
                      Tomorrow
                    </Button>
                  </HStack>
                  <HStack spacing={2}>
                    <Button
                      flex="1"
                      variant={selectedTimeframe === 'after1week' ? 'solid' : 'outline'}
                      colorScheme={selectedTimeframe === 'after1week' ? 'orange' : 'gray'}
                      onClick={() => handleTimeframeSelect('after1week')}
                      size="md"
                    >
                      After 1 Week
                    </Button>
                    <Button
                      flex="1"
                      variant={selectedTimeframe === 'after1month' ? 'solid' : 'outline'}
                      colorScheme={selectedTimeframe === 'after1month' ? 'orange' : 'gray'}
                      onClick={() => handleTimeframeSelect('after1month')}
                      size="md"
                    >
                      After 1 Month
                    </Button>
                  </HStack>
                  <Button
                    w="full"
                    variant={selectedTimeframe === 'custom' ? 'solid' : 'outline'}
                    colorScheme={selectedTimeframe === 'custom' ? 'orange' : 'gray'}
                    onClick={() => setSelectedTimeframe('custom')}
                    size="md"
                  >
                    Custom Date
                  </Button>
                </VStack>
              </Box>

              <FormControl isRequired>
                <FormLabel fontWeight="semibold">
                  Follow-up Date <Text as="span" color="red.500">*</Text>
                </FormLabel>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="dd-mm-yyyy"
                  size="lg"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontWeight="semibold">Follow-up Time</FormLabel>
                <Input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  placeholder="--:-- --"
                  size="lg"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              w="full"
              colorScheme="orange"
              onClick={handleRescheduleSubmit}
              isLoading={isRescheduling}
              loadingText="Scheduling..."
              size="lg"
              bg="orange.600"
              _hover={{ bg: 'orange.700' }}
            >
              Schedule Follow-up
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
