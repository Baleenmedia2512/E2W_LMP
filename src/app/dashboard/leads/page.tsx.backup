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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
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
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Collapse,
  useBreakpointValue,
} from '@chakra-ui/react';
import {
  HiPlus,
  HiDotsVertical,
  HiEye,
  HiPencil,
  HiPhone,
  HiClock,
  HiBan,
  HiX,
  HiUserAdd,
  HiSearch,
  HiViewList,
  HiViewGrid,
  HiViewBoards,
  HiExclamation,
  HiFilter,
  HiRefresh,
} from 'react-icons/hi';
import AddLeadModal from '@/features/leads/components/AddLeadModal';
import AssignLeadModal from '@/features/leads/components/AssignLeadModal';
import ConvertToUnreachableModal from '@/features/leads/components/ConvertToUnreachableModal';
import ConvertToUnqualifiedModal from '@/features/leads/components/ConvertToUnqualifiedModal';
import MarkAsWonModal from '@/features/leads/components/MarkAsWonModal';
import MarkAsLostModal from '@/features/leads/components/MarkAsLostModal';
import CallDialerModal from '@/features/leads/components/CallDialerModal';
import QuickActionsMenu from '@/shared/components/QuickActionsMenu';
import LeadTile from '@/shared/components/LeadTile';
import { formatDate } from '@/shared/lib/date-utils';
import { categorizeAndSortLeads, formatTimeDifference } from '@/shared/lib/utils/lead-categorization';
import type { CallLog } from '@/shared/types';

type ViewMode = 'table' | 'tiles';

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

