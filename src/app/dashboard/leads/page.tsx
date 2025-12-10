'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  Flex,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  HStack,
  VStack,
  InputGroup,
  InputLeftElement,
  Input,
  Select,
  Text,
  useDisclosure,
  Divider,
  Stack,
  Icon,
  SimpleGrid,
  useToast,
  Tooltip,
  Checkbox,
} from '@chakra-ui/react';
import {
  HiPlus,
  HiEye,
  HiPencil,
  HiPhone,
  HiClock,
  HiBan,
  HiX,
  HiUserAdd,
  HiSearch,
  HiViewBoards,
  HiExclamation,
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import AddLeadModal from '@/features/leads/components/AddLeadModal';
import AssignLeadModal from '@/features/leads/components/AssignLeadModal';
import ConvertToUnreachableModal from '@/features/leads/components/ConvertToUnreachableModal';
import ConvertToUnqualifiedModal from '@/features/leads/components/ConvertToUnqualifiedModal';
import CallDialerModal from '@/features/leads/components/CallDialerModal';
import { formatDate } from '@/shared/lib/date-utils';
import { formatDateTime } from '@/shared/lib/date-utils';
import { categorizeAndSortLeads, formatTimeDifference } from '@/shared/lib/utils/lead-categorization';
import type { CallLog } from '@/shared/types';
import { openWhatsApp, isValidWhatsAppPhone } from '@/shared/utils/whatsapp';
import { formatPhoneForDisplay } from '@/shared/utils/phone';
import { useAuth } from '@/shared/lib/auth/auth-context';



// Component to show elapsed time since lead creation
const LeadAge = ({ createdAt }: { createdAt: string | Date }) => {
  const [age, setAge] = useState('');

  useEffect(() => {
    const updateAge = () => {
      const now = new Date();
      const created = new Date(createdAt);
      const diffMs = now.getTime() - created.getTime();
      
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) {
        const hours = diffHours % 24;
        setAge(`${diffDays}d ${hours}h`);
      } else if (diffHours > 0) {
        const minutes = diffMinutes % 60;
        setAge(`${diffHours}h ${minutes}m`);
      } else {
        setAge(`${diffMinutes}m`);
      }
    };

    updateAge();
    const timer = setInterval(updateAge, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [createdAt]);

  return (
    <HStack spacing={1} fontSize="xs" color="gray.600">
      <Icon as={HiClock} />
      <Text>{age} old</Text>
    </HStack>
  );
};

// Helper function to get status badge color
const getStatusBadgeColor = (status: string): string => {
  switch (status) {
    case 'new':
      return 'blue';
    case 'followup':
      return 'orange';
    case 'qualified':
      return 'purple';
    case 'won':
      return 'green';
    case 'lost':
      return 'red';
    case 'unqualified':
      return 'gray';
    case 'unreach':
      return 'pink';
    default:
      return 'gray';
  }
};

// Helper function to format status label
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'new':
      return 'New';
    case 'followup':
      return 'Follow-up';
    case 'qualified':
      return 'Qualified';
    case 'won':
      return 'Won';
    case 'lost':
      return 'Lost';
    case 'unqualified':
      return 'Unqualified';
    case 'unreach':
      return 'Unreachable';
    default:
      return status;
  }
};

