'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Flex,
  Button,
  Select,
  Input,
  SimpleGrid,
  Card,
  CardBody,
  VStack,
  HStack,
  Text,
  Divider,
  Icon,
  useToast,
  useDisclosure,
  Spinner,
  Center,
  Tooltip,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  ButtonGroup,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Grid,
  GridItem,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import { 
  HiFilter, 
  HiPhone, 
  HiUserAdd, 
  HiClipboardList, 
  HiBan, 
  HiExclamation, 
  HiCheckCircle, 
  HiXCircle, 
  HiClock,
  HiDownload,
  HiRefresh,
  HiChevronUp,
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiX,
} from 'react-icons/hi';
import { formatDate } from '@/shared/lib/date-utils';
import { formatPhoneForDisplay } from '@/shared/utils/phone';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { useDSRData, useDSRCallLogs } from '@/shared/hooks/useLeadsData';
import { DashboardStatSkeleton, LeadCardSkeleton } from '@/shared/components/SkeletonLoaders';

// Custom hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom color theme
const THEME_COLORS = {
  primary: '#9c5342',
  dark: '#0b1316',
  light: '#b4a097',
  medium: '#7a5f58',
  accent: '#8c9b96',
};

// Types for API response
interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  source: string;
  campaign?: string;
  remarks?: string;
  callLogRemarks?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  activityFlags?: {
    createdToday: boolean;
    hadCallToday: boolean;
    statusChangedToday: boolean;
    isNewLead: boolean;
    isFollowup: boolean;
    isOverdue: boolean;
  };
  // Optional properties for call logs
  callStatus?: string;
  callAttempts?: number;
  duration?: number;
  nextFollowupAt?: string | null;
  leadId?: string; // Actual lead ID (differs from id when showing call logs in totalCalls mode)
}

interface AgentPerformance {
  agentId: string;
  agentName: string;
  agentEmail: string;
  date: Date;
  newLeads: number;
  followUps: number;
  totalCalls: number;
  won: number;
  lost: number;
  unreachable: number;
  unqualified: number;
  overdue: number;
}

interface Agent {
  id: string;
  name: string;
  email: string;
}