// Lead management page with multiple view modes and categorization
export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [attemptsFilter, setAttemptsFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('tiles');
  const [users, setUsers] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);
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
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh every minute to update overdue status
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Initialize filters from URL params and session storage
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const sessionFilters = sessionStorage.getItem('leadFilters');
    
    // URL params take precedence over session storage
    if (params.toString()) {
      setSearchQuery(params.get('search') || '');
      setStatusFilter(params.get('status') || 'all');
      setSourceFilter(params.get('source') || 'all');
      setDateRangeFilter(params.get('dateRange') || 'all');
      setAttemptsFilter(params.get('attempts') || 'all');
      setAgentFilter(params.get('agent') || 'all');
      setViewMode((params.get('view') as ViewMode) || 'tiles');
    } else if (sessionFilters) {
      // Load from session storage if no URL params
      try {
        const filters = JSON.parse(sessionFilters);
        setSearchQuery(filters.searchQuery || '');
        setStatusFilter(filters.statusFilter || 'all');
        setSourceFilter(filters.sourceFilter || 'all');
        setDateRangeFilter(filters.dateRangeFilter || 'all');
        setAttemptsFilter(filters.attemptsFilter || 'all');
        setAgentFilter(filters.agentFilter || 'all');
        setViewMode(filters.viewMode || 'tiles');
      } catch (e) {
        console.error('Failed to parse session filters', e);
      }
    }
  }, [searchParams]);

  // Persist filters to session storage and URL
  useEffect(() => {
    const filters = {
      searchQuery,
      statusFilter,
      sourceFilter,
      dateRangeFilter,
      attemptsFilter,
      agentFilter,
      viewMode,
    };
    
    // Save to session storage
    sessionStorage.setItem('leadFilters', JSON.stringify(filters));
    
    // Update URL params for deep-linking
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (sourceFilter !== 'all') params.set('source', sourceFilter);
    if (dateRangeFilter !== 'all') params.set('dateRange', dateRangeFilter);
    if (attemptsFilter !== 'all') params.set('attempts', attemptsFilter);
    if (agentFilter !== 'all') params.set('agent', agentFilter);
    if (viewMode !== 'tiles') params.set('view', viewMode);
    
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    window.history.replaceState({}, '', `/dashboard/leads${newUrl}`);
  }, [searchQuery, statusFilter, sourceFilter, dateRangeFilter, attemptsFilter, agentFilter, viewMode]);

  // Fetch leads and follow-ups from API
  const fetchData = async () => {
    try {
      setLoading(true);
      const [leadsRes, followUpsRes, usersRes] = await Promise.all([
        fetch('/api/leads?limit=100'),
        fetch('/api/followups?limit=100'),
        fetch('/api/users'),
      ]);
      
      const leadsData = await leadsRes.json();
      const followUpsData = await followUpsRes.json();
      const usersData = await usersRes.json();
      
      if (leadsData.success) {
        setLeads(leadsData.data);
      } else {
        setError(leadsData.error || 'Failed to fetch leads');
      }
      
      if (followUpsData.success) {
        setFollowUps(followUpsData.data);
      }
      
      if (usersData.users) {
        setUsers(usersData.users);
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();

    // Refresh data when tab becomes visible (e.g., after editing a lead)
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
  const { isOpen: isWonOpen, onOpen: onWonOpen, onClose: onWonClose } = useDisclosure();
  const { isOpen: isLostOpen, onOpen: onLostOpen, onClose: onLostClose } = useDisclosure();
  const { isOpen: isAssignOpen, onOpen: onAssignOpen, onClose: onAssignClose } = useDisclosure();
  const { isOpen: isCallDialerOpen, onOpen: onCallDialerOpen, onClose: onCallDialerClose } = useDisclosure();

  // Helper functions to get call and follow-up data for table/list/tiles views
  const getLastCallForLead = (leadId: string): CallLog | null => {
    // In a real app, you'd have call logs data
    // For now, return null
    return null;
  };

  const getNextFollowUpForLead = (leadId: string) => {
    // Find the next pending follow-up for this lead
    const leadFollowUps = followUps.filter(
      (fu: any) => fu.leadId === leadId && fu.status === 'pending'
    );
    if (leadFollowUps.length === 0) return null;
    
    // Sort by scheduled date and return the earliest one
    return leadFollowUps.sort((a: any, b: any) => 
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )[0];
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

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(lead => lead.source === sourceFilter);
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

    // Agent/Assigned To filter
    if (agentFilter !== 'all') {
      if (agentFilter === 'unassigned') {
        filtered = filtered.filter(lead => !lead.assignedToId);
      } else {
        filtered = filtered.filter(lead => lead.assignedToId === agentFilter);
      }
    }

    return filtered;
  }, [searchQuery, statusFilter, sourceFilter, dateRangeFilter, attemptsFilter, agentFilter, leads]);

  // Categorize and sort leads for categorized view
  const categorizedLeads = useMemo(() => {
    return categorizeAndSortLeads(filteredLeads, followUps);
  }, [filteredLeads, followUps, currentTime]); // Re-calculate when time updates

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (statusFilter !== 'all') count++;
    if (sourceFilter !== 'all') count++;
    if (dateRangeFilter !== 'all') count++;
    if (attemptsFilter !== 'all') count++;
    if (agentFilter !== 'all') count++;
    return count;
  }, [searchQuery, statusFilter, sourceFilter, dateRangeFilter, attemptsFilter, agentFilter]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSourceFilter('all');
    setDateRangeFilter('all');
    setAttemptsFilter('all');
    setAgentFilter('all');
    sessionStorage.removeItem('leadFilters');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'blue'; // Blue
      case 'followup':
        return 'orange'; // Amber
      case 'contacted':
        return 'purple';
      case 'qualified':
        return 'cyan';
      case 'unreach':
        return 'pink'; // Pink
      case 'unqualified':
        return 'purple'; // Magenta (purple is closest to magenta in Chakra)
      case 'won':
        return 'green'; // Green
      case 'lost':
        return 'red'; // Red
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
          {/* Search Bar and Filter Toggle */}
          <Flex gap={3} align="center">
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
            
            {/* Mobile Filter Toggle Button */}
            {isMobile && (
              <IconButton
                aria-label="Toggle filters"
                icon={<HiFilter />}
                size="sm"
                colorScheme={activeFiltersCount > 0 ? 'blue' : 'gray'}
                variant={showFilters ? 'solid' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
              />
            )}
          </Flex>

          {/* Filter Section - Desktop: Always visible, Mobile: Collapsible */}
          <Collapse in={!isMobile || showFilters} animateOpacity>
            <VStack spacing={3} align="stretch">
              {/* Filters Row 1 */}
              <Flex gap={3} direction={{ base: 'column', sm: 'row' }} align="stretch" flexWrap="wrap">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  size={{ base: 'sm', md: 'md' }}
                  maxW={{ base: 'full', sm: '180px' }}
                  flex={{ base: '1 1 100%', sm: '0 1 auto' }}
                  bg={statusFilter !== 'all' ? 'blue.50' : 'white'}
                >
                  <option value="all">All Status</option>
                  <option value="new">New</option>
                  <option value="followup">Follow-up</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="unreach">Unreachable</option>
                  <option value="unqualified">Unqualified</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                </Select>

                <Select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  size={{ base: 'sm', md: 'md' }}
                  maxW={{ base: 'full', sm: '180px' }}
                  flex={{ base: '1 1 100%', sm: '0 1 auto' }}
                  bg={sourceFilter !== 'all' ? 'blue.50' : 'white'}
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
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  size={{ base: 'sm', md: 'md' }}
                  maxW={{ base: 'full', sm: '180px' }}
                  flex={{ base: '1 1 100%', sm: '0 1 auto' }}
                  bg={dateRangeFilter !== 'all' ? 'blue.50' : 'white'}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </Select>
              </Flex>

              {/* Filters Row 2 */}
              <Flex gap={3} direction={{ base: 'column', sm: 'row' }} align="stretch" flexWrap="wrap">
                <Select
                  value={attemptsFilter}
                  onChange={(e) => setAttemptsFilter(e.target.value)}
                  size={{ base: 'sm', md: 'md' }}
                  maxW={{ base: 'full', sm: '180px' }}
                  flex={{ base: '1 1 100%', sm: '0 1 auto' }}
                  bg={attemptsFilter !== 'all' ? 'blue.50' : 'white'}
                >
                  <option value="all">All Attempts</option>
                  <option value="0">0 Attempts</option>
                  <option value="1-3">1-3 Attempts</option>
                  <option value="4-6">4-6 Attempts</option>
                  <option value="7+">7+ Attempts</option>
                </Select>

                <Select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  size={{ base: 'sm', md: 'md' }}
                  maxW={{ base: 'full', sm: '200px' }}
                  flex={{ base: '1 1 100%', sm: '0 1 auto' }}
                  bg={agentFilter !== 'all' ? 'blue.50' : 'white'}
                >
                  <option value="all">All Agents</option>
                  <option value="unassigned">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </Flex>
            </VStack>
          </Collapse>

          {/* Results Count, Active Filters, Clear Filters, and View Toggle */}
          <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
            <HStack spacing={2} flexWrap="wrap">
              <Text fontSize="sm" fontWeight="medium" color="gray.700">
                Showing {filteredLeads.length} of {leads.length} leads
              </Text>
              
              {activeFiltersCount > 0 && (
                <>
                  <Badge colorScheme="blue" fontSize="xs" px={2} py={1}>
                    {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''}
                  </Badge>
                  <Button
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    leftIcon={<HiX />}
                    onClick={handleClearFilters}
                  >
                    Clear All
                  </Button>
                </>
              )}
            </HStack>
            
            <HStack spacing={0} flexWrap="wrap">
              <Tooltip label="Table view">
                <IconButton
                  aria-label="Table view"
                  icon={<HiViewList />}
                  size={{ base: 'sm', md: 'md' }}
                  colorScheme={viewMode === 'table' ? 'blue' : 'gray'}
                  variant={viewMode === 'table' ? 'solid' : 'ghost'}
                  onClick={() => setViewMode('table')}
                  borderRightRadius={0}
                />
              </Tooltip>
              <Tooltip label="Tiles view">
                <IconButton
                  aria-label="Tiles view"
                  icon={<HiViewGrid />}
                  size={{ base: 'sm', md: 'md' }}
                  colorScheme={viewMode === 'tiles' ? 'blue' : 'gray'}
                  variant={viewMode === 'tiles' ? 'solid' : 'ghost'}
                  onClick={() => setViewMode('tiles')}
                  borderLeftRadius={0}
                />
              </Tooltip>
            </HStack>
          </Flex>
        </VStack>
      </Box>

      {viewMode === 'table' ? (
        /* Table View */
        <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          <Box overflowX="auto" sx={{
            '&': {
              transition: 'all 0.3s ease-in-out',
            }
          }}>
          <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th display={{ base: 'none', md: 'table-cell' }}>Email</Th>
                <Th>Phone</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Source</Th>
                <Th>Status</Th>
                <Th display={{ base: 'none', sm: 'table-cell' }}>Lead Age</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Assigned To</Th>
                <Th display={{ base: 'none', md: 'table-cell' }}>Last Call</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Next Followup</Th>
                <Th display={{ base: 'none', sm: 'table-cell' }}>Created</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredLeads && filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => {
                  const lastCall = getLastCallForLead(lead.id);
                  const nextFollowUp = getNextFollowUpForLead(lead.id);
                  
                  return (
                  <Tr key={lead.id} _hover={{ bg: 'gray.50' }} sx={{
                    transition: 'background-color 0.2s ease',
                  }}>
                    <Td
                      fontWeight="medium"
                      cursor="pointer"
                      color="blue.600"
                      onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                      whiteSpace="nowrap"
                      fontSize={{ base: 'xs', md: 'sm' }}
                    >
                      {lead.name}
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', md: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{lead.email || '-'}</Td>
                    <Td whiteSpace="nowrap" fontSize={{ base: 'xs', md: 'sm' }}>{lead.phone}</Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', lg: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>
                      <Badge colorScheme="purple" fontSize="xs">{lead.source}</Badge>
                    </Td>
                    <Td>
                      <VStack spacing={1} align="flex-start">
                        <Badge colorScheme={getStatusColor(lead.status)} fontSize={{ base: 'xs', md: 'sm' }}>
                          {lead.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {lead.callAttempts > 0 && (
                          <Badge colorScheme={lead.callAttempts > 6 ? 'red' : lead.callAttempts > 3 ? 'orange' : 'blue'} fontSize={{ base: 'xs', md: 'xs' }}>
                            📞 {lead.callAttempts}
                          </Badge>
                        )}
                      </VStack>
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', sm: 'table-cell' }}>
                      <LeadAge createdAt={lead.createdAt} />
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', lg: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{lead.assignedTo?.name || 'Unassigned'}</Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', md: 'table-cell' }}>
                      {lastCall ? (
                        <Text fontSize={{ base: 'xs', md: 'sm' }}>
                          {formatDate(lastCall.createdAt)}
                          <br />
                          <Badge colorScheme={lastCall.callStatus === 'completed' ? 'green' : lastCall.callStatus === 'busy' ? 'red' : 'orange'} fontSize="xs">
                            {lastCall.callStatus === 'ring_not_response' ? 'Ring Not Response' : (lastCall.callStatus || '').charAt(0).toUpperCase() + (lastCall.callStatus || '').slice(1)}
                          </Badge>
                        </Text>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', lg: 'table-cell' }}>
                      {nextFollowUp ? (
                        <Text fontSize={{ base: 'xs', md: 'sm' }}>
                          {formatDate(nextFollowUp.scheduledAt)}
                        </Text>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', sm: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{formatDate(lead.createdAt)}</Td>
                    <Td>
                      <QuickActionsMenu
                        lead={lead}
                        onAssign={(lead) => {
                          setLeadToAssign({
                            id: lead.id,
                            name: lead.name,
                            currentAssignee: filteredLeads.find(l => l.id === lead.id)?.assignedTo?.name ?? undefined
                          });
                          onAssignOpen();
                        }}
                        onConvertUnreachable={(lead) => {
                          setSelectedLead(lead);
                          onUnreachableOpen();
                        }}
                        onConvertUnqualified={(lead) => {
                          setSelectedLead(lead);
                          onUnqualifiedOpen();
                        }}
                        onMarkAsWon={(lead) => {
                          setSelectedLead(lead);
                          onWonOpen();
                        }}
                        onMarkAsLost={(lead) => {
                          setSelectedLead(lead);
                          onLostOpen();
                        }}
                        onLogCall={(lead) => {
                          setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                          onCallDialerOpen();
                        }}
                      />
                    </Td>
                  </Tr>
                  );
                })
              ) : (
                <Tr>
                  <Td colSpan={11} textAlign="center" py={8}>
                    <Text color="gray.500">
                      {searchQuery ? 'No leads match your search' : 'No leads found'}
                    </Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          </Box>

          {/* Pagination info */}
          {filteredLeads.length > 0 && (
            <Box p={4} borderTopWidth="1px">
              <Text fontSize="sm" color="gray.600">
                Showing {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
              </Text>
            </Box>
          )}
        </Box>
      ) : (
        /* Tiles View */
        <Box sx={{
          opacity: 1,
          transition: 'opacity 0.3s ease-in-out',
        }}>
          {filteredLeads && filteredLeads.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {categorizedLeads.overdue.map(({ lead, followUp }) => {
                  const dueDate = followUp?.scheduledAt;
                  const timeDiff = dueDate ? formatTimeDifference(dueDate) : '';
                  
                  return (
                    <Box
                      key={lead.id}
                      bg="white"
                      borderRadius="lg"
                      boxShadow="sm"
                      p={{ base: 3, md: 4 }}
                      borderLeft="4px"
                      borderColor="red.500"
                      _hover={{ boxShadow: 'md' }}
                      transition="all 0.2s"
                    >
                      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} flexWrap="wrap" gap={3} direction={{ base: 'column', sm: 'row' }}>
                        <Box flex="1" minW={{ base: 'full', sm: '200px' }}>
                          <Text
                            fontWeight="bold"
                            fontSize="lg"
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                          >
                            {lead.name}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {lead.phone} • {lead.email || 'No email'}
                          </Text>
                          <LeadAge createdAt={lead.createdAt} />
                          {followUp && (
                            <HStack mt={2} spacing={2} flexWrap="wrap">
                              <Badge colorScheme="red" fontSize={{ base: 'xs', md: 'sm' }}>
                                Overdue by {timeDiff}
                              </Badge>
                              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
                                Due: {dueDate ? formatDate(dueDate) : 'N/A'}
                              </Text>
                            </HStack>
                          )}
                          {followUp?.notes && (
                            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mt={2} noOfLines={2}>
                               {followUp.notes}
                            </Text>
                          )}
                        </Box>

                        <HStack spacing={2} flexWrap="wrap" width={{ base: 'full', sm: 'auto' }} justify={{ base: 'flex-end', sm: 'flex-start' }}>
                          <Button
                            size={{ base: 'xs', sm: 'sm' }}
                            leftIcon={<HiPhone />}
                            colorScheme="green"
                            onClick={() => {
                              setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                              onCallDialerOpen();
                            }}
                          >
                            <Text display={{ base: 'none', md: 'inline' }}>Call Now</Text>
                            <Text display={{ base: 'inline', md: 'none' }}>Call</Text>
                          </Button>
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
              </VStack>
            ) : (
              <Box bg="white" p={6} borderRadius="lg" textAlign="center">
                <Text color="gray.500">No overdue follow-ups 🎉</Text>
              </Box>
            )}
          </Box>

          <Divider />

          {/* New Leads */}
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
                {categorizedLeads.new.length}
              </Badge>
            </Flex>
            
            {categorizedLeads.new.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {categorizedLeads.new.map(({ lead }) => (
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
                    <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} flexWrap="wrap" gap={3} direction={{ base: 'column', sm: 'row' }}>
                      <Box flex="1" minW={{ base: 'full', sm: '200px' }}>
                        <Text
                          fontWeight="bold"
                          fontSize={{ base: 'md', md: 'lg' }}
                          color="blue.600"
                          cursor="pointer"
                          onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                          _hover={{ textDecoration: 'underline' }}
                          noOfLines={1}
                        >
                          {lead.name}
                        </Text>
                        <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" noOfLines={1}>
                          {lead.phone} • {lead.email || 'No email'}
                        </Text>
                        <LeadAge createdAt={lead.createdAt} />
                        <HStack mt={2} spacing={2} flexWrap="wrap">
                          <Badge colorScheme="blue" fontSize={{ base: 'xs', md: 'sm' }}>New</Badge>
                          <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
                            Created: {formatDate(lead.createdAt)}
                          </Text>
                          <Badge colorScheme="purple" fontSize={{ base: 'xs', md: 'sm' }}>{lead.source}</Badge>
                        </HStack>
                      </Box>

                      <HStack spacing={2} flexWrap="wrap" width={{ base: 'full', sm: 'auto' }} justify={{ base: 'flex-end', sm: 'flex-start' }}>
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
                ))}
              </VStack>
            ) : (
              <Box bg="white" p={6} borderRadius="lg" textAlign="center">
                <Text color="gray.500">No new leads at the moment</Text>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Future Follow-ups */}
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
              <VStack spacing={3} align="stretch">
                {categorizedLeads.future.map(({ lead, followUp }) => {
                  const dueDate = followUp?.scheduledAt;
                  const timeDiff = dueDate ? formatTimeDifference(dueDate) : '';
                  
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
                      <Flex justify="space-between" align={{ base: 'flex-start', md: 'center' }} flexWrap="wrap" gap={3} direction={{ base: 'column', sm: 'row' }}>
                        <Box flex="1" minW={{ base: 'full', sm: '200px' }}>
                          <Text
                            fontWeight="bold"
                            fontSize={{ base: 'md', md: 'lg' }}
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                            noOfLines={1}
                          >
                            {lead.name}
                          </Text>
                          <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" noOfLines={1}>
                            {lead.phone} • {lead.email || 'No email'}
                          </Text>
                          <LeadAge createdAt={lead.createdAt} />
                          {followUp && (
                            <HStack mt={2} spacing={2} flexWrap="wrap">
                              <Badge colorScheme="green" fontSize={{ base: 'xs', md: 'sm' }}>
                                In {timeDiff}
                              </Badge>
                              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
                                Scheduled: {dueDate ? formatDate(dueDate) : 'N/A'}
                              </Text>
                            </HStack>
                          )}
                          {followUp?.notes && (
                            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mt={2} noOfLines={2}>
                               {followUp.notes}
                            </Text>
                          )}
                        </Box>

                        <HStack spacing={2} flexWrap="wrap" width={{ base: 'full', sm: 'auto' }} justify={{ base: 'flex-end', sm: 'flex-start' }}>
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
              </VStack>
            ) : (
              <Box bg="white" p={6} borderRadius="lg" textAlign="center">
                <Text color="gray.500">No scheduled follow-ups</Text>
              </Box>
            )}
          </Box>
        </VStack>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          <Box overflowX="auto">
          <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
            <Thead bg="gray.50">
              <Tr>
                <Th>Name</Th>
                <Th display={{ base: 'none', md: 'table-cell' }}>Email</Th>
                <Th>Phone</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Campaign</Th>
                <Th>Status</Th>
                <Th display={{ base: 'none', sm: 'table-cell' }}>Lead Age</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Assigned To</Th>
                <Th display={{ base: 'none', md: 'table-cell' }}>Call</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Next Followup</Th>
                <Th display={{ base: 'none', sm: 'table-cell' }}>Origin</Th>
                <Th display={{ base: 'none', lg: 'table-cell' }}>Last Edit</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredLeads && filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => {
                  const lastCall = getLastCallForLead(lead.id);
                  const nextFollowUp = getNextFollowUpForLead(lead.id);
                  
                  return (
                  <Tr key={lead.id} _hover={{ bg: 'gray.50' }}>
                    <Td
                      fontWeight="medium"
                      cursor="pointer"
                      color="blue.600"
                      onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                      whiteSpace="nowrap"
                      fontSize={{ base: 'xs', md: 'sm' }}
                    >
                      {lead.name}
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', md: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{lead.email || '-'}</Td>
                    <Td whiteSpace="nowrap" fontSize={{ base: 'xs', md: 'sm' }}>{lead.phone}</Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', lg: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{lead.campaign || '-'}</Td>
                    <Td>
                      <VStack spacing={1} align="flex-start">
                        <Badge colorScheme={getStatusColor(lead.status)} fontSize={{ base: 'xs', md: 'sm' }}>
                          {lead.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {lead.callAttempts > 0 && (
                          <Badge colorScheme={lead.callAttempts > 6 ? 'red' : lead.callAttempts > 3 ? 'orange' : 'blue'} fontSize={{ base: 'xs', md: 'xs' }}>
                            📞 {lead.callAttempts}
                          </Badge>
                        )}
                      </VStack>
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', sm: 'table-cell' }}>
                      <LeadAge createdAt={lead.createdAt} />
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', lg: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{lead.assignedTo?.name || 'Unassigned'}</Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', md: 'table-cell' }}>
                      {lastCall ? (
                        <Text fontSize={{ base: 'xs', md: 'sm' }}>
                          {formatDate(lastCall.createdAt)}
                          <br />
                          <Badge colorScheme={lastCall.callStatus === 'completed' ? 'green' : lastCall.callStatus === 'busy' ? 'red' : 'orange'} fontSize="xs">
                            {lastCall.callStatus === 'ring_not_response' ? 'Ring Not Response' : (lastCall.callStatus || '').charAt(0).toUpperCase() + (lastCall.callStatus || '').slice(1)}
                          </Badge>
                        </Text>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', lg: 'table-cell' }}>
                      {nextFollowUp ? (
                        <Text fontSize={{ base: 'xs', md: 'sm' }}>
                          {formatDate(nextFollowUp.scheduledAt)}
                        </Text>
                      ) : (
                        '-'
                      )}
                    </Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', sm: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{formatDate(lead.createdAt)}</Td>
                    <Td whiteSpace="nowrap" display={{ base: 'none', lg: 'table-cell' }} fontSize={{ base: 'xs', md: 'sm' }}>{formatDate(lead.updatedAt)}</Td>
                    <Td>
                      <QuickActionsMenu
                        lead={lead}
                        onAssign={(lead) => {
                          setLeadToAssign({
                            id: lead.id,
                            name: lead.name,
                            currentAssignee: filteredLeads.find(l => l.id === lead.id)?.assignedTo?.name ?? undefined
                          });
                          onAssignOpen();
                        }}
                        onConvertUnreachable={(lead) => {
                          setSelectedLead(lead);
                          onUnreachableOpen();
                        }}
                        onConvertUnqualified={(lead) => {
                          setSelectedLead(lead);
                          onUnqualifiedOpen();
                        }}
                        onMarkAsWon={(lead) => {
                          setSelectedLead(lead);
                          onWonOpen();
                        }}
                        onMarkAsLost={(lead) => {
                          setSelectedLead(lead);
                          onLostOpen();
                        }}
                        onLogCall={(lead) => {
                          setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                          onCallDialerOpen();
                        }}
                      />
                    </Td>
                  </Tr>
                  );
                })
              ) : (
                <Tr>
                  <Td colSpan={11} textAlign="center" py={8}>
                    <Text color="gray.500">
                      {searchQuery ? 'No leads match your search' : 'No leads found'}
                    </Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
          </Box>

          {/* Pagination info */}
          {filteredLeads.length > 0 && (
            <Box p={4} borderTopWidth="1px">
              <Text fontSize="sm" color="gray.600">
                Showing {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
              </Text>
            </Box>
          )}
        </Box>
      ) : viewMode === 'list' ? (
        /* List View */
        <Box>
          {filteredLeads && filteredLeads.length > 0 ? (
            <VStack spacing={3} align="stretch">
              {filteredLeads.map((lead) => {
                const lastCall = getLastCallForLead(lead.id);
                const nextFollowUp = getNextFollowUpForLead(lead.id);
                
                return (
                  <Box
                    key={lead.id}
                    bg="white"
                    borderRadius="lg"
                    boxShadow="sm"
                    p={4}
                    _hover={{ boxShadow: 'md', borderColor: 'blue.200' }}
                    transition="all 0.2s"
                    borderWidth="1px"
                    borderColor="gray.200"
                  >
                    <Flex
                      direction={{ base: 'column', md: 'row' }}
                      justify="space-between"
                      align={{ base: 'stretch', md: 'center' }}
                      gap={3}
                    >
                      {/* Left Section - Main Info */}
                      <Flex
                        flex="1"
                        direction={{ base: 'column', sm: 'row' }}
                        gap={{ base: 2, sm: 4 }}
                        align={{ base: 'stretch', sm: 'center' }}
                      >
                        <Box flex="1" minW="150px">
                          <Text
                            fontWeight="bold"
                            fontSize="lg"
                            color="blue.600"
                            cursor="pointer"
                            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                            _hover={{ textDecoration: 'underline' }}
                          >
                            {lead.name}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {lead.phone}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {lead.email || '-'}
                          </Text>
                          <LeadAge createdAt={lead.createdAt} />
                        </Box>

                        <Flex
                          direction={{ base: 'column', sm: 'row' }}
                          gap={{ base: 2, sm: 6 }}
                          flex="2"
                          flexWrap="wrap"
                        >
                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                              Status
                            </Text>
                            <Badge colorScheme={getStatusColor(lead.status)} mt={1}>
                              {lead.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </Box>

                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                              Campaign
                            </Text>
                            <Text fontSize="sm" mt={1}>
                              {lead.campaign || '-'}
                            </Text>
                          </Box>

                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                              Assigned To
                            </Text>
                            <HStack spacing={1} mt={1}>
                              <Text fontSize="sm">
                                {lead.assignedTo?.name || 'Unassigned'}
                              </Text>
                              <IconButton
                                aria-label="Edit assignment"
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
                          </Box>

                          {lastCall && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                                Last Call
                              </Text>
                              <Text fontSize="sm" mt={1}>
                                {formatDate(lastCall.createdAt)}
                              </Text>
                              <Badge
                                colorScheme={lastCall.callStatus === 'completed' ? 'green' : lastCall.callStatus === 'busy' ? 'red' : 'orange'}
                                fontSize="xs"
                              >
                                {lastCall.callStatus === 'ring_not_response' ? 'Ring Not Response' : (lastCall.callStatus || '').charAt(0).toUpperCase() + (lastCall.callStatus || '').slice(1)}
                              </Badge>
                            </Box>
                          )}

                          {nextFollowUp && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" fontWeight="semibold">
                                Next Follow-up
                              </Text>
                              <Text fontSize="sm" mt={1}>
                                {formatDate(nextFollowUp.scheduledAt)}
                              </Text>
                            </Box>
                          )}
                        </Flex>
                      </Flex>

                      {/* Right Section - Actions */}
                      <HStack spacing={2} justify={{ base: 'flex-start', md: 'flex-end' }}>
                        <Button
                          size="sm"
                          leftIcon={<HiPhone />}
                          colorScheme="green"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                            onCallDialerOpen();
                          }}
                        >
                          Call
                        </Button>
                        <QuickActionsMenu
                          lead={lead}
                          onAssign={(lead) => {
                            setLeadToAssign({
                              id: lead.id,
                              name: lead.name,
                              currentAssignee: filteredLeads.find(l => l.id === lead.id)?.assignedTo?.name ?? undefined
                            });
                            onAssignOpen();
                          }}
                          onConvertUnreachable={(lead) => {
                            setSelectedLead(lead);
                            onUnreachableOpen();
                          }}
                          onConvertUnqualified={(lead) => {
                            setSelectedLead(lead);
                            onUnqualifiedOpen();
                          }}
                          onMarkAsWon={(lead) => {
                            setSelectedLead(lead);
                            onWonOpen();
                          }}
                          onMarkAsLost={(lead) => {
                            setSelectedLead(lead);
                            onLostOpen();
                          }}
                          onLogCall={(lead) => {
                            setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                            onCallDialerOpen();
                          }}
                        />
                      </HStack>
                    </Flex>
                  </Box>
                );
              })}
            </VStack>
          ) : (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={8} textAlign="center">
              <Text color="gray.500">
                {searchQuery ? 'No leads match your search' : 'No leads found'}
              </Text>
            </Box>
          )}

          {/* Pagination info */}
          {filteredLeads.length > 0 && (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={4} mt={4}>
              <Text fontSize="sm" color="gray.600">
                Showing {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
              </Text>
            </Box>
          )}
        </Box>
      ) : (
        /* Tiles View */
        <Box>
          {filteredLeads && filteredLeads.length > 0 ? (
            <Box
              display="grid"
              gridTemplateColumns={{ base: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }}
              gap={4}
            >
              {filteredLeads.map((lead) => (
                <LeadTile
                  key={lead.id}
                  lead={lead}
                  onAssign={(lead) => {
                    setLeadToAssign({
                      id: lead.id,
                      name: lead.name,
                      currentAssignee: filteredLeads.find(l => l.id === lead.id)?.assignedTo?.name ?? undefined
                    });
                    onAssignOpen();
                  }}
                  onConvertUnreachable={(lead) => {
                    setSelectedLead(lead);
                    onUnreachableOpen();
                  }}
                  onConvertUnqualified={(lead) => {
                    setSelectedLead(lead);
                    onUnqualifiedOpen();
                  }}
                  onMarkAsWon={(lead) => {
                    setSelectedLead(lead);
                    onWonOpen();
                  }}
                  onMarkAsLost={(lead) => {
                    setSelectedLead(lead);
                    onLostOpen();
                  }}
                  onLogCall={(lead) => {
                    setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone });
                    onCallDialerOpen();
                  }}
                />
              ))}
            </Box>
          ) : (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={8} textAlign="center">
              <Text color="gray.500">
                {searchQuery ? 'No leads match your search' : 'No leads found'}
              </Text>
            </Box>
          )}

          {/* Pagination info */}
          {filteredLeads.length > 0 && (
            <Box bg="white" borderRadius="lg" boxShadow="sm" p={4} mt={4}>
              <Text fontSize="sm" color="gray.600">
                Showing {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Conversion Modals */}
      {selectedLead && (
        <>
          <ConvertToUnreachableModal
            isOpen={isUnreachableOpen}
            onClose={onUnreachableClose}
            leadId={selectedLead.id}
            leadName={selectedLead.name}
            onSuccess={handleRefreshLeads}
          />
          <ConvertToUnqualifiedModal
            isOpen={isUnqualifiedOpen}
            onClose={onUnqualifiedClose}
            leadId={selectedLead.id}
            leadName={selectedLead.name}
            onSuccess={handleRefreshLeads}
          />
          <MarkAsWonModal
            isOpen={isWonOpen}
            onClose={onWonClose}
            leadId={selectedLead.id}
            leadName={selectedLead.name}
            onSuccess={handleRefreshLeads}
          />
          <MarkAsLostModal
            isOpen={isLostOpen}
            onClose={onLostClose}
            leadId={selectedLead.id}
            leadName={selectedLead.name}
            onSuccess={handleRefreshLeads}
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
          onClose={onCallDialerClose}
          leadId={leadToCall.id}
          leadName={leadToCall.name}
          leadPhone={leadToCall.phone}
        />
      )}
        </>
      )}
    </Box>
  );
}





