'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/shared/lib/swr';
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
  Collapse,
  Checkbox,
} from '@chakra-ui/react';
import { HiEye, HiSearch, HiPhone, HiChevronDown, HiChevronUp } from 'react-icons/hi';
import { formatDate } from '@/shared/lib/date-utils';
import { formatPhoneForDisplay } from '@/shared/utils/phone';
import { useAuth } from '@/shared/lib/auth/auth-context';
import { useScrollRestoration } from '@/shared/hooks/useScrollRestoration';

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
  customerRequirement?: string;
  status: string;
  is_existing?: boolean | null;
  wonDate?: string; // For historical won leads - date when it was marked as won
  wonDates?: string[]; // For historical won leads - array of all dates when marked as won
  wonCount?: number; // For historical won leads - count of how many times marked as won
  currentStatus?: string; // For historical won leads - current status (might be different)
}

interface OutcomeSection {
  title: string;
  status: string;
  colorScheme: string;
  leads: Lead[];
}

interface LeadOutcomesTabContentProps {
  onCountChange?: (count: number) => void;
  // Global filters passed from parent
  globalSearchQuery?: string;
  globalClientTypeFilter?: string;
  globalSourceFilter?: string;
  globalOwnerFilter?: string;
  globalDateRangeFilter?: string;
  onOwnersLoad?: (owners: { id: string; name: string }[]) => void;
}