// Lead management page with multiple view modes and categorization
export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user, token } = useAuth();
  
  // Get filter from URL if present
  const urlFilter = searchParams.get('filter');
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    // Apply filter from URL (e.g., 'new', 'won', 'overdue', 'today')
    if (urlFilter) {
      // Handle both status filters and special filters like 'overdue', 'today'
      if (['new', 'won', 'qualified', 'unqualified', 'unreachable', 'lost', 'overdue', 'scheduled', 'today'].includes(urlFilter)) {
        return urlFilter;
      }
    }
    return 'all';
  });
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>(() => {
    // If filter is 'new', automatically set to today
    if (urlFilter === 'new') {
      return 'today';
    }
    return 'all';
  });
  const [attemptsFilter, setAttemptsFilter] = useState<string>('all');
  const [assignedToMe, setAssignedToMe] = useState<boolean>(false);
  const [selectedLead, setSelectedLead] = useState<{ id: string; name: string } | null>(null);
  const [leadToAssign, setLeadToAssign] = useState<{
    id: string;
    name: string;
    currentAssignee?: string;
  } | null>(null);
  const [leadToCall, setLeadToCall] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh every minute to update overdue status
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Fetch leads and follow-ups from API
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Build query parameters for leads API
      const leadsParams = new URLSearchParams({ limit: '100' });
      if (assignedToMe) {
        leadsParams.append('assigned_to', 'me');
      }
      
      // Prepare headers with authorization token
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const [leadsRes, followUpsRes] = await Promise.all([
        fetch(`/api/leads?${leadsParams.toString()}`, { 
          cache: 'no-store',
          headers,
        }),
        fetch('/api/followups?limit=100', { cache: 'no-store' }),
      ]);
      
      const leadsData = await leadsRes.json();
      const followUpsData = await followUpsRes.json();
      
      if (leadsData.success) {
        setLeads(leadsData.data);
      } else {
        setError(leadsData.error || 'Failed to fetch leads');
      }
      
      if (followUpsData.success) {
        setFollowUps(followUpsData.data);
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Only fetch data once token is available
    if (token) {
      fetchData();
    }
  }, [token]);
  
  // Refresh data when assignedToMe filter changes
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [assignedToMe]);
  
  // Refresh data when URL params change (e.g., after redirect with timestamp)
  useEffect(() => {
    const timestamp = searchParams.get('t');
    if (timestamp) {
      fetchData();
    }
  }, [searchParams]);
  
  // Refresh data when returning to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Handler to refresh data after status changes
  const handleRefreshLeads = () => {
    fetchData();
  };

  // Handler to reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSourceFilter('all');
    setDateRangeFilter('all');
    setAttemptsFilter('all');
    setAssignedToMe(false);
  };
  
  // Update current time every minute for visual updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Modals
  const { isOpen: isAddLeadOpen, onOpen: onAddLeadOpen, onClose: onAddLeadClose } = useDisclosure();
  const { isOpen: isUnreachableOpen, onOpen: onUnreachableOpen, onClose: onUnreachableClose } = useDisclosure();
  const { isOpen: isUnqualifiedOpen, onOpen: onUnqualifiedOpen, onClose: onUnqualifiedClose } = useDisclosure();
  const { isOpen: isAssignOpen, onOpen: onAssignOpen, onClose: onAssignClose } = useDisclosure();
  const { isOpen: isCallDialerOpen, onOpen: onCallDialerOpen, onClose: onCallDialerClose } = useDisclosure();

  // US-8: Auto-reopen Call Dialer Modal if there's unsaved call data after page refresh
  useEffect(() => {
    // Check all localStorage keys for unsaved call data
    const keys = Object.keys(localStorage);
    const unsavedCallKeys = keys.filter(key => key.startsWith('unsaved_call_'));
    
    if (unsavedCallKeys.length > 0 && !isCallDialerOpen) {
      // Get the most recent unsaved call
      const mostRecentKey = unsavedCallKeys[0];
      
      if (mostRecentKey) {
        try {
          const callData = JSON.parse(localStorage.getItem(mostRecentKey) || '{}');
          const savedTime = callData.timestamp || 0;
          const hourInMs = 60 * 60 * 1000;
          
          // Only restore if saved within last hour
          if (Date.now() - savedTime < hourInMs && callData.leadId) {
            // Set lead data and open modal
            setLeadToCall({
              id: callData.leadId,
              name: callData.leadName || 'Unknown Lead',
              phone: callData.leadPhone || ''
            });
            onCallDialerOpen();
          } else {
            // Clear stale data
            localStorage.removeItem(mostRecentKey);
          }
        } catch (error) {
          console.error('Failed to restore call modal:', error);
        }
      }
    }
  }, []); // Run only once on mount

  // WhatsApp handler
  const handleWhatsAppClick = (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const success = openWhatsApp(phone);
    
    if (!success) {
      toast({
        title: 'Invalid phone number',
        description: 'The phone number must be at least 10 digits.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Helper functions to get call and follow-up data for table views
  const getLastCallForLead = (leadId: string): CallLog | null => {
    // In a real app, you'd have call logs data
    // For now, return null
    return null;
  };

  const getNextFollowUpForLead = (leadId: string) => {
    // Find the next follow-up for this lead
    const leadFollowUps = followUps.filter(
      (fu: any) => fu.leadId === leadId
    );
    if (leadFollowUps.length === 0) return null;
    
    const now = new Date();
    
    // Separate future and past followups
    const futureFollowUps = leadFollowUps.filter((fu: any) => new Date(fu.scheduledAt) >= now);
    const pastFollowUps = leadFollowUps.filter((fu: any) => new Date(fu.scheduledAt) < now);
    
    // Prefer earliest future followup
    if (futureFollowUps.length > 0) {
      return futureFollowUps.sort((a: any, b: any) => 
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      )[0];
    }
    
    // If no future followups, return most recent overdue one
    if (pastFollowUps.length > 0) {
      return pastFollowUps.sort((a: any, b: any) => 
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      )[0];
    }
    
    return null;
  };

  // Filter leads based on all filters
  const filteredLeads = useMemo(() => {
    let filtered = [...leads];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.phone.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query)
      );
    }

    // Status filter - handled after categorization for overdue/scheduled/today
    // For now, only filter by actual lead status for non-category filters
    if (statusFilter !== 'all' && statusFilter !== 'overdue' && statusFilter !== 'scheduled' && statusFilter !== 'today') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Source filter (case-insensitive)
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(lead => 
        lead.source?.toLowerCase() === sourceFilter.toLowerCase()
      );
    }

    // Date range filter
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((lead) => {
        const leadDate = new Date(lead.createdAt);
        const leadDay = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());
        
        if (dateRangeFilter === 'today') {
          return leadDay.getTime() === today.getTime();
        } else if (dateRangeFilter === '7days') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return leadDay >= weekAgo;
        } else if (dateRangeFilter === '30days') {
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          return leadDay >= monthAgo;
        }
        return true;
      });
    }

    // Call attempts filter
    if (attemptsFilter !== 'all') {
      filtered = filtered.filter((lead) => {
        const attempts = lead.callAttempts || 0;
        if (attemptsFilter === '0') return attempts === 0;
        if (attemptsFilter === '1-3') return attempts >= 1 && attempts <= 3;
        if (attemptsFilter === '4-6') return attempts >= 4 && attempts <= 6;
        if (attemptsFilter === '7+') return attempts >= 7;
        return true;
      });
    }

    return filtered;
  }, [searchQuery, statusFilter, sourceFilter, dateRangeFilter, attemptsFilter, leads]);

  // Categorize and sort leads for categorized view
  const categorizedLeads = useMemo(() => {
    const categorized = categorizeAndSortLeads(filteredLeads, followUps);
    
    // Apply status filter for overdue/scheduled/today categories
    if (statusFilter === 'overdue') {
      return { overdue: categorized.overdue, newLeads: [], future: [], statusFiltered: [] };
    } else if (statusFilter === 'scheduled') {
      return { overdue: [], newLeads: [], future: categorized.future, statusFiltered: [] };
    } else if (statusFilter === 'today') {
      // Filter future to show only TODAY's follow-ups
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      
      const todayFollowUps = categorized.future.filter(({ followUp }) => {
        if (!followUp) return false;
        const scheduledDate = new Date(followUp.scheduledAt);
        return scheduledDate >= todayStart && scheduledDate <= todayEnd && scheduledDate >= now;
      });
      
      return { overdue: [], newLeads: [], future: todayFollowUps, statusFiltered: [] };
    } else if (statusFilter === 'new') {
      return { overdue: [], newLeads: categorized.newLeads, future: [], statusFiltered: [] };
    } else if (statusFilter !== 'all' && ['qualified', 'unqualified', 'won', 'lost', 'unreach'].includes(statusFilter)) {
      // For specific status filters, show all filtered leads in a separate section
      return { 
        overdue: [], 
        newLeads: [], 
        future: [], 
        statusFiltered: filteredLeads.map(lead => ({ lead, followUp: getNextFollowUpForLead(lead.id) }))
      };
    }
    
    return { ...categorized, statusFiltered: [] };
  }, [filteredLeads, followUps, currentTime, statusFilter]); // Re-calculate when time updates

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'blue';
      case 'followup':
        return 'orange'; // Amber
      case 'qualified':
        return 'cyan';
      case 'unreach':
        return 'pink';
      case 'unqualified':
        return 'purple'; // Magenta
      case 'won':
        return 'green';
      case 'lost':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Box>
      <Flex
        justify="space-between"
        align={{ base: 'stretch', md: 'center' }}
        mb={6}
        direction={{ base: 'column', md: 'row' }}
        gap={{ base: 3, md: 0 }}
      >
        <Heading size={{ base: 'md', md: 'lg' }}>Leads</Heading>
        <Button
          size={{ base: 'sm', md: 'md' }}
          colorScheme="blue"
          leftIcon={<HiPlus />}
          onClick={onAddLeadOpen}
          width={{ base: 'full', sm: 'auto' }}
        >
          Add Lead
        </Button>
      </Flex>

      {error && (
        <Box bg="red.50" p={4} borderRadius="lg" mb={4} color="red.700">
          {error}
        </Box>
      )}

      {loading && (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">Loading leads...</Text>
        </Box>
      )}

      {!loading && (
        <>
      {/* Search and Filters */}
      <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={4}>
        <VStack spacing={3} align="stretch">
          {/* Search Bar */}
          <Flex gap={3} direction={{ base: 'column', sm: 'row' }} align="stretch">
            <InputGroup flex="1">
              <InputLeftElement pointerEvents="none">
                <HiSearch />
              </InputLeftElement>
              <Input
                placeholder="Search name or phone number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size={{ base: 'sm', md: 'md' }}
              />
            </InputGroup>
          </Flex>

          {/* Filters Row */}
          <Flex gap={3} direction={{ base: 'column', sm: 'row' }} align="stretch" flexWrap="wrap">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size={{ base: 'sm', md: 'md' }}
              maxW={{ base: 'full', sm: '220px' }}
              flex={{ base: '1 1 100%', sm: '0 1 auto' }}
            >
              <option value="all">All</option>
              <option value="new">New</option>
              <option value="today">Follow-up Today</option>
              <option value="overdue">Overdue</option>
              <option value="scheduled">Scheduled Follow-up</option>
              <option value="qualified">Qualified</option>
              <option value="unqualified">Unqualified</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="unreach">Unreachable</option>
            </Select>

            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              size={{ base: 'sm', md: 'md' }}
              maxW={{ base: 'full', sm: '180px' }}
              flex={{ base: '1 1 100%', sm: '0 1 auto' }}
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
              value={attemptsFilter}
              onChange={(e) => setAttemptsFilter(e.target.value)}
              size={{ base: 'sm', md: 'md' }}
              maxW={{ base: 'full', sm: '180px' }}
              flex={{ base: '1 1 100%', sm: '0 1 auto' }}
            >
              <option value="all">All Attempts</option>
              <option value="0">0 Attempts</option>
              <option value="1-3">1-3 Attempts</option>
              <option value="4-6">4-6 Attempts</option>
              <option value="7+">7+ Attempts</option>
            </Select>

            {/* Reset Filters Button */}
            <Button
              leftIcon={<HiX />}
              onClick={handleResetFilters}
              size={{ base: 'sm', md: 'md' }}
              variant="outline"
              colorScheme="red"
              flex={{ base: '1 1 100%', sm: '0 1 auto' }}
              isDisabled={searchQuery === '' && statusFilter === 'all' && sourceFilter === 'all' && attemptsFilter === 'all' && !assignedToMe}
            >
              Reset Filters
            </Button>
          </Flex>

          {/* Assigned to Me Filter - Only for Team Lead and Super Agent */}
          {user && (user.role === 'Team Lead' || user.role === 'Super Agent') && (
            <Box>
              <Checkbox
                isChecked={assignedToMe}
                onChange={(e) => setAssignedToMe(e.target.checked)}
                size={{ base: 'sm', md: 'md' }}
                colorScheme="blue"
              >
                <Text fontSize={{ base: 'sm', md: 'md' }}>Assigned to Me</Text>
              </Checkbox>
            </Box>
          )}

          {/* Results Count */}
          <Text fontSize="sm" fontWeight="medium" color="gray.700">
            Showing {filteredLeads.length} of {leads.length} leads
          </Text>
        </VStack>
      </Box>

      {/* Categorized View - Follow-up List with 3 Categories */}
      <VStack spacing={6} align="stretch">
          {/* Overdue Follow-ups */}
          <Box>
            <Flex
              align="center"
              mb={4}
              p={{ base: 2, md: 3 }}
              bg="red.50"
              borderRadius="md"
              borderLeft="4px"
              borderColor="red.500"
              flexWrap="wrap"
              gap={2}
            >
              <HiExclamation size={24} color="red" />
              <Heading size={{ base: 'sm', md: 'md' }} ml={2} color="red.700">
                Overdue Follow-ups
              </Heading>
              <Badge ml={3} colorScheme="red" fontSize={{ base: 'sm', md: 'md' }}>
                {categorizedLeads.overdue.length}
              </Badge>
            </Flex>
            
            {categorizedLeads.overdue.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 4 }}>
                {categorizedLeads.overdue.map(({ lead, followUp }) => {
                  const dueDate = followUp?.scheduledAt;
                  const timeDiff = dueDate ? formatTimeDifference(dueDate) : '';
                  const lastCall = getLastCallForLead(lead.id);
                  
                  return (
                    <Box
                      key={lead.id}
                      bg="red.50"
                      borderRadius="lg"
                      boxShadow="md"
                      p={{ base: 3, md: 4 }}
                      borderLeft="6px"
                      borderColor="red.600"
                      _hover={{ boxShadow: 'lg', bg: 'red.100' }}
                      transition="all 0.2s"
                    >
                      <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap={3} direction={{ base: 'column', lg: 'row' }}>
                        <Box flex="1" minW={{ base: 'full', lg: '300px' }}>
                          <Text
                            fontWeight="bold"
                            fontSize={{ base: 'md', md: 'lg' }}
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                            mb={2}
                          >
                            {lead.name}
                          </Text>
                          
                          <VStack align="stretch" spacing={2}>
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Email:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.email || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Phone:</Text>
                              <Text fontSize="sm" color="gray.700">{formatPhoneForDisplay(lead.phone)}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Source:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.source || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Campaign:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.campaign || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Status:</Text>
                              <HStack>
                                <Badge colorScheme={getStatusBadgeColor(lead.status)} fontSize="sm">
                                  {getStatusLabel(lead.status)}
                                </Badge>
                                {lead.callAttempts > 0 && (
                                  <Badge colorScheme={lead.callAttempts > 6 ? 'red' : lead.callAttempts > 3 ? 'orange' : 'blue'} fontSize="xs">
                                    Calls: {lead.callAttempts}
                                  </Badge>
                                )}
                              </HStack>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Lead Age:</Text>
                              <LeadAge createdAt={lead.createdAt} />
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Assigned To:</Text>
                              <HStack spacing={1}>
                                <Text fontSize="sm" color="gray.700">{lead.assignedTo?.name || 'Unassigned'}</Text>
                                <IconButton
                                  aria-label="Change assignment"
                                  icon={<HiPencil />}
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="blue"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLeadToAssign({
                                      id: lead.id,
                                      name: lead.name,
                                      currentAssignee: lead.assignedTo?.name ?? undefined
                                    });
                                    onAssignOpen();
                                  }}
                                />
                              </HStack>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap" align="flex-start">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Call:</Text>
                              {lastCall ? (
                                <VStack align="flex-start" spacing={1}>
                                  <Text fontSize="sm" color="gray.700">{formatDateTime(lastCall.createdAt)}</Text>
                                  <Badge colorScheme={lastCall.callStatus === 'completed' ? 'green' : lastCall.callStatus === 'busy' ? 'red' : 'orange'} fontSize="xs">
                                    {lastCall.callStatus === 'ring_not_response' ? 'Ring Not Response' : (lastCall.callStatus || '').charAt(0).toUpperCase() + (lastCall.callStatus || '').slice(1)}
                                  </Badge>
                                </VStack>
                              ) : (
                                <Text fontSize="sm" color="gray.700">-</Text>
                              )}
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap" align="flex-start">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Next Followup:</Text>
                              {followUp ? (
                                <VStack align="flex-start" spacing={1}>
                                  <HStack spacing={2} flexWrap="wrap">
                                    <Badge colorScheme="orange" fontSize="xs">Follow-up</Badge>
                                    <Badge colorScheme="red" fontSize="xs">Overdue by {timeDiff}</Badge>
                                  </HStack>
                                  <Text fontSize="sm" color="gray.700">{dueDate ? formatDateTime(dueDate) : '-'}</Text>
                                  {followUp.notes && (
                                    <Text fontSize="xs" color="gray.600" noOfLines={2}>
                                      Note: {followUp.notes}
                                    </Text>
                                  )}
                                </VStack>
                              ) : (
                                <Text fontSize="sm" color="gray.700">-</Text>
                              )}
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Origin:</Text>
                              <Text fontSize="sm" color="gray.700">{formatDateTime(lead.createdAt)}</Text>
                            </HStack>
                            
                            {lead.status !== 'new' && new Date(lead.updatedAt).getTime() !== new Date(lead.createdAt).getTime() && (
                              <HStack spacing={2} flexWrap="wrap">
                                <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Last Edit:</Text>
                                <Text fontSize="sm" color="gray.700">{formatDateTime(lead.updatedAt)}</Text>
                              </HStack>
                            )}
                          </VStack>
                        </Box>

                        <HStack spacing={2} flexWrap="wrap" width={{ base: 'full', lg: 'auto' }} justify={{ base: 'flex-end', lg: 'flex-start' }}>
                          <Button
                            size={{ base: 'xs', sm: 'sm' }}
                            leftIcon={<HiPhone />}
                            colorScheme="green"
                            onClick={() => {
                              setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                              onCallDialerOpen();
                            }}
                          >
                            Call Now
                          </Button>
                          <Tooltip 
                            label={isValidWhatsAppPhone(lead.phone) ? "Send WhatsApp message" : "Invalid phone number"}
                            placement="top"
                          >
                            <IconButton
                              aria-label="Send WhatsApp"
                              icon={<FaWhatsapp />}
                              size={{ base: 'xs', sm: 'sm' }}
                              colorScheme="whatsapp"
                              variant="outline"
                              isDisabled={!isValidWhatsAppPhone(lead.phone)}
                              onClick={(e) => handleWhatsAppClick(lead.phone, e)}
                              _hover={{ transform: 'scale(1.05)' }}
                              transition="all 0.2s"
                            />
                          </Tooltip>
                          <IconButton
                            aria-label="Assign lead"
                            icon={<HiUserAdd />}
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeadToAssign({
                                id: lead.id,
                                name: lead.name,
                                currentAssignee: lead.assignedTo?.name ?? undefined
                              });
                              onAssignOpen();
                            }}
                          />
                          <IconButton
                            aria-label="View details"
                            icon={<HiEye />}
                            size="sm"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                          />
                        </HStack>
                      </Flex>
                    </Box>
                  );
                })}
              </SimpleGrid>
            ) : (
              <Box bg="white" p={6} borderRadius="lg" textAlign="center">
                <Text color="gray.500">No overdue follow-ups ??</Text>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Scheduled Follow-ups - All follow-ups (today and future) */}
          <Box>
            <Flex
              align="center"
              mb={4}
              p={{ base: 2, md: 3 }}
              bg="green.50"
              borderRadius="md"
              borderLeft="4px"
              borderColor="green.500"
              flexWrap="wrap"
              gap={2}
            >
              <HiClock size={24} color="green" />
              <Heading size={{ base: 'sm', md: 'md' }} ml={2} color="green.700">
                Scheduled Follow-ups
              </Heading>
              <Badge ml={3} colorScheme="green" fontSize={{ base: 'sm', md: 'md' }}>
                {categorizedLeads.future.length}
              </Badge>
            </Flex>
            
            {categorizedLeads.future.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 4 }}>
                {categorizedLeads.future.map(({ lead, followUp }) => {
                  const dueDate = followUp?.scheduledAt;
                  const timeDiff = dueDate ? formatTimeDifference(dueDate) : '';
                  const lastCall = getLastCallForLead(lead.id);
                  
                  // Check if due today
                  const now = new Date();
                  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                  const isDueToday = dueDate && new Date(dueDate) >= todayStart && new Date(dueDate) <= todayEnd;
                  
                  return (
                    <Box
                      key={lead.id}
                      bg="white"
                      borderRadius="lg"
                      boxShadow="sm"
                      p={{ base: 3, md: 4 }}
                      borderLeft="4px"
                      borderColor="green.500"
                      _hover={{ boxShadow: 'md' }}
                      transition="all 0.2s"
                    >
                      <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap={3} direction={{ base: 'column', lg: 'row' }}>
                        <Box flex="1" minW={{ base: 'full', lg: '300px' }}>
                          <Text
                            fontWeight="bold"
                            fontSize={{ base: 'md', md: 'lg' }}
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                            mb={2}
                          >
                            {lead.name}
                          </Text>
                          
                          <VStack align="stretch" spacing={2}>
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Email:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.email || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Phone:</Text>
                              <Text fontSize="sm" color="gray.700">{formatPhoneForDisplay(lead.phone)}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Source:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.source || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Campaign:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.campaign || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Status:</Text>
                              <HStack>
                                <Badge colorScheme={getStatusBadgeColor(lead.status)} fontSize="sm">
                                  {getStatusLabel(lead.status)}
                                </Badge>
                                {lead.callAttempts > 0 && (
                                  <Badge colorScheme={lead.callAttempts > 6 ? 'red' : lead.callAttempts > 3 ? 'orange' : 'blue'} fontSize="xs">
                                    Calls: {lead.callAttempts}
                                  </Badge>
                                )}
                              </HStack>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Lead Age:</Text>
                              <LeadAge createdAt={lead.createdAt} />
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Assigned To:</Text>
                              <HStack spacing={1}>
                                <Text fontSize="sm" color="gray.700">{lead.assignedTo?.name || 'Unassigned'}</Text>
                                <IconButton
                                  aria-label="Change assignment"
                                  icon={<HiPencil />}
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="blue"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLeadToAssign({
                                      id: lead.id,
                                      name: lead.name,
                                      currentAssignee: lead.assignedTo?.name ?? undefined
                                    });
                                    onAssignOpen();
                                  }}
                                />
                              </HStack>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap" align="flex-start">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Call:</Text>
                              {lastCall ? (
                                <VStack align="flex-start" spacing={1}>
                                  <Text fontSize="sm" color="gray.700">{formatDateTime(lastCall.createdAt)}</Text>
                                  <Badge colorScheme={lastCall.callStatus === 'completed' ? 'green' : lastCall.callStatus === 'busy' ? 'red' : 'orange'} fontSize="xs">
                                    {lastCall.callStatus === 'ring_not_response' ? 'Ring Not Response' : (lastCall.callStatus || '').charAt(0).toUpperCase() + (lastCall.callStatus || '').slice(1)}
                                  </Badge>
                                </VStack>
                              ) : (
                                <Text fontSize="sm" color="gray.700">-</Text>
                              )}
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap" align="flex-start">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Next Followup:</Text>
                              {followUp ? (
                                <VStack align="flex-start" spacing={1}>
                                  <HStack spacing={2} flexWrap="wrap">
                                    <Badge colorScheme="orange" fontSize="xs">Follow-up</Badge>
                                    {isDueToday ? (
                                      <Badge colorScheme="blue" fontSize="xs">DUE TODAY</Badge>
                                    ) : (
                                      <Badge colorScheme="green" fontSize="xs">In {timeDiff}</Badge>
                                    )}
                                  </HStack>
                                  <Text fontSize="sm" color="gray.700">{dueDate ? formatDateTime(dueDate) : '-'}</Text>
                                  {followUp.notes && (
                                    <Text fontSize="xs" color="gray.600" noOfLines={2}>
                                      Note: {followUp.notes}
                                    </Text>
                                  )}
                                </VStack>
                              ) : (
                                <Text fontSize="sm" color="gray.700">-</Text>
                              )}
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Origin:</Text>
                              <Text fontSize="sm" color="gray.700">{formatDateTime(lead.createdAt)}</Text>
                            </HStack>
                            
                            {lead.status !== 'new' && new Date(lead.updatedAt).getTime() !== new Date(lead.createdAt).getTime() && (
                              <HStack spacing={2} flexWrap="wrap">
                                <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Last Edit:</Text>
                                <Text fontSize="sm" color="gray.700">{formatDateTime(lead.updatedAt)}</Text>
                              </HStack>
                            )}
                          </VStack>
                        </Box>

                        <HStack spacing={2} flexWrap="wrap" width={{ base: 'full', lg: 'auto' }} justify={{ base: 'flex-end', lg: 'flex-start' }}>
                          <Button
                            size={{ base: 'xs', sm: 'sm' }}
                            leftIcon={<HiPhone />}
                            colorScheme="green"
                            variant="outline"
                            onClick={() => {
                              setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                              onCallDialerOpen();
                            }}
                          >
                            Call
                          </Button>
                          <Tooltip 
                            label={isValidWhatsAppPhone(lead.phone) ? "Send WhatsApp message" : "Invalid phone number"}
                            placement="top"
                          >
                            <IconButton
                              aria-label="Send WhatsApp"
                              icon={<FaWhatsapp />}
                              size={{ base: 'xs', sm: 'sm' }}
                              colorScheme="whatsapp"
                              variant="outline"
                              isDisabled={!isValidWhatsAppPhone(lead.phone)}
                              onClick={(e) => handleWhatsAppClick(lead.phone, e)}
                              _hover={{ transform: 'scale(1.05)' }}
                              transition="all 0.2s"
                            />
                          </Tooltip>
                          <IconButton
                            aria-label="Assign lead"
                            icon={<HiUserAdd />}
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeadToAssign({
                                id: lead.id,
                                name: lead.name,
                                currentAssignee: lead.assignedTo?.name ?? undefined
                              });
                              onAssignOpen();
                            }}
                          />
                          <IconButton
                            aria-label="View details"
                            icon={<HiEye />}
                            size="sm"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                          />
                        </HStack>
                      </Flex>
                    </Box>
                  );
                })}
              </SimpleGrid>
            ) : (
              <Box bg="white" p={6} borderRadius="lg" textAlign="center">
                <Text color="gray.500">No scheduled follow-ups</Text>
              </Box>
            )}
          </Box>

          <Divider />

          {/* New Leads - No follow-ups scheduled yet */}
          <Box>
            <Flex
              align="center"
              mb={4}
              p={{ base: 2, md: 3 }}
              bg="blue.50"
              borderRadius="md"
              borderLeft="4px"
              borderColor="blue.500"
              flexWrap="wrap"
              gap={2}
            >
              <HiUserAdd size={24} color="blue" />
              <Heading size={{ base: 'sm', md: 'md' }} ml={2} color="blue.700">
                New Leads
              </Heading>
              <Badge ml={3} colorScheme="blue" fontSize={{ base: 'sm', md: 'md' }}>
                {categorizedLeads.newLeads.length}
              </Badge>
            </Flex>
            
            {categorizedLeads.newLeads.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 4 }}>
                {categorizedLeads.newLeads.map(({ lead, followUp }) => {
                  const dueDate = followUp?.scheduledAt;
                  const isNewLead = !followUp;
                  const lastCall = getLastCallForLead(lead.id);
                  
                  return (
                    <Box
                      key={lead.id}
                      bg="white"
                      borderRadius="lg"
                      boxShadow="sm"
                      p={{ base: 3, md: 4 }}
                      borderLeft="4px"
                      borderColor="blue.500"
                      _hover={{ boxShadow: 'md' }}
                      transition="all 0.2s"
                    >
                      <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap={3} direction={{ base: 'column', lg: 'row' }}>
                        <Box flex="1" minW={{ base: 'full', lg: '300px' }}>
                          <Text
                            fontWeight="bold"
                            fontSize={{ base: 'md', md: 'lg' }}
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                            mb={2}
                          >
                            {lead.name}
                          </Text>
                          
                          <VStack align="stretch" spacing={2}>
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Email:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.email || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Phone:</Text>
                              <Text fontSize="sm" color="gray.700">{formatPhoneForDisplay(lead.phone)}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Source:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.source || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Campaign:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.campaign || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Status:</Text>
                              <HStack>
                                <Badge colorScheme={getStatusBadgeColor(lead.status)} fontSize="sm">
                                  {getStatusLabel(lead.status)}
                                </Badge>
                                {lead.callAttempts > 0 && (
                                  <Badge colorScheme={lead.callAttempts > 6 ? 'red' : lead.callAttempts > 3 ? 'orange' : 'blue'} fontSize="xs">
                                    Calls: {lead.callAttempts}
                                  </Badge>
                                )}
                              </HStack>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Lead Age:</Text>
                              <LeadAge createdAt={lead.createdAt} />
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Assigned To:</Text>
                              <HStack spacing={1}>
                                <Text fontSize="sm" color="gray.700">{lead.assignedTo?.name || 'Unassigned'}</Text>
                                <IconButton
                                  aria-label="Change assignment"
                                  icon={<HiPencil />}
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="blue"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLeadToAssign({
                                      id: lead.id,
                                      name: lead.name,
                                      currentAssignee: lead.assignedTo?.name ?? undefined
                                    });
                                    onAssignOpen();
                                  }}
                                />
                              </HStack>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap" align="flex-start">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Call:</Text>
                              {lastCall ? (
                                <VStack align="flex-start" spacing={1}>
                                  <Text fontSize="sm" color="gray.700">{formatDateTime(lastCall.createdAt)}</Text>
                                  <Badge colorScheme={lastCall.callStatus === 'completed' ? 'green' : lastCall.callStatus === 'busy' ? 'red' : 'orange'} fontSize="xs">
                                    {lastCall.callStatus === 'ring_not_response' ? 'Ring Not Response' : (lastCall.callStatus || '').charAt(0).toUpperCase() + (lastCall.callStatus || '').slice(1)}
                                  </Badge>
                                </VStack>
                              ) : (
                                <Text fontSize="sm" color="gray.700">-</Text>
                              )}
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap" align="flex-start">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Next Followup:</Text>
                              {followUp ? (
                                <VStack align="flex-start" spacing={1}>
                                  <HStack spacing={2} flexWrap="wrap">
                                    <Badge colorScheme="orange" fontSize="xs">Follow-up</Badge>
                                    <Badge colorScheme="blue" fontSize="xs">Due Today</Badge>
                                  </HStack>
                                  <Text fontSize="sm" color="gray.700">{dueDate ? formatDateTime(dueDate) : '-'}</Text>
                                  {followUp.notes && (
                                    <Text fontSize="xs" color="gray.600" noOfLines={2}>
                                      Note: {followUp.notes}
                                    </Text>
                                  )}
                                </VStack>
                              ) : (
                                <Text fontSize="sm" color="gray.700">-</Text>
                              )}
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Origin:</Text>
                              <Text fontSize="sm" color="gray.700">{formatDateTime(lead.createdAt)}</Text>
                            </HStack>
                            
                            {lead.status !== 'new' && new Date(lead.updatedAt).getTime() !== new Date(lead.createdAt).getTime() && (
                              <HStack spacing={2} flexWrap="wrap">
                                <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Last Edit:</Text>
                                <Text fontSize="sm" color="gray.700">{formatDateTime(lead.updatedAt)}</Text>
                              </HStack>
                            )}
                          </VStack>
                        </Box>

                        <HStack spacing={2} flexWrap="wrap" width={{ base: 'full', lg: 'auto' }} justify={{ base: 'flex-end', lg: 'flex-start' }}>
                          <Button
                            size={{ base: 'xs', sm: 'sm' }}
                            leftIcon={<HiPhone />}
                            colorScheme="green"
                            onClick={() => {
                              setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                              onCallDialerOpen();
                            }}
                          >
                            Call
                          </Button>
                          <Tooltip 
                            label={isValidWhatsAppPhone(lead.phone) ? "Send WhatsApp message" : "Invalid phone number"}
                            placement="top"
                          >
                            <IconButton
                              aria-label="Send WhatsApp"
                              icon={<FaWhatsapp />}
                              size={{ base: 'xs', sm: 'sm' }}
                              colorScheme="whatsapp"
                              variant="outline"
                              isDisabled={!isValidWhatsAppPhone(lead.phone)}
                              onClick={(e) => handleWhatsAppClick(lead.phone, e)}
                              _hover={{ transform: 'scale(1.05)' }}
                              transition="all 0.2s"
                            />
                          </Tooltip>
                          <IconButton
                            aria-label="Assign lead"
                            icon={<HiUserAdd />}
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeadToAssign({
                                id: lead.id,
                                name: lead.name,
                                currentAssignee: lead.assignedTo?.name ?? undefined
                              });
                              onAssignOpen();
                            }}
                          />
                          <IconButton
                            aria-label="View details"
                            icon={<HiEye />}
                            size="sm"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                          />
                        </HStack>
                      </Flex>
                    </Box>
                  );
                })}
              </SimpleGrid>
            ) : (
              <Box bg="white" p={6} borderRadius="lg" textAlign="center">
                <Text color="gray.500">No new leads</Text>
              </Box>
            )}
          </Box>

          {/* Status Filtered Leads - For specific status filters like unqualified, won, lost, etc. */}
          {categorizedLeads.statusFiltered && categorizedLeads.statusFiltered.length > 0 && (
            <Box>
              <Flex
                align="center"
                mb={4}
                p={{ base: 2, md: 3 }}
                bg="gray.50"
                borderRadius="md"
                borderLeft="4px"
                borderColor={
                  statusFilter === 'unqualified' ? 'purple.500' :
                  statusFilter === 'won' ? 'green.500' :
                  statusFilter === 'lost' ? 'red.500' :
                  statusFilter === 'qualified' ? 'cyan.500' :
                  statusFilter === 'unreach' ? 'pink.500' :
                  'gray.500'
                }
                flexWrap="wrap"
                gap={2}
              >
                <Icon 
                  as={
                    statusFilter === 'unqualified' ? HiX :
                    statusFilter === 'won' ? HiPlus :
                    statusFilter === 'lost' ? HiBan :
                    HiViewBoards
                  } 
                  boxSize={6} 
                  color={
                    statusFilter === 'unqualified' ? 'purple.600' :
                    statusFilter === 'won' ? 'green.600' :
                    statusFilter === 'lost' ? 'red.600' :
                    statusFilter === 'qualified' ? 'cyan.600' :
                    statusFilter === 'unreach' ? 'pink.600' :
                    'gray.600'
                  }
                />
                <Heading size={{ base: 'sm', md: 'md' }} ml={2} color={
                  statusFilter === 'unqualified' ? 'purple.700' :
                  statusFilter === 'won' ? 'green.700' :
                  statusFilter === 'lost' ? 'red.700' :
                  statusFilter === 'qualified' ? 'cyan.700' :
                  statusFilter === 'unreach' ? 'pink.700' :
                  'gray.700'
                }>
                  {getStatusLabel(statusFilter)} Leads
                </Heading>
                <Badge ml={3} colorScheme={
                  statusFilter === 'unqualified' ? 'purple' :
                  statusFilter === 'won' ? 'green' :
                  statusFilter === 'lost' ? 'red' :
                  statusFilter === 'qualified' ? 'cyan' :
                  statusFilter === 'unreach' ? 'pink' :
                  'gray'
                } fontSize={{ base: 'sm', md: 'md' }}>
                  {categorizedLeads.statusFiltered.length}
                </Badge>
              </Flex>
              
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 3, md: 4 }}>
                {categorizedLeads.statusFiltered.map(({ lead, followUp }) => {
                  const dueDate = followUp?.scheduledAt;
                  const timeDiff = dueDate ? formatTimeDifference(dueDate) : '';
                  const lastCall = getLastCallForLead(lead.id);
                  
                  return (
                    <Box
                      key={lead.id}
                      bg="white"
                      borderRadius="lg"
                      boxShadow="sm"
                      p={{ base: 3, md: 4 }}
                      borderLeft="6px"
                      borderColor={
                        statusFilter === 'unqualified' ? 'purple.400' :
                        statusFilter === 'won' ? 'green.400' :
                        statusFilter === 'lost' ? 'red.400' :
                        statusFilter === 'qualified' ? 'cyan.400' :
                        statusFilter === 'unreach' ? 'pink.400' :
                        'gray.400'
                      }
                      _hover={{ boxShadow: 'md' }}
                      transition="all 0.2s"
                    >
                      <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap={3} direction={{ base: 'column', lg: 'row' }}>
                        <Box flex="1" minW={{ base: 'full', lg: '300px' }}>
                          <Text
                            fontWeight="bold"
                            fontSize={{ base: 'md', md: 'lg' }}
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                            mb={2}
                          >
                            {lead.name}
                          </Text>
                          
                          <VStack align="stretch" spacing={2}>
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Email:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.email || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Phone:</Text>
                              <Text fontSize="sm" color="gray.700">{formatPhoneForDisplay(lead.phone)}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Source:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.source || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Campaign:</Text>
                              <Text fontSize="sm" color="gray.700">{lead.campaign || '-'}</Text>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Status:</Text>
                              <HStack>
                                <Badge colorScheme={getStatusBadgeColor(lead.status)} fontSize="sm">
                                  {getStatusLabel(lead.status)}
                                </Badge>
                                {lead.callAttempts > 0 && (
                                  <Badge colorScheme={lead.callAttempts > 6 ? 'red' : lead.callAttempts > 3 ? 'orange' : 'blue'} fontSize="xs">
                                    Calls: {lead.callAttempts}
                                  </Badge>
                                )}
                              </HStack>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Lead Age:</Text>
                              <LeadAge createdAt={lead.createdAt} />
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Assigned To:</Text>
                              <HStack spacing={1}>
                                <Text fontSize="sm" color="gray.700">{lead.assignedTo?.name || 'Unassigned'}</Text>
                                <IconButton
                                  aria-label="Change assignment"
                                  icon={<HiPencil />}
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="blue"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLeadToAssign({
                                      id: lead.id,
                                      name: lead.name,
                                      currentAssignee: lead.assignedTo?.name ?? undefined
                                    });
                                    onAssignOpen();
                                  }}
                                />
                              </HStack>
                            </HStack>
                            
                            <HStack spacing={2} flexWrap="wrap">
                              <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Origin:</Text>
                              <Text fontSize="sm" color="gray.700">{formatDateTime(lead.createdAt)}</Text>
                            </HStack>
                            
                            {lead.status !== 'new' && new Date(lead.updatedAt).getTime() !== new Date(lead.createdAt).getTime() && (
                              <HStack spacing={2} flexWrap="wrap">
                                <Text fontSize="sm" color="gray.600" fontWeight="medium" minW="100px">Last Edit:</Text>
                                <Text fontSize="sm" color="gray.700">{formatDateTime(lead.updatedAt)}</Text>
                              </HStack>
                            )}
                          </VStack>
                        </Box>

                        <HStack spacing={2} flexWrap="wrap" width={{ base: 'full', lg: 'auto' }} justify={{ base: 'flex-end', lg: 'flex-start' }}>
                          <Button
                            size={{ base: 'xs', sm: 'sm' }}
                            leftIcon={<HiPhone />}
                            colorScheme="green"
                            onClick={() => {
                              setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                              onCallDialerOpen();
                            }}
                          >
                            Call
                          </Button>
                          <Tooltip 
                            label={isValidWhatsAppPhone(lead.phone) ? "Send WhatsApp message" : "Invalid phone number"}
                            placement="top"
                          >
                            <IconButton
                              aria-label="Send WhatsApp"
                              icon={<FaWhatsapp />}
                              size={{ base: 'xs', sm: 'sm' }}
                              colorScheme="whatsapp"
                              variant="outline"
                              isDisabled={!isValidWhatsAppPhone(lead.phone)}
                              onClick={(e) => handleWhatsAppClick(lead.phone, e)}
                              _hover={{ transform: 'scale(1.05)' }}
                              transition="all 0.2s"
                            />
                          </Tooltip>
                          <IconButton
                            aria-label="Assign lead"
                            icon={<HiUserAdd />}
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeadToAssign({
                                id: lead.id,
                                name: lead.name,
                                currentAssignee: lead.assignedTo?.name ?? undefined
                              });
                              onAssignOpen();
                            }}
                          />
                          <IconButton
                            aria-label="View details"
                            icon={<HiEye />}
                            size="sm"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                          />
                        </HStack>
                      </Flex>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>
          )}
        </VStack>

      {/* Conversion Modals */}
      {selectedLead && (
        <>
          <ConvertToUnreachableModal
            isOpen={isUnreachableOpen}
            onClose={() => {
              onUnreachableClose();
              setSelectedLead(null);
            }}
            leadId={selectedLead.id}
            leadName={selectedLead.name}
            onSuccess={handleRefreshLeads}
            onBack={() => {
              onUnreachableClose();
              setSelectedLead(null);
            }}
          />
          <ConvertToUnqualifiedModal
            isOpen={isUnqualifiedOpen}
            onClose={() => {
              onUnqualifiedClose();
              setSelectedLead(null);
            }}
            leadId={selectedLead.id}
            leadName={selectedLead.name}
            onSuccess={handleRefreshLeads}
            onBack={() => {
              onUnqualifiedClose();
              setSelectedLead(null);
            }}
          />
        </>
      )}

      {/* Assign Lead Modal */}
      {leadToAssign && (
        <AssignLeadModal
          isOpen={isAssignOpen}
          onClose={onAssignClose}
          leadId={leadToAssign.id}
          leadName={leadToAssign.name}
          currentAssignee={leadToAssign.currentAssignee}
          onSuccess={() => {}}
        />
      )}

      {/* Add Lead Modal */}
      <AddLeadModal isOpen={isAddLeadOpen} onClose={onAddLeadClose} />

      {/* Call Dialer Modal */}
      {leadToCall && (
        <CallDialerModal
          isOpen={isCallDialerOpen}
          onClose={() => {
            onCallDialerClose();
            setLeadToCall(null);
          }}
          leadId={leadToCall.id}
          leadName={leadToCall.name}
          leadPhone={leadToCall.phone}
          onOpenUnreachable={() => {
            setSelectedLead({ id: leadToCall.id, name: leadToCall.name });
            onCallDialerClose();
            setLeadToCall(null);
            setTimeout(() => {
              onUnreachableOpen();
            }, 100);
          }}
          onOpenUnqualified={() => {
            setSelectedLead({ id: leadToCall.id, name: leadToCall.name });
            onCallDialerClose();
            setLeadToCall(null);
            setTimeout(() => {
              onUnqualifiedOpen();
            }, 100);
          }}
        />
      )}
        </>
      )}
    </Box>
  );
}