export default function DSRPage() {
  const toast = useToast();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  // Get today's date and set default to TODAY
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  // Filter state - DEFAULT TO TODAY (single date selection)
  const [selectedDate, setSelectedDate] = useState(todayString);
  const [selectedAgentId, setSelectedAgentId] = useState('all');
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch DSR data using SWR hooks
  const { stats, filteredLeads: apiLeads, agentPerformanceData, agents, 
          isLoading, isValidating, error: fetchError, refresh } = useDSRData(selectedDate, selectedAgentId);
  
  // Conditionally fetch call logs when Total Calls card is active
  const { callLogs, isLoading: callLogsLoading } = 
    useDSRCallLogs(selectedDate, selectedAgentId, activeCard === 'totalCalls');
  
  // ── Bug 5 fix: Track when filters change so we show skeletons instead of stale KPIs ──
  const [isLoadingNewFilters, setIsLoadingNewFilters] = useState(false);
  const prevFiltersRef = useRef({ date: selectedDate, agent: selectedAgentId });

  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (prev.date !== selectedDate || prev.agent !== selectedAgentId) {
      setIsLoadingNewFilters(true);
      prevFiltersRef.current = { date: selectedDate, agent: selectedAgentId };
    }
  }, [selectedDate, selectedAgentId]);

  useEffect(() => {
    if (!isValidating && isLoadingNewFilters) {
      setIsLoadingNewFilters(false);
    }
  }, [isValidating, isLoadingNewFilters]);
  // ──────────────────────────────────────────────────────────────────────────────────────
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Lead Details Modal state
  const { isOpen: isLeadModalOpen, onOpen: onLeadModalOpen, onClose: onLeadModalClose } = useDisclosure();
  const { isOpen: isRemarkModalOpen, onOpen: onRemarkModalOpen, onClose: onRemarkModalClose } = useDisclosure();
  const [selectedLeadAllRemarks, setSelectedLeadAllRemarks] = useState<Array<{id: string; remarks: string | null; createdAt: string; attemptNumber: number; callStatus: string | null}> | null>(null);
  const [selectedLeadNameForRemarks, setSelectedLeadNameForRemarks] = useState<string>('');
  const [isRemarksLoading, setIsRemarksLoading] = useState(false);
  const [selectedLeadDetails, setSelectedLeadDetails] = useState<any | null>(null);
  const [isLeadDetailsLoading, setIsLeadDetailsLoading] = useState(false);

  // Show error toast if fetch fails
  useEffect(() => {
    if (fetchError) {
      toast({
        title: 'Error',
        description: 'Failed to fetch DSR data. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    }
  }, [fetchError, toast]);

  // Handle card click - filter leads in the current page
  const handleCardClick = async (type: string) => {
    // Toggle the active card - if same card clicked, deactivate it
    if (activeCard === type) {
      setActiveCard(null);
    } else {
      setActiveCard(type);
      // Call logs will be automatically fetched by useDSRCallLogs when activeCard === 'totalCalls'
    }
    
    // Reset to first page when filter changes
    setCurrentPage(1);
    
    const cardLabels: Record<string, string> = {
      newLeads: 'New Calls',
      followUps: 'Follow-up Calls',
      totalCalls: 'Total Calls',
      overdue: 'Overdue Calls Handled',
      unqualified: 'Unqualified',
      unreachable: 'Unreachable',
      won: 'Won Deals',
      lost: 'Lost Deals',
    };
    
    const label = cardLabels[type] || type;
    
    if (activeCard === type) {
      toast({
        title: 'Filter Cleared',
        description: 'Showing all leads with activity on selected date',
        status: 'info',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    } else {
      toast({
        title: `${label} Filter Applied`,
        description: `Showing only ${label.toLowerCase()}`,
        status: 'info',
        duration: 2000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };

  // Export to CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: 'No Data',
        description: 'No data available to export.',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Export Successful',
      description: `${filename} has been exported.`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // Export agent performance
  const handleExportAgentPerformance = () => {
    const exportData = agentPerformanceData.map(agent => ({
      Date: formatDate(new Date(agent.date)),
      Agent: agent.agentName,
      'New Leads': agent.newLeads,
      'Follow-ups': agent.followUps,
      'Total Calls': agent.totalCalls,
      Won: agent.won,
      Lost: agent.lost,
      Unreachable: agent.unreachable,
      Unqualified: agent.unqualified || 0,
      Overdue: agent.overdue,
    }));
    exportToCSV(exportData, 'agent_performance');
  };
  
  // Export filtered leads
  const handleExportLeads = () => {
    const exportData = filteredLeads.map(lead => ({
      Name: lead.name,
      Phone: formatPhoneForDisplay(lead.phone),
      Email: lead.email || '',
      Status: lead.status,
      Source: lead.source,
      Campaign: lead.campaign || '',
      Remarks: (lead as any).callLogRemarks || (lead as any).remarks || '',
      'Assigned To': lead.assignedTo?.name || 'Unassigned',
      'Created Date': formatDate(new Date(lead.createdAt)),
    }));
    exportToCSV(exportData, 'filtered_leads');
  };
  
  // Export call logs
  const handleExportCallLogs = () => {
    const exportData = callLogs.map(call => ({
      Time: formatDate(new Date(call.createdAt)),
      'Lead Name': call.Lead?.name || 'Unknown',
      Phone: call.Lead?.phone || '',
      'Call Status': call.callStatus || 'N/A',
      'Attempt Number': call.attemptNumber,
      Duration: call.duration || 'N/A',
      Agent: call.User?.name || 'Unknown',
      Notes: call.notes || '',
    }));
    exportToCSV(exportData, 'call_logs');
  };
  
  // Date preset handlers
  const setDatePreset = (preset: 'today' | 'yesterday' | 'last7days' | 'last30days') => {
    const today = new Date();
    let targetDate = new Date();
    
    switch (preset) {
      case 'today':
        targetDate = today;
        break;
      case 'yesterday':
        targetDate.setDate(today.getDate() - 1);
        break;
      case 'last7days':
        targetDate.setDate(today.getDate() - 7);
        break;
      case 'last30days':
        targetDate.setDate(today.getDate() - 30);
        break;
    }
    
    setSelectedDate(targetDate.toISOString().split('T')[0]);
    setCurrentPage(1);
  };

  // Open remarks modal — fetches all call log remarks for the lead
  const handleRemarkClick = async (leadId: string, leadName: string) => {
    setSelectedLeadAllRemarks(null);
    setSelectedLeadNameForRemarks(leadName);
    setIsRemarksLoading(true);
    onRemarkModalOpen();
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const json = await res.json();
      if (json.success) {
        const remarks = (json.data.CallLog || []).map((call: any) => ({
          id: call.id,
          remarks: call.remarks || null,
          createdAt: call.createdAt,
          attemptNumber: call.attemptNumber,
          callStatus: call.callStatus || null,
        }));
        setSelectedLeadAllRemarks(remarks);
      } else {
        setSelectedLeadAllRemarks([]);
      }
    } catch {
      setSelectedLeadAllRemarks([]);
    } finally {
      setIsRemarksLoading(false);
    }
  };

  // Open lead details modal — works for both regular leads and call-log rows
  const handleLeadNameClick = async (leadId: string) => {
    if (!leadId) return;
    setSelectedLeadDetails(null);
    setIsLeadDetailsLoading(true);
    onLeadModalOpen();
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const json = await res.json();
      if (json.success) {
        setSelectedLeadDetails(json.data);
      } else {
        toast({ title: 'Error', description: 'Failed to load lead details', status: 'error', duration: 3000, isClosable: true, position: 'top-right' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load lead details', status: 'error', duration: 3000, isClosable: true, position: 'top-right' });
    } finally {
      setIsLeadDetailsLoading(false);
    }
  };

  // Reset all filters to default state
  const handleResetFilters = () => {
    // Reset to today's date
    setSelectedDate(todayString);
    // Reset agent filter to all
    setSelectedAgentId('all');
    // Clear active card filter
    setActiveCard(null);
    // Clear search query
    setSearchQuery('');
    // Reset pagination
    setCurrentPage(1);
    
    toast({
      title: 'Filters Reset',
      description: 'All filters have been reset to default values',
      status: 'success',
      duration: 2000,
      isClosable: true,
      position: 'top-right',
    });
  };

  // Filter leads for the table based on active card and search
  // This MUST match the exact KPI logic to ensure card count = table row count
  // SPECIAL CASE: For Total Calls, we show call logs instead of leads
  const filteredLeads = useMemo(() => {
    if (!apiLeads) return [];
    
    // Special handling for Total Calls - show call logs, not leads
    // Bug 1 fix: when callLogs are still loading, return empty array (show spinner)
    // instead of falling back to the wrong leads-filtered-by-hadCallToday data
    if (activeCard === 'totalCalls') {
      if (callLogsLoading || callLogs.length === 0) {
        // Still loading — return empty so the table shows a spinner, not wrong content
        return [];
      }
      // Transform call logs to look like leads for table display
      const transformedCallLogs = callLogs.map(call => ({
        id: call.id,
        leadId: call.Lead?.id || call.id, // Actual lead ID for the details modal
        name: call.Lead?.name || 'Unknown',
        phone: call.Lead?.phone || '',
        email: call.Lead?.email || '',
        status: 'call_log', // Special status to identify call logs
        source: call.Lead?.source || '',
        campaign: call.Lead?.campaign || '',
        assignedTo: call.User || { name: 'Unknown' },
        createdAt: call.createdAt,
        callAttempts: call.attemptNumber,
        callStatus: call.callStatus,
        duration: call.duration,
        activityFlags: { hadCallToday: true },
        is_existing: call.Lead?.is_existing || false,
      }));
      
      // Apply search filter if needed
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase();
        return transformedCallLogs.filter(log => 
          log.name.toLowerCase().includes(query) ||
          log.phone.includes(query) ||
          (log.email && log.email.toLowerCase().includes(query))
        );
      }
      
      console.log(`[DSR Filter] Total Calls: Showing ${transformedCallLogs.length} call logs`);
      return transformedCallLogs;
    }
    
    let filtered = [...apiLeads];

    // Apply card-based filters - EXACT match to KPI logic
    if (activeCard === 'newLeads') {
      // New Calls: CallLog.createdAt = selected_date AND Lead.callAttempts = 1
      // Show ONLY leads where first call (attemptNumber=1) was made on selected date
      filtered = filtered.filter(lead => 
        lead.activityFlags?.isNewLead === true
      );
      console.log(`[DSR Filter] New Calls: ${filtered.length} leads`);
      
    } else if (activeCard === 'followUps') {
      // Follow-Up Calls: CallLog.createdAt = selected_date AND Lead.callAttempts > 1
      // Show ONLY leads that had follow-up calls (attemptNumber > 1) on selected date
      filtered = filtered.filter(lead => 
        lead.activityFlags?.isFollowup === true
      );
      console.log(`[DSR Filter] Follow-Up Calls: ${filtered.length} leads`);
      
    } else if (activeCard === 'totalCalls') {
      // This branch is now unreachable (handled above) — kept as safety fallback
      filtered = [];
      console.log(`[DSR Filter] Total Calls: waiting for call logs`);
      
    } else if (activeCard === 'overdue') {
      // Overdue Calls Handled: CallLog.createdAt = selected_date AND FollowUp.scheduledAt < selected_date
      // Show ONLY leads with overdue calls handled on selected date
      filtered = filtered.filter(lead => 
        lead.activityFlags?.isOverdue === true
      );
      console.log(`[DSR Filter] Overdue Calls: ${filtered.length} leads`);
      
    } else if (activeCard === 'unqualified') {
      // Unqualified: Lead.status = 'unqualified' AND Lead.updatedAt = selected_date
      // Show ONLY leads with unqualified status changed on selected date
      filtered = filtered.filter(lead => 
        lead.status === 'unqualified' &&
        lead.activityFlags?.statusChangedToday === true
      );
      console.log(`[DSR Filter] Unqualified: ${filtered.length} leads`);
      
    } else if (activeCard === 'unreachable') {
      // Unreachable: Lead.status = 'unreach' AND Lead.updatedAt = selected_date
      // Show ONLY leads with unreachable status changed on selected date
      filtered = filtered.filter(lead => 
        lead.status === 'unreach' &&
        lead.activityFlags?.statusChangedToday === true
      );
      console.log(`[DSR Filter] Unreachable: ${filtered.length} leads`);
      
    } else if (activeCard === 'won') {
      // Won: Lead.status = 'won' AND Lead.updatedAt = selected_date
      // Show ONLY leads with won status changed on selected date
      filtered = filtered.filter(lead => 
        lead.status === 'won' &&
        lead.activityFlags?.statusChangedToday === true
      );
      console.log(`[DSR Filter] Won: ${filtered.length} leads`);
      
    } else if (activeCard === 'lost') {
      // Lost: Lead.status = 'lost' AND Lead.updatedAt = selected_date
      // Show ONLY leads with lost status changed on selected date
      filtered = filtered.filter(lead => 
        lead.status === 'lost' &&
        lead.activityFlags?.statusChangedToday === true
      );
      console.log(`[DSR Filter] Lost: ${filtered.length} leads`);
    } else {
      // If no card is active, show nothing
      filtered = [];
      console.log(`[DSR Filter] No filter active: Showing empty list`);
    }

    // Apply search filter using debounced value
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.name.toLowerCase().includes(query) ||
        lead.phone.includes(query) ||
        (lead.email && lead.email.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [apiLeads, activeCard, debouncedSearch, callLogs]);
  
  // Paginated leads
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLeads.slice(startIndex, endIndex);
  }, [filteredLeads, currentPage]);
  
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  
  // Sorted agent performance
  const sortedAgentPerformance = useMemo(() => {
    if (!sortColumn) return agentPerformanceData;
    
    const sorted = [...agentPerformanceData].sort((a, b) => {
      const aValue = a[sortColumn as keyof AgentPerformance];
      const bValue = b[sortColumn as keyof AgentPerformance];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
    
    return sorted;
  }, [agentPerformanceData, sortColumn, sortDirection]);
  
  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Show skeleton loaders only on true initial load
  if (isLoading && (!stats || !apiLeads || apiLeads.length === 0)) {
    return (
      <Box p={{ base: 3, sm: 4, md: 6 }} maxW="100%" overflowX="hidden">
        <Heading size={{ base: 'md', md: 'lg' }} mb={{ base: 4, md: 6 }} color={THEME_COLORS.dark}>
          Daily Sales Report (DSR)
        </Heading>
        
        {/* Skeleton for stats cards */}
        <SimpleGrid columns={{ base: 2, md: 4, lg: 8 }} spacing={{ base: 2, md: 4 }} mb={{ base: 4, md: 6 }}>
          {[...Array(8)].map((_, i) => (
            <DashboardStatSkeleton key={i} />
          ))}
        </SimpleGrid>
        
        {/* Skeleton for table */}
        <Card boxShadow="lg" borderTop="4px" borderColor={THEME_COLORS.primary}>
          <CardBody p={{ base: 3, md: 6 }}>
            {[...Array(5)].map((_, i) => (
              <LeadCardSkeleton key={i} />
            ))}
          </CardBody>
        </Card>
      </Box>
    );
  }

  return (
    <Box maxW="100%" overflowX="hidden">
      {/* Header with refresh button */}
      <Flex justify="space-between" align="center" mb={{ base: 4, md: 6 }} flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }} color={THEME_COLORS.dark}>
          Daily Sales Report (DSR)
        </Heading>
        <HStack spacing={2}>
          <Tooltip label="Reset all filters">
            <Button
              leftIcon={<HiX />}
              onClick={handleResetFilters}
              colorScheme="gray"
              variant="outline"
              size={{ base: 'sm', md: 'md' }}
            >
              Reset Filters
            </Button>
          </Tooltip>
          <Tooltip label="Refresh data">
            <IconButton
              aria-label="Refresh"
              icon={<HiRefresh />}
              onClick={refresh}
              isLoading={isValidating}
              colorScheme="gray"
              variant="outline"
              size={{ base: 'sm', md: 'md' }}
            />
          </Tooltip>
          <Menu>
            <MenuButton
              as={Button}
              leftIcon={<HiDownload />}
              colorScheme="gray"
              variant="outline"
              size={{ base: 'sm', md: 'md' }}
            >
              Export
            </MenuButton>
            <MenuList>
              <MenuItem onClick={handleExportAgentPerformance}>
                Agent Performance (CSV)
              </MenuItem>
              <MenuItem onClick={handleExportLeads}>
                Filtered Leads (CSV)
              </MenuItem>
              <MenuItem onClick={handleExportCallLogs}>
                Call Logs (CSV)
              </MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      {/* Filters Card */}
      <Card mb={{ base: 4, md: 6 }} boxShadow={{ base: 'md', md: 'lg' }} borderTop="4px" borderColor={THEME_COLORS.primary} bg="white">
        <CardBody p={{ base: 3, md: 6 }}>
          <VStack spacing={4} align="stretch">
            {/* Date Presets */}
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2} color={THEME_COLORS.medium}>
                Quick Date Selection
              </Text>
              <ButtonGroup size={{ base: 'xs', md: 'sm' }} isAttached variant="outline" flexWrap="wrap">
                <Button
                  onClick={() => setDatePreset('today')}
                  colorScheme={selectedDate === todayString ? 'blue' : 'gray'}
                  bg={selectedDate === todayString ? THEME_COLORS.primary : 'white'}
                  color={selectedDate === todayString ? 'white' : THEME_COLORS.dark}
                  _hover={{ bg: selectedDate === todayString ? THEME_COLORS.medium : 'gray.100' }}
                >
                  Today
                </Button>
                <Button
                  onClick={() => setDatePreset('yesterday')}
                  colorScheme="gray"
                >
                  Yesterday
                </Button>
                <Button
                  onClick={() => setDatePreset('last7days')}
                  colorScheme="gray"
                >
                  Last 7 Days
                </Button>
                <Button
                  onClick={() => setDatePreset('last30days')}
                  colorScheme="gray"
                >
                  Last 30 Days
                </Button>
              </ButtonGroup>
            </Box>
            
            <Divider borderColor={THEME_COLORS.light} />
            
            <Flex gap={3} flexWrap="wrap" align="stretch" direction={{ base: 'column', md: 'row' }}>
              {/* Date Picker */}
              <Box flex={{ base: '1', md: '0 0 200px' }}>
                <Text fontSize="sm" fontWeight="semibold" mb={2} color={THEME_COLORS.medium}>
                  Select Date
                </Text>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setCurrentPage(1);   // Bug 6 fix: reset pagination
                    setActiveCard(null); // Bug 7 fix: clear card filter
                  }}
                  max={todayString}
                  borderColor={THEME_COLORS.light}
                  _hover={{ borderColor: THEME_COLORS.primary }}
                  _focus={{ borderColor: THEME_COLORS.primary, boxShadow: `0 0 0 1px ${THEME_COLORS.primary}` }}
                  size={{ base: 'md', md: 'md' }}
                />
              </Box>

              {/* Agent Selector */}
              <Box flex={{ base: '1', md: '0 0 200px' }}>
                <Text fontSize="sm" fontWeight="semibold" mb={2} color={THEME_COLORS.medium}>
                  Filter by Agent
                </Text>
                <Select
                  value={selectedAgentId}
                  onChange={(e) => {
                    setSelectedAgentId(e.target.value);
                    setCurrentPage(1);   // Bug 6 fix: reset pagination
                    setActiveCard(null); // Bug 7 fix: clear card filter
                  }}
                  borderColor={THEME_COLORS.light}
                  _hover={{ borderColor: THEME_COLORS.primary }}
                  _focus={{ borderColor: THEME_COLORS.primary, boxShadow: `0 0 0 1px ${THEME_COLORS.primary}` }}
                  size={{ base: 'md', md: 'md' }}
                >
                  <option value="all">All Agents</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name || agent.email}
                    </option>
                  ))}
                </Select>
              </Box>

              {/* Search Input */}
              <Box flex={{ base: '1', md: '1 1 300px' }}>
                <Text fontSize="sm" fontWeight="semibold" mb={2} color={THEME_COLORS.medium}>
                  Search Leads
                </Text>
                <Input
                  placeholder="Search name, phone or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size={{ base: 'md', md: 'md' }}
                  borderColor={THEME_COLORS.light}
                  _hover={{ borderColor: THEME_COLORS.primary }}
                  _focus={{ borderColor: THEME_COLORS.primary, boxShadow: `0 0 0 1px ${THEME_COLORS.primary}` }}
                />
              </Box>
            </Flex>

            {/* Active Filters Info */}
            <Box>
              <Divider my={2} borderColor={THEME_COLORS.light} />
              <Text fontSize={{ base: 'xs', md: 'sm' }} color={THEME_COLORS.medium}>
                Showing results for <strong>{selectedDate ? formatDate(new Date(selectedDate || new Date().toISOString())) : 'Today'}</strong>
                {selectedAgentId !== 'all' && agents.find(a => a.id === selectedAgentId) && (
                  <> • Agent: <strong>{agents.find(a => a.id === selectedAgentId)?.name}</strong></>
                )}
                {searchQuery && (
                  <> • Search: <strong>"{searchQuery}"</strong></>
                )}
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Background Update Indicator */}
      {isValidating && stats && (
        <Flex
          align="center"
          justify="center"
          mb={4}
          p={2}
          bg="blue.50"
          borderRadius="md"
          borderLeft="4px solid"
          borderColor="blue.400"
        >
          <Spinner size="sm" color="blue.400" mr={2} />
          <Text fontSize="sm" color="blue.700" fontWeight="medium">
            Updating data...
          </Text>
        </Flex>
      )}

      {/* KPI Cards - All metrics for selected date */}
      {/* Bug 5 fix: show skeletons when filters just changed so stale data from previous date is hidden */}
      {isLoadingNewFilters ? (
        <SimpleGrid columns={{ base: 2, sm: 2, md: 4 }} spacing={{ base: 2, md: 4 }} mb={{ base: 4, md: 6 }}>
          {[...Array(8)].map((_, i) => (
            <DashboardStatSkeleton key={i} />
          ))}
        </SimpleGrid>
      ) : stats && (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={{ base: 4, md: 4 }} mb={{ base: 4, md: 6 }}>
          {/* New Calls Card */}
          <Tooltip label={`${stats.newCallsCount} new calls (attemptNumber = 1) made on ${selectedDate ? formatDate(new Date(selectedDate || new Date().toISOString())) : 'Today'}`} placement="top">
            <Box>
              <Card
                cursor="pointer"
                onClick={() => handleCardClick('newLeads')}
                boxShadow={activeCard === 'newLeads' ? 'xl' : 'md'}
                _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                borderTop="4px"
                borderColor={THEME_COLORS.primary}
                bg={activeCard === 'newLeads' ? `${THEME_COLORS.primary}10` : 'white'}
              >
                <CardBody>
                  <HStack justify="space-between" mb={2}>
                    <Icon as={HiUserAdd} boxSize={6} color={THEME_COLORS.primary} />
                    <Badge colorScheme={activeCard === 'newLeads' ? 'green' : 'gray'} fontSize="xs">
                      {activeCard === 'newLeads' ? 'Active' : 'Click to filter'}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold" color={THEME_COLORS.medium} mb={2}>
                    New Calls
                  </Text>
                  <Heading size="lg" color={THEME_COLORS.dark}>
                    {stats.newCallsCount}
                  </Heading>
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    First calls (Calls Page)
                  </Text>
                </CardBody>
              </Card>
            </Box>
          </Tooltip>

          {/* Follow-up Calls Card */}
          <Tooltip label={`${stats.followupCallsCount} follow-up calls (attemptNumber > 1 AND NOT overdue) made on ${selectedDate ? formatDate(new Date(selectedDate || new Date().toISOString())) : 'Today'}`} placement="top">
            <Box>
              <Card
                cursor="pointer"
                onClick={() => handleCardClick('followUps')}
                boxShadow={activeCard === 'followUps' ? 'xl' : 'md'}
                _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                borderTop="4px"
                borderColor={THEME_COLORS.medium}
                bg={activeCard === 'followUps' ? `${THEME_COLORS.medium}10` : 'white'}
              >
                <CardBody>
                  <HStack justify="space-between" mb={2}>
                    <Icon as={HiClipboardList} boxSize={6} color={THEME_COLORS.medium} />
                    <Badge colorScheme={activeCard === 'followUps' ? 'blue' : 'gray'} fontSize="xs">
                      {activeCard === 'followUps' ? 'Active' : 'Click to filter'}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold" color={THEME_COLORS.medium} mb={2}>
                    Follow-up Calls
                  </Text>
                  <Heading size="lg" color={THEME_COLORS.dark}>
                    {stats.followupCallsCount}
                  </Heading>
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    Follow-up calls (Calls Page)
                  </Text>
                </CardBody>
              </Card>
            </Box>
          </Tooltip>

          {/* Total Calls Card */}
          <Tooltip label={`${stats.totalCalls} total calls made on ${selectedDate ? formatDate(new Date(selectedDate || new Date().toISOString())) : 'Today'}`} placement="top">
            <Box>
              <Card
                cursor="pointer"
                onClick={() => handleCardClick('totalCalls')}
                boxShadow={activeCard === 'totalCalls' ? 'xl' : 'md'}
                _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                borderTop="4px"
                borderColor={THEME_COLORS.accent}
                bg={activeCard === 'totalCalls' ? `${THEME_COLORS.accent}10` : 'white'}
              >
                <CardBody>
                  <HStack justify="space-between" mb={2}>
                    <Icon as={HiPhone} boxSize={6} color={THEME_COLORS.accent} />
                    <Badge colorScheme={activeCard === 'totalCalls' ? 'teal' : 'gray'} fontSize="xs">
                      {activeCard === 'totalCalls' ? 'Active' : 'Click to filter'}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold" color={THEME_COLORS.medium} mb={2}>
                    Total Calls
                  </Text>
                  <Heading size="lg" color={THEME_COLORS.dark}>
                    {stats.totalCalls}
                  </Heading>
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    All calls (Calls Page)
                  </Text>
                </CardBody>
              </Card>
            </Box>
          </Tooltip>

          {/* Overdue Calls Handled Card */}
          <Tooltip label={`${stats.overdueCallsHandled} overdue calls handled on ${selectedDate ? formatDate(new Date(selectedDate || new Date().toISOString())) : 'Today'}`} placement="top">
            <Box>
              <Card
                cursor="pointer"
                onClick={() => handleCardClick('overdue')}
                boxShadow={activeCard === 'overdue' ? 'xl' : 'md'}
                _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                borderTop="4px"
                borderColor="red.500"
                bg={activeCard === 'overdue' ? 'red.50' : 'white'}
              >
                <CardBody>
                  <HStack justify="space-between" mb={2}>
                    <Icon as={HiClock} boxSize={6} color="red.500" />
                    <Badge colorScheme="red" fontSize="xs">
                      {activeCard === 'overdue' ? 'Active' : 'Click to filter'}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold" color={THEME_COLORS.medium} mb={2}>
                    Overdue Calls Handled
                  </Text>
                  <Heading size="lg" color="red.600">
                    {stats.overdueCallsHandled}
                  </Heading>
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    Overdue handled (Calls Page)
                  </Text>
                </CardBody>
              </Card>
            </Box>
          </Tooltip>

          {/* Unqualified Card */}
          <Tooltip label={`${stats.unqualified} leads marked unqualified`} placement="top">
            <Box>
              <Card
                cursor="pointer"
                onClick={() => handleCardClick('unqualified')}
                boxShadow={activeCard === 'unqualified' ? 'xl' : 'md'}
                _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                borderTop="4px"
                borderColor="orange.500"
                bg={activeCard === 'unqualified' ? 'orange.50' : 'white'}
              >
                <CardBody>
                  <HStack justify="space-between" mb={2}>
                    <Icon as={HiBan} boxSize={6} color="orange.500" />
                    <Badge colorScheme="orange" fontSize="xs">
                      {activeCard === 'unqualified' ? 'Active' : 'Click to filter'}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold" color={THEME_COLORS.medium} mb={2}>
                    Unqualified
                  </Text>
                  <Heading size="lg" color={THEME_COLORS.dark}>
                    {stats.unqualified}
                  </Heading>
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    Marked (Leads Outcome)
                  </Text>
                </CardBody>
              </Card>
            </Box>
          </Tooltip>

          {/* Unreachable Card */}
          <Tooltip label={`${stats.unreachable} leads marked unreachable`} placement="top">
            <Box>
              <Card
                cursor="pointer"
                onClick={() => handleCardClick('unreachable')}
                boxShadow={activeCard === 'unreachable' ? 'xl' : 'md'}
                _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                borderTop="4px"
                borderColor="gray.500"
                bg={activeCard === 'unreachable' ? 'gray.50' : 'white'}
              >
                <CardBody>
                  <HStack justify="space-between" mb={2}>
                    <Icon as={HiExclamation} boxSize={6} color="gray.500" />
                    <Badge colorScheme="gray" fontSize="xs">
                      {activeCard === 'unreachable' ? 'Active' : 'Click to filter'}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold" color={THEME_COLORS.medium} mb={2}>
                    Unreachable
                  </Text>
                  <Heading size="lg" color={THEME_COLORS.dark}>
                    {stats.unreachable}
                  </Heading>
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    Marked (Leads Outcome)
                  </Text>
                </CardBody>
              </Card>
            </Box>
          </Tooltip>

          {/* Won Card */}
          <Tooltip label={`${stats.won} leads marked won`} placement="top">
            <Box>
              <Card
                cursor="pointer"
                onClick={() => handleCardClick('won')}
                boxShadow={activeCard === 'won' ? 'xl' : 'md'}
                _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                borderTop="4px"
                borderColor="green.500"
                bg={activeCard === 'won' ? 'green.50' : 'white'}
              >
                <CardBody>
                  <HStack justify="space-between" mb={2}>
                    <Icon as={HiCheckCircle} boxSize={6} color="green.500" />
                    <Badge colorScheme="green" fontSize="xs">
                      {activeCard === 'won' ? 'Active' : 'Click to filter'}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold" color={THEME_COLORS.medium} mb={2}>
                    Won
                  </Text>
                  <Heading size="lg" color="green.600">
                    {stats.won}
                  </Heading>
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    Closed (Leads Outcome)
                  </Text>
                </CardBody>
              </Card>
            </Box>
          </Tooltip>

          {/* Lost Card */}
          <Tooltip label={`${stats.lost} leads marked lost`} placement="top">
            <Box>
              <Card
                cursor="pointer"
                onClick={() => handleCardClick('lost')}
                boxShadow={activeCard === 'lost' ? 'xl' : 'md'}
                _hover={{ boxShadow: 'xl', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                borderTop="4px"
                borderColor="red.500"
                bg={activeCard === 'lost' ? 'red.50' : 'white'}
              >
                <CardBody>
                  <HStack justify="space-between" mb={2}>
                    <Icon as={HiXCircle} boxSize={6} color="red.500" />
                    <Badge colorScheme="red" fontSize="xs">
                      {activeCard === 'lost' ? 'Active' : 'Click to filter'}
                    </Badge>
                  </HStack>
                  <Text fontSize="sm" fontWeight="semibold" color={THEME_COLORS.medium} mb={2}>
                    Lost
                  </Text>
                  <Heading size="lg" color={THEME_COLORS.dark}>
                    {stats.lost}
                  </Heading>
                  <Text fontSize="xs" color="gray.600" mt={2}>
                    Lost (Leads Outcome)
                  </Text>
                </CardBody>
              </Card>
            </Box>
          </Tooltip>
        </SimpleGrid>
      )}

      {/* Filtered Leads Table */}
      <Card boxShadow="lg" borderTop="4px" borderColor={THEME_COLORS.primary} mb={{ base: 4, md: 6 }}>
        <CardBody p={0}>
          <Box p={{ base: 3, md: 4 }} bg={THEME_COLORS.light} bgGradient={`linear(to-r, ${THEME_COLORS.light}, ${THEME_COLORS.accent})`} borderTopRadius="lg">
            <Flex justify="space-between" align="center" direction={{ base: 'column', sm: 'row' }} gap={2}>
              <Heading size={{ base: 'sm', md: 'md' }} color="white" textAlign={{ base: 'center', sm: 'left' }}>
                {activeCard ? (
                  activeCard === 'newLeads' ? 'New Calls' :
                  activeCard === 'followUps' ? 'Follow-up Calls' :
                  activeCard === 'totalCalls' ? 'Total Calls' :
                  activeCard === 'overdue' ? 'Overdue Calls Handled' :
                  activeCard === 'unqualified' ? 'Unqualified Leads' :
                  activeCard === 'unreachable' ? 'Unreachable Leads' :
                  activeCard === 'won' ? 'Won Deals' :
                  activeCard === 'lost' ? 'Lost Deals' :
                  'Filtered Leads'
                ) : 'All Filtered Leads'}
              </Heading>
              <Badge 
                bg="white" 
                color={THEME_COLORS.primary}
                fontSize={{ base: 'sm', md: 'md' }}
                px={3}
                py={1}
              >
                {filteredLeads.length} {activeCard === 'totalCalls' ? 'call' : 'lead'}{filteredLeads.length !== 1 ? 's' : ''} (Page {currentPage} of {totalPages || 1})
              </Badge>
            </Flex>
            {activeCard && (
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="white" mt={2}>
                Click the card again to clear filter and view all leads
              </Text>
            )}
          </Box>

          <Box
            overflowX="auto"
            overflowY="auto"
            maxHeight="calc(100vh - 420px)"
            minHeight="200px"
            css={{
              '&::-webkit-scrollbar': {
                height: '8px',
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: THEME_COLORS.light,
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: THEME_COLORS.medium,
              },
            }}
          >
            <Table variant="simple" size={{ base: 'sm', md: 'md' }} minW={{ base: '900px', md: 'auto' }}>
              <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
                <Tr>
                  {activeCard === 'totalCalls' && (
                    <Th color={THEME_COLORS.dark} whiteSpace="nowrap">Time</Th>
                  )}
                  <Th
                    color={THEME_COLORS.dark}
                    position="sticky"
                    left={activeCard === 'totalCalls' ? '60px' : 0}
                    zIndex={2}
                    bg="gray.50"
                    boxShadow="2px 0 4px rgba(0,0,0,0.08)"
                    whiteSpace="nowrap"
                    w={{ base: '120px', md: 'auto' }}
                    minW={{ base: '120px', md: '160px' }}
                    maxW={{ base: '120px', md: '220px' }}
                  >
                    Lead Name
                  </Th>
                  <Th color={THEME_COLORS.dark} whiteSpace="nowrap">Phone</Th>
                  <Th color={THEME_COLORS.dark} whiteSpace="nowrap">Email</Th>
                  {activeCard === 'totalCalls' ? (
                    <>
                      <Th color={THEME_COLORS.dark} whiteSpace="nowrap">Call Status</Th>
                      <Th color={THEME_COLORS.dark} isNumeric whiteSpace="nowrap">Attempt #</Th>
                      <Th color={THEME_COLORS.dark} whiteSpace="nowrap">Duration</Th>
                    </>
                  ) : (
                    <>
                      <Th color={THEME_COLORS.dark} whiteSpace="nowrap">Status</Th>
                      <Th color={THEME_COLORS.dark} whiteSpace="nowrap">Source</Th>
                      <Th color={THEME_COLORS.dark} whiteSpace="nowrap">Assigned To</Th>
                      <Th color={THEME_COLORS.dark} whiteSpace="nowrap">Created Date</Th>
                      <Th color={THEME_COLORS.dark} whiteSpace="nowrap">Campaign</Th>
                      <Th color={THEME_COLORS.dark} whiteSpace="nowrap" minW="480px">Remarks</Th>
                    </>
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead) => (
                    <Tr 
                      key={lead.id} 
                      _hover={{ bg: `${THEME_COLORS.light}20` }}
                      transition="all 0.2s"
                    >
                      {activeCard === 'totalCalls' && (
                        <Td fontSize={{ base: 'xs', md: 'sm' }} whiteSpace="nowrap">
                          {new Date(lead.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </Td>
                      )}
                      <Td
                        fontWeight="medium"
                        color={lead.is_existing ? "green.600" : THEME_COLORS.primary}
                        fontSize={{ base: 'xs', md: 'sm' }}
                        cursor="pointer"
                        _hover={{ textDecoration: 'underline', opacity: 0.8 }}
                        onClick={() => handleLeadNameClick((lead as any).leadId || lead.id)}
                        position="sticky"
                        left={activeCard === 'totalCalls' ? '60px' : 0}
                        zIndex={1}
                        bg="white"
                        boxShadow="2px 0 4px rgba(0,0,0,0.06)"
                        maxW={{ base: '120px', md: '220px' }}
                      >
                        <Text whiteSpace="normal" wordBreak="break-word" title={lead.name}>{lead.name}</Text>
                      </Td>
                      <Td fontSize={{ base: 'xs', md: 'sm' }} whiteSpace="nowrap">{formatPhoneForDisplay(lead.phone)}</Td>
                      <Td fontSize={{ base: 'xs', md: 'sm' }}>{lead.email || '-'}</Td>
                      {activeCard === 'totalCalls' ? (
                        <>
                          <Td>
                            <Badge
                              bg={
                                lead.callStatus === 'completed' || lead.callStatus === 'answer' ? 'green.500' :
                                lead.callStatus === 'no_answer' ? 'orange.500' :
                                lead.callStatus === 'busy' ? 'yellow.500' :
                                lead.callStatus === 'unreachable' ? 'red.500' :
                                THEME_COLORS.light
                              }
                              color="white"
                              fontSize={{ base: 'xs', md: 'sm' }}
                            >
                              {lead.callStatus || 'N/A'}
                            </Badge>
                          </Td>
                          <Td isNumeric>
                            <Badge bg={lead.callAttempts === 1 ? THEME_COLORS.primary : THEME_COLORS.medium} color="white">
                              {lead.callAttempts}
                            </Badge>
                          </Td>
                          <Td fontSize={{ base: 'xs', md: 'sm' }}>
                            {lead.duration ? `${lead.duration}s` : '-'}
                          </Td>
                        </>
                      ) : (
                        <>
                          <Td>
                            <Badge
                              bg={
                                lead.status === 'new' ? THEME_COLORS.primary :
                                lead.status === 'followup' ? THEME_COLORS.medium :
                                lead.status === 'qualified' ? THEME_COLORS.accent :
                                lead.status === 'won' ? THEME_COLORS.accent :
                                lead.status === 'lost' ? THEME_COLORS.dark :
                                THEME_COLORS.light
                              }
                              color="white"
                              fontSize={{ base: 'xs', md: 'sm' }}
                            >
                              {lead.status === 'unreach' ? 'UNREACHABLE' : lead.status?.toUpperCase()}
                            </Badge>
                            {lead.status === 'followup' && lead.nextFollowupAt && (
                              <Text fontSize="xs" color="gray.600" mt={1} whiteSpace="nowrap">
                                📅 {new Date(lead.nextFollowupAt).toLocaleString('en-IN', {
                                  day: '2-digit', month: 'short',
                                  hour: '2-digit', minute: '2-digit', hour12: true,
                                })}
                              </Text>
                            )}
                          </Td>
                          <Td>
                            <Badge 
                              bg={THEME_COLORS.accent}
                              color="white"
                              variant="subtle"
                              fontSize={{ base: 'xs', md: 'sm' }}
                            >
                              {lead.source}
                            </Badge>
                          </Td>
                          <Td color={THEME_COLORS.medium} fontSize={{ base: 'xs', md: 'sm' }} whiteSpace="nowrap">
                            {lead.assignedTo?.name || 'Unassigned'}
                          </Td>
                          <Td whiteSpace="nowrap" fontSize={{ base: 'xs', md: 'sm' }}>
                            {formatDate(new Date(lead.createdAt))}
                          </Td>
                          <Td fontSize={{ base: 'xs', md: 'sm' }}>
                            {lead.campaign || '-'}
                          </Td>
                          <Td
                            fontSize={{ base: 'xs', md: 'sm' }}
                            cursor={(lead as any).callLogRemarks || (lead as any).remarks ? 'pointer' : 'default'}
                            _hover={(lead as any).callLogRemarks || (lead as any).remarks ? { bg: `${THEME_COLORS.light}30`, textDecoration: 'underline' } : {}}
                            onClick={() => {
                              const text = (lead as any).callLogRemarks || (lead as any).remarks;
                              if (text) handleRemarkClick((lead as any).leadId || lead.id, lead.name);
                            }}
                            title={(lead as any).callLogRemarks || (lead as any).remarks ? 'Click to view full remarks' : ''}
                          >
                            <Text noOfLines={2} maxW="480px" fontSize={{ base: 'xs', md: 'sm' }}>
                              {(lead as any).callLogRemarks || (lead as any).remarks || '-'}
                            </Text>
                          </Td>
                        </>
                      )}
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={activeCard === 'totalCalls' ? 7 : 9} textAlign="center" py={8}>
                      {/* Bug 1 fix: show spinner while totalCalls call logs are loading */}
                      {activeCard === 'totalCalls' && callLogsLoading ? (
                        <Center py={4}>
                          <Spinner size="lg" color={THEME_COLORS.primary} mr={3} />
                          <Text color={THEME_COLORS.medium} fontSize={{ base: 'sm', md: 'md' }}>
                            Loading call logs...
                          </Text>
                        </Center>
                      ) : (
                        <Text color={THEME_COLORS.medium} fontSize={{ base: 'sm', md: 'md' }}>
                          {activeCard
                            ? `No ${activeCard === 'totalCalls' ? 'calls' : 'leads'} found for the selected filters`
                            : 'Click a card above to filter results'}
                        </Text>
                      )}
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Flex justify="center" align="center" p={4} gap={2} flexWrap="wrap">
              <IconButton
                aria-label="Previous page"
                icon={<HiChevronLeft />}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                isDisabled={currentPage === 1}
                size="sm"
              />
              <Text fontSize="sm" color={THEME_COLORS.medium}>
                Page {currentPage} of {totalPages}
              </Text>
              <IconButton
                aria-label="Next page"
                icon={<HiChevronRight />}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                isDisabled={currentPage === totalPages}
                size="sm"
              />
            </Flex>
          )}
        </CardBody>
      </Card>

      {/* Agent Performance Table */}
      <Card boxShadow="lg" borderTop="4px" borderColor={THEME_COLORS.primary}>
        <CardBody p={0}>
          <Box p={{ base: 3, md: 4 }} bg={THEME_COLORS.medium} bgGradient={`linear(to-r, ${THEME_COLORS.medium}, ${THEME_COLORS.primary})`} borderTopRadius="lg">
            <Flex justify="space-between" align="center" direction={{ base: 'column', sm: 'row' }} gap={2}>
              <Heading size={{ base: 'sm', md: 'md' }} color="white" textAlign={{ base: 'center', sm: 'left' }}>
                Agent Performance Summary
              </Heading>
              <Badge 
                bg="white" 
                color={THEME_COLORS.primary}
                fontSize={{ base: 'sm', md: 'md' }}
                px={3}
                py={1}
              >
                {agentPerformanceData.length} agent{agentPerformanceData.length !== 1 ? 's' : ''}
              </Badge>
            </Flex>
            <Text fontSize={{ base: 'xs', md: 'sm' }} color="white" mt={2}>
              Performance metrics for {selectedDate ? formatDate(new Date(selectedDate || new Date().toISOString())) : 'Today'}
            </Text>
          </Box>

          <Box
            overflowX="auto"
            overflowY="auto"
            maxHeight="400px"
            css={{
              '&::-webkit-scrollbar': {
                height: '8px',
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: THEME_COLORS.light,
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: THEME_COLORS.medium,
              },
            }}
          >
            <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
              <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
                <Tr>
                  <Th 
                    color={THEME_COLORS.dark}
                    cursor="pointer"
                    onClick={() => handleSort('agentName')}
                    _hover={{ bg: 'gray.100' }}
                    position="sticky"
                    left={0}
                    zIndex={2}
                    bg="gray.50"
                    boxShadow="2px 0 4px rgba(0,0,0,0.08)"
                  >
                    <Flex align="center" gap={1}>
                      Agent Name
                      {sortColumn === 'agentName' && (
                        <Icon as={sortDirection === 'asc' ? HiChevronUp : HiChevronDown} />
                      )}
                    </Flex>
                  </Th>
                  <Th 
                    color={THEME_COLORS.dark} 
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort('newLeads')}
                    _hover={{ bg: 'gray.100' }}
                  >
                    <Flex align="center" gap={1} justify="flex-end">
                      New Leads
                      {sortColumn === 'newLeads' && (
                        <Icon as={sortDirection === 'asc' ? HiChevronUp : HiChevronDown} />
                      )}
                    </Flex>
                  </Th>
                  <Th 
                    color={THEME_COLORS.dark} 
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort('followUps')}
                    _hover={{ bg: 'gray.100' }}
                  >
                    <Flex align="center" gap={1} justify="flex-end">
                      Follow-ups
                      {sortColumn === 'followUps' && (
                        <Icon as={sortDirection === 'asc' ? HiChevronUp : HiChevronDown} />
                      )}
                    </Flex>
                  </Th>
                  <Th 
                    color={THEME_COLORS.dark} 
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort('totalCalls')}
                    _hover={{ bg: 'gray.100' }}
                  >
                    <Flex align="center" gap={1} justify="flex-end">
                      Total Calls
                      {sortColumn === 'totalCalls' && (
                        <Icon as={sortDirection === 'asc' ? HiChevronUp : HiChevronDown} />
                      )}
                    </Flex>
                  </Th>
                  <Th 
                    color={THEME_COLORS.dark} 
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort('won')}
                    _hover={{ bg: 'gray.100' }}
                  >
                    <Flex align="center" gap={1} justify="flex-end">
                      Won
                      {sortColumn === 'won' && (
                        <Icon as={sortDirection === 'asc' ? HiChevronUp : HiChevronDown} />
                      )}
                    </Flex>
                  </Th>
                  <Th 
                    color={THEME_COLORS.dark} 
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort('lost')}
                    _hover={{ bg: 'gray.100' }}
                  >
                    <Flex align="center" gap={1} justify="flex-end">
                      Lost
                      {sortColumn === 'lost' && (
                        <Icon as={sortDirection === 'asc' ? HiChevronUp : HiChevronDown} />
                      )}
                    </Flex>
                  </Th>
                  <Th 
                    color={THEME_COLORS.dark} 
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort('unreachable')}
                    _hover={{ bg: 'gray.100' }}
                  >
                    <Flex align="center" gap={1} justify="flex-end">
                      Unreachable
                      {sortColumn === 'unreachable' && (
                        <Icon as={sortDirection === 'asc' ? HiChevronUp : HiChevronDown} />
                      )}
                    </Flex>
                  </Th>
                  <Th 
                    color={THEME_COLORS.dark} 
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort('unqualified')}
                    _hover={{ bg: 'gray.100' }}
                  >
                    <Flex align="center" gap={1} justify="flex-end">
                      Unqualified
                      {sortColumn === 'unqualified' && (
                        <Icon as={sortDirection === 'asc' ? HiChevronUp : HiChevronDown} />
                      )}
                    </Flex>
                  </Th>
                  <Th 
                    color={THEME_COLORS.dark} 
                    isNumeric
                    cursor="pointer"
                    onClick={() => handleSort('overdue')}
                    _hover={{ bg: 'gray.100' }}
                  >
                    <Flex align="center" gap={1} justify="flex-end">
                      Overdue
                      {sortColumn === 'overdue' && (
                        <Icon as={sortDirection === 'asc' ? HiChevronUp : HiChevronDown} />
                      )}
                    </Flex>
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {sortedAgentPerformance.length > 0 ? (
                  sortedAgentPerformance.map((row) => (
                    <Tr 
                      key={row.agentId} 
                      _hover={{ bg: `${THEME_COLORS.light}20` }}
                      transition="all 0.2s"
                    >
                      <Td
                        color={THEME_COLORS.primary}
                        fontWeight="semibold"
                        fontSize={{ base: 'xs', md: 'sm' }}
                        position="sticky"
                        left={0}
                        zIndex={1}
                        bg="white"
                        boxShadow="2px 0 4px rgba(0,0,0,0.06)"
                        whiteSpace="nowrap"
                      >
                        {row.agentName}
                      </Td>
                      <Td isNumeric fontSize={{ base: 'xs', md: 'sm' }}>
                        <Badge bg={THEME_COLORS.primary} color="white">
                          {row.newLeads}
                        </Badge>
                      </Td>
                      <Td isNumeric fontSize={{ base: 'xs', md: 'sm' }}>
                        <Badge bg={THEME_COLORS.medium} color="white">
                          {row.followUps}
                        </Badge>
                      </Td>
                      <Td isNumeric fontSize={{ base: 'xs', md: 'sm' }}>
                        <Badge bg={THEME_COLORS.accent} color="white">
                          {row.totalCalls}
                        </Badge>
                      </Td>
                      <Td isNumeric fontSize={{ base: 'xs', md: 'sm' }}>
                        <Badge bg="green.500" color="white" fontWeight="bold">
                          {row.won}
                        </Badge>
                      </Td>
                      <Td isNumeric fontSize={{ base: 'xs', md: 'sm' }}>
                        <Badge bg="red.500" color="white">
                          {row.lost}
                        </Badge>
                      </Td>
                      <Td isNumeric fontSize={{ base: 'xs', md: 'sm' }}>
                        <Badge bg="gray.500" color="white">
                          {row.unreachable}
                        </Badge>
                      </Td>
                      <Td isNumeric fontSize={{ base: 'xs', md: 'sm' }}>
                        <Badge bg="orange.500" color="white">
                          {row.unqualified || 0}
                        </Badge>
                      </Td>
                      <Td isNumeric fontSize={{ base: 'xs', md: 'sm' }}>
                        <Badge bg={row.overdue > 0 ? "red.500" : "gray.300"} color="white">
                          {row.overdue}
                        </Badge>
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={9} textAlign="center" py={8}>
                      <Text color={THEME_COLORS.medium} fontSize={{ base: 'sm', md: 'md' }}>
                        No agent performance data available for the selected date
                      </Text>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      {/* Lead Details Modal — opens on lead name click or remarks click */}
      <Modal isOpen={isLeadModalOpen} onClose={onLeadModalClose} size="2xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent maxH="85vh">
          <ModalHeader borderBottom="1px" borderColor="gray.100" pb={3}>
            {isLeadDetailsLoading ? (
              <HStack spacing={3}>
                <Spinner size="sm" color={THEME_COLORS.primary} />
                <Text fontSize="md" fontWeight="semibold">Loading...</Text>
              </HStack>
            ) : selectedLeadDetails ? (
              <HStack spacing={2} flexWrap="wrap">
                <Text color={THEME_COLORS.dark} fontWeight="bold">{selectedLeadDetails.name}</Text>
                <Badge
                  bg={
                    selectedLeadDetails.status === 'won' ? 'green.500' :
                    selectedLeadDetails.status === 'lost' ? 'red.500' :
                    selectedLeadDetails.status === 'followup' ? THEME_COLORS.medium :
                    selectedLeadDetails.status === 'unreach' ? 'gray.500' :
                    selectedLeadDetails.status === 'unqualified' ? 'orange.500' :
                    THEME_COLORS.primary
                  }
                  color="white"
                  fontSize="xs"
                >
                  {selectedLeadDetails.status === 'unreach' ? 'UNREACHABLE' : selectedLeadDetails.status?.toUpperCase()}
                </Badge>
                {selectedLeadDetails.is_existing && (
                  <Badge bg="green.100" color="green.700" fontSize="xs">Existing Customer</Badge>
                )}
              </HStack>
            ) : 'Lead Details'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0}>
            {isLeadDetailsLoading ? (
              <Center py={12}><Spinner size="xl" color={THEME_COLORS.primary} /></Center>
            ) : selectedLeadDetails ? (
              <Tabs colorScheme="red" size="sm" isLazy>
                <TabList px={4} bg="gray.50" borderBottom="1px" borderColor="gray.200">
                  <Tab fontWeight="semibold" _selected={{ color: THEME_COLORS.primary, borderBottomColor: THEME_COLORS.primary }}>
                    Lead Info
                  </Tab>
                  <Tab fontWeight="semibold" _selected={{ color: THEME_COLORS.primary, borderBottomColor: THEME_COLORS.primary }}>
                    Call History ({selectedLeadDetails.CallLog?.length || 0})
                  </Tab>
                  <Tab fontWeight="semibold" _selected={{ color: THEME_COLORS.primary, borderBottomColor: THEME_COLORS.primary }}>
                    Follow-ups ({selectedLeadDetails.FollowUp?.length || 0})
                  </Tab>
                </TabList>
                <TabPanels>
                  {/* Tab 1 — Lead Info */}
                  <TabPanel p={4}>
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                      <GridItem>
                        <VStack align="start" spacing={3}>
                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={0.5}>Name</Text>
                            <Text fontWeight="medium">{selectedLeadDetails.name}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={0.5}>Phone</Text>
                            <Text>{formatPhoneForDisplay(selectedLeadDetails.phone)}</Text>
                          </Box>
                          {selectedLeadDetails.alternatePhone && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={0.5}>Alt Phone</Text>
                              <Text>{formatPhoneForDisplay(selectedLeadDetails.alternatePhone)}</Text>
                            </Box>
                          )}
                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={0.5}>Email</Text>
                            <Text>{selectedLeadDetails.email || '—'}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={0.5}>Source</Text>
                            <Badge bg={THEME_COLORS.accent} color="white">{selectedLeadDetails.source}</Badge>
                          </Box>
                          {selectedLeadDetails.campaign && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={0.5}>Campaign</Text>
                              <Text>{selectedLeadDetails.campaign}</Text>
                            </Box>
                          )}
                          {selectedLeadDetails.city && (
                            <Box>
                              <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={0.5}>City</Text>
                              <Text>{selectedLeadDetails.city}</Text>
                            </Box>
                          )}
                        </VStack>
                      </GridItem>
                      <GridItem>
                        <VStack align="start" spacing={3}>
                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={0.5}>Assigned To</Text>
                            <Text fontWeight="medium" color={THEME_COLORS.primary}>{selectedLeadDetails.assignedTo?.name || 'Unassigned'}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={0.5}>Call Attempts</Text>
                            <Badge bg={THEME_COLORS.medium} color="white">{selectedLeadDetails.callAttempts || 0}</Badge>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={0.5}>Created</Text>
                            <Text>{selectedLeadDetails.createdAt ? formatDate(new Date(selectedLeadDetails.createdAt)) : '—'}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={0.5}>Last Updated</Text>
                            <Text>{selectedLeadDetails.updatedAt ? formatDate(new Date(selectedLeadDetails.updatedAt)) : '—'}</Text>
                          </Box>
                        </VStack>
                      </GridItem>
                    </Grid>
                    {selectedLeadDetails.customerRequirement && (
                      <>
                        <Divider my={4} />
                        {selectedLeadDetails.customerRequirement && (
                          <Box>
                            <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase" mb={1}>Customer Requirement</Text>
                            <Box bg="blue.50" p={3} borderRadius="md" borderLeft="3px solid" borderColor="blue.400">
                              <Text fontSize="sm">{selectedLeadDetails.customerRequirement}</Text>
                            </Box>
                          </Box>
                        )}
                      </>
                    )}
                  </TabPanel>

                  {/* Tab 2 — Call History */}
                  <TabPanel p={4}>
                    {selectedLeadDetails.CallLog?.length > 0 ? (
                      <VStack spacing={3} align="stretch">
                        {selectedLeadDetails.CallLog.map((call: any, idx: number) => (
                          <Box
                            key={call.id}
                            p={3}
                            border="1px"
                            borderColor="gray.200"
                            borderRadius="md"
                            bg={idx === 0 ? `${THEME_COLORS.light}15` : 'white'}
                          >
                            <Flex justify="space-between" align="flex-start" mb={2} flexWrap="wrap" gap={2}>
                              <HStack spacing={2} flexWrap="wrap">
                                <Badge
                                  bg={
                                    call.callStatus === 'completed' || call.callStatus === 'answer' ? 'green.500' :
                                    call.callStatus === 'no_answer' ? 'orange.500' :
                                    call.callStatus === 'busy' ? 'yellow.600' :
                                    call.callStatus === 'unreachable' ? 'red.500' :
                                    'gray.400'
                                  }
                                  color="white"
                                  fontSize="xs"
                                >
                                  {call.callStatus || 'N/A'}
                                </Badge>
                                <Badge bg={THEME_COLORS.medium} color="white" fontSize="xs">
                                  Attempt #{call.attemptNumber}
                                </Badge>
                                {call.duration && (
                                  <Badge variant="outline" colorScheme="gray" fontSize="xs">
                                    {call.duration}s
                                  </Badge>
                                )}
                              </HStack>
                              <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                                {call.createdAt ? new Date(call.createdAt).toLocaleString('en-IN', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit', hour12: true,
                                }) : '—'}
                              </Text>
                            </Flex>
                            {call.remarks ? (
                              <Box bg="gray.50" p={2} borderRadius="sm" borderLeft="3px solid" borderColor={THEME_COLORS.light}>
                                <Text fontSize="sm" color={THEME_COLORS.dark}>{call.remarks}</Text>
                              </Box>
                            ) : (
                              <Text fontSize="sm" color="gray.400" fontStyle="italic">No remarks recorded</Text>
                            )}
                          </Box>
                        ))}
                      </VStack>
                    ) : (
                      <Center py={8}>
                        <Text color="gray.400">No call history available</Text>
                      </Center>
                    )}
                  </TabPanel>

                  {/* Tab 3 — Follow-ups */}
                  <TabPanel p={4}>
                    {selectedLeadDetails.FollowUp?.length > 0 ? (
                      <VStack spacing={3} align="stretch">
                        {selectedLeadDetails.FollowUp.map((fu: any) => {
                          const scheduledDate = new Date(fu.scheduledAt);
                          const isOverdue = scheduledDate < new Date() && fu.status !== 'completed';
                          return (
                            <Box
                              key={fu.id}
                              p={3}
                              border="1px"
                              borderColor={isOverdue ? 'red.200' : 'gray.200'}
                              borderRadius="md"
                              bg={fu.status === 'completed' ? 'green.50' : isOverdue ? 'red.50' : 'white'}
                            >
                              <Flex justify="space-between" align="flex-start" mb={2} flexWrap="wrap" gap={2}>
                                <Text
                                  fontSize="xs"
                                  color={isOverdue ? 'red.600' : 'gray.500'}
                                  fontWeight={isOverdue ? 'bold' : 'normal'}
                                  whiteSpace="nowrap"
                                >
                                  📅 {scheduledDate.toLocaleString('en-IN', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit', hour12: true,
                                  })}
                                  {isOverdue && ' — OVERDUE'}
                                </Text>
                              </Flex>
                              {fu.notes ? (
                                <Box bg="gray.50" p={2} borderRadius="sm" borderLeft="3px solid" borderColor={isOverdue ? 'red.300' : THEME_COLORS.light}>
                                  <Text fontSize="sm">{fu.notes}</Text>
                                </Box>
                              ) : (
                                <Text fontSize="sm" color="gray.400" fontStyle="italic">No notes</Text>
                              )}
                            </Box>
                          );
                        })}
                      </VStack>
                    ) : (
                      <Center py={8}>
                        <Text color="gray.400">No follow-ups scheduled</Text>
                      </Center>
                    )}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            ) : (
              <Center py={8}><Text color="gray.400">Failed to load lead details. Please try again.</Text></Center>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px" borderColor="gray.100" py={3}>
            <Button onClick={onLeadModalClose} size="sm" colorScheme="gray">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* All Remarks Modal */}
      <Modal isOpen={isRemarkModalOpen} onClose={onRemarkModalClose} size="xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent maxH="80vh">
          <ModalHeader borderBottom="1px" borderColor="gray.100" pb={3}>
            <Text fontSize="md" fontWeight="bold" color={THEME_COLORS.dark}>
              All Remarks — {selectedLeadNameForRemarks}
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={4}>
            {isRemarksLoading ? (
              <Center py={10}>
                <Spinner size="lg" color={THEME_COLORS.primary} mr={3} />
                <Text color={THEME_COLORS.medium}>Loading remarks...</Text>
              </Center>
            ) : selectedLeadAllRemarks && selectedLeadAllRemarks.length > 0 ? (
              <VStack spacing={3} align="stretch">
                {selectedLeadAllRemarks.map((entry, idx) => (
                  <Box
                    key={entry.id}
                    p={3}
                    border="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    bg={idx === 0 ? `${THEME_COLORS.light}15` : 'white'}
                  >
                    <Flex justify="space-between" align="flex-start" mb={2} flexWrap="wrap" gap={2}>
                      <HStack spacing={2} flexWrap="wrap">
                        <Badge
                          bg={
                            entry.callStatus === 'completed' || entry.callStatus === 'answer' ? 'green.500' :
                            entry.callStatus === 'no_answer' ? 'orange.500' :
                            entry.callStatus === 'busy' ? 'yellow.600' :
                            entry.callStatus === 'unreachable' ? 'red.500' :
                            'gray.400'
                          }
                          color="white"
                          fontSize="xs"
                        >
                          {entry.callStatus || 'N/A'}
                        </Badge>
                        <Badge bg={THEME_COLORS.medium} color="white" fontSize="xs">
                          Attempt #{entry.attemptNumber}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true,
                        }) : '—'}
                      </Text>
                    </Flex>
                    {entry.remarks ? (
                      <Box bg="gray.50" p={2} borderRadius="sm" borderLeft="3px solid" borderColor={THEME_COLORS.light}>
                        <Text fontSize="sm" whiteSpace="pre-wrap" color={THEME_COLORS.dark}>{entry.remarks}</Text>
                      </Box>
                    ) : (
                      <Text fontSize="sm" color="gray.400" fontStyle="italic">No remarks recorded</Text>
                    )}
                  </Box>
                ))}
              </VStack>
            ) : (
              <Center py={8}>
                <Text color="gray.400">No remarks found for this lead</Text>
              </Center>
            )}
          </ModalBody>
          <ModalFooter borderTop="1px" borderColor="gray.100" py={3}>
            <Button onClick={onRemarkModalClose} size="sm" colorScheme="gray">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