export default function LeadOutcomesTabContent({ 
  onCountChange,
  globalSearchQuery = '',
  globalClientTypeFilter = 'all',
  globalSourceFilter = 'all',
  globalOwnerFilter = 'all',
  globalDateRangeFilter = 'all',
  onOwnersLoad,
}: LeadOutcomesTabContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();
  
  // Get initial filters from URL params
  const initialDateFilter = searchParams.get('date') as 'all' | 'today' | 'week' | 'month' || 'all';
  const initialStatusFilter = searchParams.get('status') || null;
  
  // Use global filters instead of local ones
  const searchQuery = globalSearchQuery;
  const ownerFilter = globalOwnerFilter;
  const sourceFilter = globalSourceFilter;
  const clientTypeFilter = globalClientTypeFilter;
  const dateRangeFilter = globalDateRangeFilter as 'all' | 'today' | 'week' | 'month' | 'custom';
  
  // Local filter specific to Lead Outcome tab
  const [outcomeStatusFilter, setOutcomeStatusFilter] = useState<string>('all');
  
  // Custom date range is still local (for custom date picker)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dataMinDate, setDataMinDate] = useState(''); // Store min date from data
  const [dataMaxDate, setDataMaxDate] = useState(''); // Store max date from data
  const [highlightStatus, setHighlightStatus] = useState<string | null>(initialStatusFilter);
  
  // Won section view mode: 'current' or 'historical'
  const [wonViewMode, setWonViewMode] = useState<'current' | 'historical'>('current');
  const [historicalWonLeads, setHistoricalWonLeads] = useState<Lead[]>([]);
  const [loadingHistoricalWon, setLoadingHistoricalWon] = useState(false);
  
  // Ref for scrolling to Won section
  const wonSectionRef = useRef<HTMLDivElement>(null);
  
  // Only include custom dates in SWR key — avoids double-fetch when min/max dates are computed
  const customStart = dateRangeFilter === 'custom' ? startDate : '';
  const customEnd = dateRangeFilter === 'custom' ? endDate : '';

  const outcomesUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (ownerFilter !== 'all') params.append('assignedToId', ownerFilter);
    if (sourceFilter !== 'all') params.append('source', sourceFilter);
    if (dateRangeFilter !== 'all' && dateRangeFilter !== 'custom') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dateRangeFilter === 'today') {
        const t = fmt(today); params.append('startDate', t); params.append('endDate', t);
      } else if (dateRangeFilter === 'week') {
        const w = new Date(today); w.setDate(w.getDate() - 7);
        params.append('startDate', fmt(w)); params.append('endDate', fmt(today));
      } else if (dateRangeFilter === 'month') {
        const m = new Date(today); m.setDate(m.getDate() - 30);
        params.append('startDate', fmt(m)); params.append('endDate', fmt(today));
      }
    }
    if (dateRangeFilter === 'custom') {
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
    }
    params.append('limit', '2000');
    return `/api/leads/outcomes?${params.toString()}`;
  }, [ownerFilter, sourceFilter, dateRangeFilter, customStart, customEnd]);

  // SWR for outcomes — cached 30s, no refetch on focus
  const { data: outcomesRawData, isLoading, isValidating: isRefreshing } = useSWR(
    outcomesUrl,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  // SWR for users — cached 5 min (users rarely change)
  const { data: usersRawData } = useSWR('/api/users', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  });

  // Derive leads and owners from SWR data
  const leads = useMemo(() => outcomesRawData?.data || [], [outcomesRawData]);
  const owners = useMemo(() => usersRawData?.data || [], [usersRawData]);
  const loading = isLoading && (!outcomesRawData);

  // Notify parent about available owners
  useEffect(() => {
    if (usersRawData?.data && onOwnersLoad) {
      onOwnersLoad(usersRawData.data);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersRawData?.data]);

  const [dateRangeComputed, setDateRangeComputed] = useState(false);

  // Compute min/max date range from outcomes data on first load (dateRangeFilter = 'all')
  useEffect(() => {
    if (outcomesRawData?.data && outcomesRawData.data.length > 0 && !dateRangeComputed && dateRangeFilter === 'all') {
      const fetchedLeads = outcomesRawData.data as Lead[];
      const dates = fetchedLeads.map((l: Lead) => new Date(l.updatedAt).getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      minDate.setDate(minDate.getDate() - 1);
      const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const minStr = fmt(minDate);
      const maxStr = fmt(maxDate);
      setDataMinDate(minStr);
      setDataMaxDate(maxStr);
      setStartDate(minStr);
      setEndDate(maxStr);
      setDateRangeComputed(true);
    }
  }, [outcomesRawData, dateRangeComputed, dateRangeFilter]);
  const [rescheduleLeadId, setRescheduleLeadId] = useState<string | null>(null);
  const [rescheduleLeadName, setRescheduleLeadName] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('tomorrow');
  const [isRescheduling, setIsRescheduling] = useState(false);
  
  // Scroll restoration state
  const [scrollRestored, setScrollRestored] = useState(false);
  
  // Won dates modal state
  const [selectedWonDates, setSelectedWonDates] = useState<string[]>([]);
  const [selectedLeadName, setSelectedLeadName] = useState<string>('');
  
  // Collapse state for each section
  const [collapsedSections, setCollapsedSections] = useState<{[key: string]: boolean}>({
    won: false,
    lost: false,
    unqualified: false,
    unreach: false,
  });
  
  const { isOpen: isRescheduleOpen, onOpen: onRescheduleOpen, onClose: onRescheduleClose } = useDisclosure();
  const { isOpen: isWonDatesOpen, onOpen: onWonDatesOpen, onClose: onWonDatesClose } = useDisclosure();
  
  // Sorting state for each section (default: newest first)
  const [sortConfig, setSortConfig] = useState<{
    [key: string]: { field: string; direction: 'asc' | 'desc' };
  }>({
    unqualified: { field: 'updatedAt', direction: 'desc' },
    unreach: { field: 'updatedAt', direction: 'desc' },
    won: { field: 'updatedAt', direction: 'desc' },
    lost: { field: 'updatedAt', direction: 'desc' },
  });



  // Fetch historical won leads
  const fetchHistoricalWonLeads = async () => {
    try {
      setLoadingHistoricalWon(true);
      
      // Build query params (same as current filters)
      const params = new URLSearchParams();
      // Removed search - using client-side filtering
      if (ownerFilter !== 'all') params.append('assignedToId', ownerFilter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      
      // Handle date range filter
      if (dateRangeFilter !== 'all' && dateRangeFilter !== 'custom') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
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
      
      // Custom date range (when dateRangeFilter is 'custom')
      if (dateRangeFilter === 'custom' || startDate || endDate) {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/leads/outcomes/historical?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setHistoricalWonLeads(data.data || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load historical won leads',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoadingHistoricalWon(false);
    }
  };

  // Note: Search debouncing is now handled at the parent level with global filters

  // Auto-update date fields when preset date filter changes
  useEffect(() => {
    if (dateRangeFilter === 'all') {
      // Restore min/max dates from data
      if (dataMinDate && dataMaxDate) {
        setStartDate(dataMinDate);
        setEndDate(dataMaxDate);
      }
    } else if (dateRangeFilter !== 'custom') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      if (dateRangeFilter === 'today') {
        const todayStr = formatLocalDate(today);
        setStartDate(todayStr);
        setEndDate(todayStr);
      } else if (dateRangeFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setStartDate(formatLocalDate(weekAgo));
        setEndDate(formatLocalDate(today));
      } else if (dateRangeFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        setStartDate(formatLocalDate(monthAgo));
        setEndDate(formatLocalDate(today));
      }
    }
  }, [dateRangeFilter, dataMinDate, dataMaxDate]);

  // Use the hook for continuous scroll tracking
  useScrollRestoration('/dashboard/leads/outcomes', 100);

  // Restore scroll position IMMEDIATELY when component mounts
  useEffect(() => {
    const savedPosition = sessionStorage.getItem('scroll_position_/dashboard/leads/outcomes');
    const container = document.getElementById('dashboard-scroll-container');
    
    if (savedPosition && container) {
      // Restore immediately without waiting
      const targetScroll = parseInt(savedPosition, 10);
      container.scrollTop = targetScroll;
      console.log(`⚡ Immediate restore to ${targetScroll}px on outcomes`);
      setScrollRestored(true);
    } else {
      // No saved position, show content immediately
      setScrollRestored(true);
    }
  }, []);
  
  // Also restore after data loads (fallback)
  useEffect(() => {
    if (!loading && leads.length > 0) {
      const savedPosition = sessionStorage.getItem('scroll_position_/dashboard/leads/outcomes');
      if (savedPosition) {
        const container = document.getElementById('dashboard-scroll-container');
        if (container) {
          const targetScroll = parseInt(savedPosition, 10);
          // Only restore if not already at position
          if (Math.abs(container.scrollTop - targetScroll) > 50) {
            container.scrollTop = targetScroll;
            console.log(`🔄 Fallback restore to ${targetScroll}px after data load on outcomes`);
          }
        }
      }
      setScrollRestored(true);
    }
  }, [loading, leads.length]);

  // Fetch historical won leads when switching to historical view
  useEffect(() => {
    if (wonViewMode === 'historical') {
      fetchHistoricalWonLeads();
    }
  }, [wonViewMode, ownerFilter, sourceFilter, dateRangeFilter, startDate, endDate]); // Removed searchQuery

  // Auto-scroll to highlighted section on mount
  useEffect(() => {
    if (highlightStatus === 'won' && wonSectionRef.current) {
      setTimeout(() => {
        wonSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500); // Wait for data to load
    }
  }, [highlightStatus, leads]);

  // Filter and sort leads by status - memoized to ensure it updates with searchQuery
  const filterLeadsByStatus = useCallback((status: string) => {
    // Filter by status first
    let filtered = leads.filter(lead => lead.status === status);

    // Apply search filter on client-side for instant results
    if (searchQuery && searchQuery.trim()) {
      const searchLower = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(lead => 
        lead.name.toLowerCase().includes(searchLower) ||
        lead.phone.includes(searchLower) ||
        (lead.email && lead.email.toLowerCase().includes(searchLower))
      );
    }

    // Apply client type filter
    if (clientTypeFilter === 'existing') {
      filtered = filtered.filter(lead => (lead as any).is_existing === true);
    } else if (clientTypeFilter === 'non-existing') {
      filtered = filtered.filter(lead => !(lead as any).is_existing || (lead as any).is_existing === false);
    }

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
  }, [leads, searchQuery, clientTypeFilter, sortConfig]);

  const handleSort = (status: string, field: string) => {
    setSortConfig(prev => ({
      ...prev,
      [status]: {
        field,
        direction: prev[status]?.field === field && prev[status]?.direction === 'asc' ? 'desc' : 'asc',
      },
    }));
  };

  // Get sections based on status filter
  const sections: OutcomeSection[] = useMemo(() => {
    // For Won section, use historical leads if in historical view mode
    let wonLeads = wonViewMode === 'historical' ? historicalWonLeads : filterLeadsByStatus('won');
    
    // Apply search filter to historical won leads (client-side)
    if (wonViewMode === 'historical' && searchQuery && searchQuery.trim()) {
      const searchLower = searchQuery.trim().toLowerCase();
      wonLeads = wonLeads.filter(lead => 
        lead.name.toLowerCase().includes(searchLower) ||
        lead.phone.includes(searchLower) ||
        (lead.email && lead.email.toLowerCase().includes(searchLower))
      );
    }
    
    const allSections = [
      {
        title: 'Won',
        status: 'won',
        colorScheme: 'green',
        leads: wonLeads,
      },
      {
        title: 'Lost',
        status: 'lost',
        colorScheme: 'red',
        leads: filterLeadsByStatus('lost'),
      },
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
    ];

    // Filter sections based on outcomeStatusFilter
    if (outcomeStatusFilter === 'all') {
      return allSections;
    }
    return allSections.filter(section => section.status === outcomeStatusFilter);
  }, [leads, sortConfig, outcomeStatusFilter, wonViewMode, historicalWonLeads, filterLeadsByStatus, clientTypeFilter, searchQuery]);

  // Notify parent component of count changes (for tab badge)
  useEffect(() => {
    if (onCountChange) {
      const totalCount = sections.reduce((acc, section) => acc + section.leads.length, 0);
      onCountChange(totalCount);
    }
  }, [sections, onCountChange]);

  // Clear local filters
  const clearLocalFilters = () => {
    setOutcomeStatusFilter('all');
    setStartDate('');
    setEndDate('');
  };

  // Check if local filters are active
  const hasLocalFilters = outcomeStatusFilter !== 'all' || startDate !== '' || endDate !== '';
  
  // Check if any global filters are active (from props)
  const hasGlobalFiltersActive = 
    searchQuery.trim() !== '' ||
    ownerFilter !== 'all' ||
    sourceFilter !== 'all' ||
    dateRangeFilter !== 'all' ||
    clientTypeFilter !== 'all';
  
  const hasAnyFilters = hasLocalFilters || hasGlobalFiltersActive;

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
        
        // Redirect to leads page after a brief delay and force refresh
        setTimeout(() => {
          router.push('/dashboard/leads?t=' + Date.now());
          router.refresh();
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
    <Box opacity={scrollRestored ? 1 : 0} transition="opacity 0.15s ease-in">
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>Lead Outcomes</Heading>
      </Flex>

      {/* Local and Global Filters Info */}
      <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={6}>
        <VStack spacing={3} align="stretch">
          <Text fontSize="sm" color="gray.600" fontWeight="medium">
            ℹ️ Global filters (search, client type, owner, source, date range) are applied at the page level above
          </Text>
          
          <Divider />
          
          {/* Local Outcome Filter */}
          <Heading size="xs" color="gray.700">Outcome Filter (Tab-Specific)</Heading>
          <Select
            value={outcomeStatusFilter}
            onChange={(e) => setOutcomeStatusFilter(e.target.value)}
            maxW={{ base: 'full', sm: '200px' }}
            size={{ base: 'sm', md: 'md' }}
          >
            <option value="all">All Outcomes</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="unqualified">Unqualified</option>
            <option value="unreach">Unreachable</option>
          </Select>
          
          {/* Custom Date Range - Only if needed */}
          {dateRangeFilter === 'custom' && (
            <>
              <Divider />
              <Heading size="xs" color="gray.700">Custom Date Range</Heading>
              <Flex gap={3} flexWrap="wrap">
                <Box flex={{ base: '1 1 100%', sm: '0 1 auto' }}>
                  <Text fontSize="sm" mb={1}>Last Updated Start Date</Text>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    size={{ base: 'sm', md: 'md' }}
                    max={endDate || undefined}
                  />
                </Box>
                <Box flex={{ base: '1 1 100%', sm: '0 1 auto' }}>
                  <Text fontSize="sm" mb={1}>Last Updated End Date</Text>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    size={{ base: 'sm', md: 'md' }}
                    min={startDate || undefined}
                  />
                </Box>
              </Flex>
              
              {(startDate || endDate) && (
                <Button size="sm" variant="ghost" onClick={() => { setStartDate(''); setEndDate(''); }} alignSelf="flex-start">
                  Clear Custom Date Range
                </Button>
              )}
            </>
          )}
          
          {/* Clear Local Filters Button */}
          {hasLocalFilters && (
            <Button size="sm" variant="outline" colorScheme="red" onClick={clearLocalFilters} alignSelf="flex-start">
              Clear Local Filters
            </Button>
          )}

          {/* Results Count */}
          <Text fontSize="sm" fontWeight="medium" color="gray.700">
            Showing {sections.reduce((acc, section) => acc + section.leads.length, 0)} of {leads.length} leads
          </Text>
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
              justify="space-between"
              mb={4}
              p={3}
              bg={`${section.colorScheme}.50`}
              borderRadius="md"
              borderLeft="4px"
              borderColor={`${section.colorScheme}.500`}
              _hover={{ bg: `${section.colorScheme}.100` }}
              transition="all 0.2s"
            >
              <Flex align="center" gap={3} flexWrap="wrap">
                <Flex align="center">
                  <Heading size={{ base: 'sm', md: 'md' }} color={`${section.colorScheme}.700`}>
                    {section.title}
                  </Heading>
                  <Badge ml={3} colorScheme={section.colorScheme} fontSize={{ base: 'sm', md: 'md' }}>
                    {loadingHistoricalWon && section.status === 'won' && wonViewMode === 'historical' ? (
                      <Spinner size="xs" />
                    ) : (
                      section.leads.length
                    )}
                  </Badge>
                </Flex>
                
                {/* Won section dropdown to switch between current and historical view */}
                {section.status === 'won' && (
                  <Select
                    value={wonViewMode}
                    onChange={(e) => setWonViewMode(e.target.value as 'current' | 'historical')}
                    size="sm"
                    maxW="220px"
                    bg="white"
                    borderColor="green.300"
                    _hover={{ borderColor: 'green.400' }}
                  >
                    <option value="current">Current Status (Won)</option>
                    <option value="historical">Historical (Marked as Won)</option>
                  </Select>
                )}
              </Flex>
              <IconButton
                aria-label={collapsedSections[section.status] ? 'Show' : 'Hide'}
                icon={<Icon as={collapsedSections[section.status] ? HiChevronDown : HiChevronUp} />}
                size="sm"
                variant="ghost"
                colorScheme={section.colorScheme}
                onClick={() => setCollapsedSections(prev => ({
                  ...prev,
                  [section.status]: !prev[section.status]
                }))}
              />
            </Flex>

            {!collapsedSections[section.status] && (
            <Box 
              bg="white" 
              borderRadius="lg" 
              boxShadow="sm" 
              overflow="hidden"
            >
              {section.leads.length > 0 ? (
                <>
                <Text 
                  fontSize="xs" 
                  color="gray.500" 
                  px={4} 
                  py={2} 
                  display={{ base: 'block', md: 'none' }}
                  bg="gray.50"
                  borderBottom="1px"
                  borderColor="gray.200"
                >
                  ← Scroll horizontally to view all columns →
                </Text>
                <Box 
                  overflowX="auto" 
                  w="full"
                  css={{
                    '&::-webkit-scrollbar': {
                      height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: '#f1f1f1',
                      borderRadius: '10px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: '#888',
                      borderRadius: '10px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: '#555',
                    },
                  }}
                >
                <Table variant="simple" size={{ base: 'sm', md: 'md' }} minW={{ base: '900px', md: 'auto' }}>
                  <Thead bg="gray.50">
                    <Tr>
                      <Th 
                        cursor="pointer" 
                        onClick={() => handleSort(section.status, 'name')}
                        _hover={{ bg: 'gray.100 !important' }}
                        fontSize={{ base: 'xs', md: 'sm' }}
                        py={{ base: 2, md: 3 }}
                        px={{ base: 2, md: 4 }}
                        position="sticky"
                        left={0}
                        zIndex={2}
                        bg="gray.50"
                        boxShadow="2px 0 5px -1px rgba(0,0,0,0.15)"
                        minW={{ base: '140px', md: '200px' }}
                        maxW={{ base: '140px', md: '200px' }}
                        borderRight="2px solid"
                        borderRightColor="gray.200"
                      >
                        Lead Name {sortConfig[section.status]?.field === 'name' && (sortConfig[section.status]?.direction === 'asc' ? '↑' : '↓')}
                      </Th>
                      <Th 
                        cursor="pointer" 
                        onClick={() => handleSort(section.status, 'phone')}
                        _hover={{ bg: 'gray.100' }}
                        fontSize={{ base: 'xs', md: 'sm' }}
                        py={{ base: 2, md: 3 }}
                        px={{ base: 2, md: 4 }}
                      >
                        Phone {sortConfig[section.status]?.field === 'phone' && (sortConfig[section.status]?.direction === 'asc' ? '↑' : '↓')}
                      </Th>
                      <Th fontSize={{ base: 'xs', md: 'sm' }} py={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }}>Status</Th>
                      {section.status === 'won' && wonViewMode === 'historical' && (
                        <Th fontSize={{ base: 'xs', md: 'sm' }} py={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }}>Count</Th>
                      )}
                      <Th 
                        cursor="pointer" 
                        onClick={() => handleSort(section.status, 'updatedAt')}
                        _hover={{ bg: 'gray.100' }}
                        fontSize={{ base: 'xs', md: 'sm' }}
                        py={{ base: 2, md: 3 }}
                        px={{ base: 2, md: 4 }}
                      >
                        {section.status === 'won' && wonViewMode === 'historical' ? 'Marked Won On' : 'Last Updated'} {sortConfig[section.status]?.field === 'updatedAt' && (sortConfig[section.status]?.direction === 'asc' ? '↑' : '↓')}
                      </Th>
                      <Th 
                        cursor="pointer" 
                        onClick={() => handleSort(section.status, 'assignedTo')}
                        _hover={{ bg: 'gray.100' }}
                        fontSize={{ base: 'xs', md: 'sm' }}
                        py={{ base: 2, md: 3 }}
                        px={{ base: 2, md: 4 }}
                      >
                        Owner {sortConfig[section.status]?.field === 'assignedTo' && (sortConfig[section.status]?.direction === 'asc' ? '↑' : '↓')}
                      </Th>
                      <Th fontSize={{ base: 'xs', md: 'sm' }} py={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }}>Remarks</Th>
                      <Th width={{ base: '80px', md: '120px' }} fontSize={{ base: 'xs', md: 'sm' }} py={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }}>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {section.leads.map((lead: any) => {
                      const isHistoricalWon = section.status === 'won' && wonViewMode === 'historical';
                      const currentStatus = isHistoricalWon ? lead.currentStatus : lead.status;
                      const isStatusDifferent = isHistoricalWon && currentStatus !== 'won';
                      
                      return (
                        <Tr 
                          key={lead.id} 
                          _hover={{ 
                            bg: 'gray.50', 
                            cursor: 'pointer',
                            '& td:first-of-type': {
                              bg: 'gray.50'
                            }
                          }}
                          onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                        >
                          <Td 
                            fontWeight="medium" 
                            color={lead.is_existing ? "green.600" : "blue.600"}
                            fontSize={{ base: 'xs', md: 'sm' }}
                            py={{ base: 2, md: 3 }}
                            px={{ base: 2, md: 4 }}
                            position="sticky"
                            left={0}
                            zIndex={1}
                            bg="white"
                            boxShadow="2px 0 5px -1px rgba(0,0,0,0.15)"
                            minW={{ base: '140px', md: '200px' }}
                            maxW={{ base: '140px', md: '200px' }}
                            borderRight="2px solid"
                            borderRightColor="gray.200"
                          >
                            <Text
                              whiteSpace="normal"
                              wordBreak="break-word"
                              lineHeight="shorter"
                            >
                              {lead.name}
                            </Text>
                          </Td>
                          <Td fontSize={{ base: 'xs', md: 'sm' }} py={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }} whiteSpace="nowrap">{formatPhoneForDisplay(lead.phone)}</Td>
                          <Td py={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }}>
                            <VStack align="start" spacing={1}>
                              <Badge colorScheme={section.colorScheme} fontSize={{ base: '2xs', md: 'xs' }}>
                                {section.title}
                              </Badge>
                              {isStatusDifferent && (
                                <Badge colorScheme="orange" variant="outline" fontSize="2xs">
                                  Now: {currentStatus === 'followup' ? 'Follow-up' : currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                                </Badge>
                              )}
                            </VStack>
                          </Td>
                          {section.status === 'won' && wonViewMode === 'historical' && (
                            <Td onClick={(e) => e.stopPropagation()} py={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }}>
                              <Badge 
                                colorScheme="blue" 
                                fontSize={{ base: 'xs', md: 'md' }}
                                px={{ base: 2, md: 3 }}
                                py={1}
                                cursor="pointer"
                                _hover={{ bg: 'blue.600', transform: 'scale(1.05)' }}
                                transition="all 0.2s"
                                onClick={() => {
                                  setSelectedWonDates(lead.wonDates || [lead.wonDate || '']);
                                  setSelectedLeadName(lead.name);
                                  onWonDatesOpen();
                                }}
                                title="Click to view all won dates"
                              >
                                {lead.wonCount || 1}
                              </Badge>
                            </Td>
                          )}
                          <Td fontSize={{ base: 'xs', md: 'sm' }} py={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }} whiteSpace="nowrap">
                            {isHistoricalWon && lead.wonDate ? formatDate(lead.wonDate) : formatDate(lead.updatedAt)}
                          </Td>
                          <Td fontSize={{ base: 'xs', md: 'sm' }} py={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }} whiteSpace="nowrap">{lead.assignedTo?.name || 'Unassigned'}</Td>
                          <Td py={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }}>
                            <Text noOfLines={2} fontSize={{ base: 'xs', md: 'sm' }} maxW={{ base: '150px', md: '250px' }} title={lead.customerRequirement || lead.notes || '-'}>
                              {lead.customerRequirement || lead.notes || '-'}
                            </Text>
                          </Td>
                          <Td onClick={(e) => e.stopPropagation()} py={{ base: 2, md: 3 }} px={{ base: 2, md: 4 }}>
                            <HStack spacing={1}>
                              <IconButton
                                aria-label="View details"
                                icon={<HiEye />}
                                size={{ base: 'xs', md: 'sm' }}
                                variant="ghost"
                                onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                              />
                              {section.status === 'unreach' && (
                                <IconButton
                                  aria-label="Reschedule"
                                  icon={<HiPhone />}
                                  size={{ base: 'xs', md: 'sm' }}
                                  colorScheme="green"
                                  variant="ghost"
                                  onClick={() => handleReschedule(lead.id, lead.name)}
                                  title="Move to Follow-up and reschedule"
                                />
                              )}
                            </HStack>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
                </Box>
                </>
              ) : (
                <Box p={8} textAlign="center">
                  <Text color="gray.500">
                    {hasAnyFilters ? `No ${section.title.toLowerCase()} leads match your filters` : `No ${section.title.toLowerCase()} leads`}
                  </Text>
                </Box>
              )}
            </Box>
            )}
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

      {/* Won Dates History Modal */}
      <Modal isOpen={isWonDatesOpen} onClose={onWonDatesClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <VStack align="start" spacing={1}>
              <Text>Won History</Text>
              <Text fontSize="sm" fontWeight="normal" color="gray.600">
                {selectedLeadName}
              </Text>
            </VStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={3} align="stretch">
              <Text fontWeight="medium" color="gray.700">
                This lead was marked as Won {selectedWonDates.length} time{selectedWonDates.length > 1 ? 's' : ''}:
              </Text>
              {selectedWonDates.map((date, index) => (
                <Box
                  key={index}
                  p={3}
                  bg="green.50"
                  borderRadius="md"
                  borderLeft="4px"
                  borderColor="green.500"
                >
                  <HStack justify="space-between">
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="semibold" color="green.700">
                        Won #{index + 1}
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        {formatDate(date)}
                      </Text>
                    </VStack>
                    <Badge colorScheme="green" fontSize="xs">
                      {new Date(date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Badge>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onWonDatesClose} colorScheme="blue" w="full">
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
