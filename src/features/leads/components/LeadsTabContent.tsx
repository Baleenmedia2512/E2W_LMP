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
import { useLeadsAndFollowUps } from '@/shared/hooks/useLeadsData';
import { LeadCardGridSkeleton, SectionHeaderSkeleton } from '@/shared/components/SkeletonLoaders';
import DebouncedSearchInput from '@/shared/components/DebouncedSearchInput';
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
  HiChevronUp,
  HiChevronDown,
  HiRefresh,
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import AddLeadModal from '@/features/leads/components/AddLeadModal';
import AssignLeadModal from '@/features/leads/components/AssignLeadModal';
import ConvertToUnreachableModal from '@/features/leads/components/ConvertToUnreachableModal';
import ConvertToUnqualifiedModal from '@/features/leads/components/ConvertToUnqualifiedModal';
import CallDialerModal from '@/features/leads/components/CallDialerModal';
import ChangeStatusModal from '@/features/leads/components/ChangeStatusModal';
import EditCallRemarkModal from '@/features/leads/components/EditCallRemarkModal';
import ModernLeadCard from '@/features/leads/components/ModernLeadCard';
import { formatDate } from '@/shared/lib/date-utils';
import { formatDateTime } from '@/shared/lib/date-utils';
import { categorizeAndSortLeads, formatTimeDifference } from '@/shared/lib/utils/lead-categorization';
import type { CallLog, Lead } from '@/shared/types';
import { openWhatsApp, isValidWhatsAppPhone } from '@/shared/utils/whatsapp';
import { formatPhoneForDisplay } from '@/shared/utils/phone';
import { useAuth } from '@/shared/lib/auth/auth-context';
import { useScrollRestoration } from '@/shared/hooks/useScrollRestoration';



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

// Component to display call remarks with scrolling
const CallRemarksDisplay = ({ 
  callLogs, 
  onAddClick, 
  onEditClick 
}: { 
  callLogs: CallLog[];
  onAddClick?: () => void;
  onEditClick?: (callLog: CallLog) => void;
}) => {
  // Always show the box for debugging
  const remarksWithLogs = callLogs ? callLogs.filter(log => log.remarks && log.remarks.trim() !== '') : [];
  
  return (
    <Box
      w="full"
      bg="gray.50"
      borderRadius="sm"
      p={{ base: 1.5, sm: 2 }}
      border="1px solid"
      borderColor="gray.200"
    >
      <Flex justify="space-between" align="center" mb={1}>
        <Text
          fontSize="2xs"
          fontWeight="bold"
          color="gray.700"
        >
          Call Remarks ({remarksWithLogs.length})
        </Text>
        {onAddClick && (
          <IconButton
            aria-label="Add call remark"
            icon={<HiPlus />}
            size="xs"
            variant="ghost"
            colorScheme="blue"
            onClick={(e) => {
              e.stopPropagation();
              onAddClick();
            }}
          />
        )}
      </Flex>
      {remarksWithLogs.length === 0 ? (
        <Text fontSize="2xs" color="gray.500" fontStyle="italic">
          No call remarks yet
        </Text>
      ) : (
        <VStack
          align="stretch"
          spacing={1}
          maxH="60px"
          overflowY="auto"
          sx={{
            '&::-webkit-scrollbar': {
              width: '4px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'gray.100',
              borderRadius: '2px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'gray.400',
              borderRadius: '2px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'gray.500',
            },
          }}
        >
        {remarksWithLogs.slice(0, 10).map((log, index) => (
          <Box
            key={log.id}
            bg="white"
            p={1.5}
            borderRadius="sm"
            border="1px solid"
            borderColor="gray.200"
            position="relative"
          >
            {onEditClick && (
              <IconButton
                aria-label="Edit remark"
                icon={<HiPencil />}
                size="xs"
                variant="ghost"
                colorScheme="gray"
                position="absolute"
                top={1}
                right={1}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick(log);
                }}
              />
            )}
            <HStack spacing={1} mb={0.5} flexWrap="wrap" pr={6}>
              <Badge
                colorScheme={
                  log.callStatus === 'answer' || log.callStatus === 'completed'
                    ? 'green'
                    : log.callStatus === 'busy'
                    ? 'red'
                    : 'orange'
                }
                fontSize="2xs"
              >
                {log.callStatus === 'ring_not_response'
                  ? 'No Answer'
                  : log.callStatus === 'answer'
                  ? 'Answered'
                  : log.callStatus === 'completed'
                  ? 'Completed'
                  : (log.callStatus || '').charAt(0).toUpperCase() +
                    (log.callStatus || '').slice(1)}
              </Badge>
              <Text fontSize="2xs" color="gray.500">
                {formatDateTime(log.createdAt)}
              </Text>
            </HStack>
            <Text fontSize="2xs" color="gray.700">
              {log.remarks}
            </Text>
          </Box>
        ))}
        </VStack>
      )}
    </Box>
  );
};

// Lead management page with multiple view modes and categorization
interface LeadsTabContentProps {
  onCountChange?: (count: number) => void;
  // Global filters passed from parent
  globalSearchQuery?: string;
  globalClientTypeFilter?: string;
  globalSourceFilter?: string;
  globalAttemptsFilter?: string;
  globalOwnerFilter?: string;
  globalDateRangeFilter?: string;
}

function LeadsTabContent({
  onCountChange,
  globalSearchQuery = '',
  globalClientTypeFilter = 'all',
  globalSourceFilter = 'all',
  globalAttemptsFilter = 'all',
  globalOwnerFilter = 'all',
  globalDateRangeFilter = 'all',
}: LeadsTabContentProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user, token } = useAuth();
  
  // Get filter from URL if present
  const urlFilter = searchParams.get('filter');
  
  // Use global filters instead of local ones
  const searchQuery = globalSearchQuery;
  const clientTypeFilter = globalClientTypeFilter;
  const sourceFilter = globalSourceFilter;
  const attemptsFilter = globalAttemptsFilter;
  const ownerFilter = globalOwnerFilter;
  // Note: dateRangeFilter for Leads tab uses different values than global, so we need to map it
  const dateRangeFilter = globalDateRangeFilter === 'week' ? '7days' : 
                          globalDateRangeFilter === 'month' ? '30days' : 
                          globalDateRangeFilter;
  
  // Status filter is specific to Leads tab, so keep it local
  // Status filter is specific to Leads tab, so keep it local
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
  
  // Remove local source, client type, date range, and attempts filters - now using global
  // Keep only tab-specific filters
  const [assignedToMe, setAssignedToMe] = useState<boolean>(false);
  const [showOnlyToday, setShowOnlyToday] = useState<boolean>(true); // Default: show only today's leads
  const [visibleCount, setVisibleCount] = useState<number>(50); // Lazy loading: initially show 50 leads
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
    source?: string;
    campaign?: string | null;
  } | null>(null);
  const [leadToChangeStatus, setLeadToChangeStatus] = useState<{
    id: string;
    name: string;
    status: string;
  } | null>(null);
  // Fetch leads and follow-ups using SWR for optimal caching and revalidation
  const {
    leads,
    followUps,
    isLoading,
    isValidating,
    error: fetchError,
    refreshAll,
    mutateLeads,
    mutateFollowUps,
  } = useLeadsAndFollowUps({
    assignedToMe: assignedToMe && ownerFilter === 'all',
    limit: 2000,
    refreshInterval: 0, // Manual refresh only
  });

  // Optimistic update helper for lead status changes
  const optimisticUpdateLead = (leadId: string, updates: Partial<Lead>) => {
    if (!leads) return;
    
    // Find and update the lead in the array optimistically
    const updatedLeads = leads.map(lead => 
      lead.id === leadId ? { ...lead, ...updates } : lead
    );
    
    // Update SWR cache immediately (no revalidation)
    mutateLeads(updatedLeads, false);
    
    // Background refresh after 100ms
    setTimeout(() => refreshAll(), 100);
  };
  
  // Scroll restoration state - hide content until scroll is restored
  const [scrollRestored, setScrollRestored] = useState(false);
  
  // Section collapse state
  const [isOverdueCollapsed, setIsOverdueCollapsed] = useState(false);
  const [isScheduledCollapsed, setIsScheduledCollapsed] = useState(false);
  const [isNewLeadsCollapsed, setIsNewLeadsCollapsed] = useState(false);
  const [isStatusFilteredCollapsed, setIsStatusFilteredCollapsed] = useState(false);

  // Auto-refresh every minute to update overdue status
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Restore scroll position IMMEDIATELY when component mounts
  useEffect(() => {
    const savedPosition = sessionStorage.getItem('scroll_position_/dashboard/leads');
    const container = document.getElementById('dashboard-scroll-container');
    
    if (savedPosition && container) {
      // Restore immediately without waiting
      const targetScroll = parseInt(savedPosition, 10);
      container.scrollTop = targetScroll;
      console.log(`⚡ Immediate restore to ${targetScroll}px`);
      setScrollRestored(true);
    } else {
      // No saved position, show content immediately
      setScrollRestored(true);
    }
  }, []);
  
  // Also restore after data loads (fallback)
  useEffect(() => {
    if (!isLoading && leads.length > 0) {
      const savedPosition = sessionStorage.getItem('scroll_position_/dashboard/leads');
      if (savedPosition) {
        const container = document.getElementById('dashboard-scroll-container');
        if (container) {
          const targetScroll = parseInt(savedPosition, 10);
          // Only restore if not already at position
          if (Math.abs(container.scrollTop - targetScroll) > 50) {
            container.scrollTop = targetScroll;
            console.log(`🔄 Fallback restore to ${targetScroll}px after data load`);
          }
        }
      }
      setScrollRestored(true);
    }
  }, [isLoading, leads.length]);
  
  // Use the hook for continuous scroll tracking
  useScrollRestoration('/dashboard/leads', 100);
  
  // Refresh data when URL params change (e.g., after redirect with timestamp)
  useEffect(() => {
    const timestamp = searchParams.get('t');
    if (timestamp) {
      refreshAll();
    }
  }, [searchParams, refreshAll]);
  
  // Note: Removed useLeadsSync - SWR handles data synchronization automatically
  // with optimistic updates for instant UI feedback
  
  // Handler to refresh data after status changes
  const handleRefreshLeads = () => {
    refreshAll();
  };

  // Handler to reset all filters (only local filters now)
  const handleResetFilters = () => {
    // Note: Global filters are now managed by parent component
    // Only reset local tab-specific filters here
    setStatusFilter('all');
    setAssignedToMe(false);
    setShowOnlyToday(true); // Reset to default: show only today's leads
    setVisibleCount(50); // Reset lazy loading
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
  const { isOpen: isChangeStatusOpen, onOpen: onChangeStatusOpen, onClose: onChangeStatusClose } = useDisclosure();
  const { isOpen: isEditCallRemarkOpen, onOpen: onEditCallRemarkOpen, onClose: onEditCallRemarkClose } = useDisclosure();
  
  // State for edit call remark modal
  const [callRemarkToEdit, setCallRemarkToEdit] = useState<CallLog | null>(null);
  const [leadForCallRemark, setLeadForCallRemark] = useState<{ id: string; name: string } | null>(null);

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
    // Find lead and return its most recent call log
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.CallLog && lead.CallLog.length > 0) {
      const firstCall = lead.CallLog[0];
      return firstCall ? firstCall : null; // Already sorted by createdAt desc from API
    }
    return null;
  };

  // Helper to get call remarks for a lead
  const getCallRemarksForLead = (leadId: string): CallLog[] => {
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.CallLog) {
      return lead.CallLog.filter((log: CallLog) => log.remarks && log.remarks.trim() !== '');
    }
    return [];
  };

  // Callback handlers for call remarks
  const handleAddCallRemark = (leadId: string, leadName: string) => {
    setLeadForCallRemark({ id: leadId, name: leadName });
    setCallRemarkToEdit(null); // null means add mode
    onEditCallRemarkOpen();
  };

  const handleEditCallRemark = (callLog: CallLog) => {
    const lead = leads.find(l => l.id === callLog.leadId);
    if (lead) {
      setLeadForCallRemark({ id: lead.id, name: lead.name });
    }
    setCallRemarkToEdit(callLog);
    onEditCallRemarkOpen();
  };

  const handleCallRemarkSuccess = () => {
    // Background refresh only (call remark changes don't affect lead list display)
    setTimeout(() => refreshAll(), 100);
  };

  // PERFORMANCE: Create a Map for O(1) follow-up lookups instead of O(n) filtering
  const followUpsByLeadId = useMemo(() => {
    const map = new Map<string, any[]>();
    followUps.forEach((fu: any) => {
      if (!map.has(fu.leadId)) {
        map.set(fu.leadId, []);
      }
      map.get(fu.leadId)!.push(fu);
    });
    return map;
  }, [followUps]);

  const getNextFollowUpForLead = (leadId: string) => {
    // Use Map for instant lookup instead of filtering entire array
    const leadFollowUps = followUpsByLeadId.get(leadId) || [];
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
    // Define outcome statuses that should NOT appear in active leads (they belong in Lead Outcomes tab)
    const outcomeStatuses = ['won', 'lost', 'unqualified', 'unreach', 'unreachable'];
    
    // PERFORMANCE FIX: Early return if no filters applied
    const hasSearch = searchQuery.trim() !== '';
    const hasStatusFilter = statusFilter !== 'all' && statusFilter !== 'overdue' && statusFilter !== 'scheduled' && statusFilter !== 'today';
    const hasSourceFilter = sourceFilter !== 'all';
    const hasClientTypeFilter = clientTypeFilter !== 'all';
    const hasOwnerFilter = ownerFilter !== 'all';
    const hasDateFilter = dateRangeFilter !== 'all';
    const hasAttemptsFilter = attemptsFilter !== 'all';
    
    // Always exclude outcome statuses from active leads UNLESS specifically filtering for them
    const shouldExcludeOutcomes = !hasStatusFilter || !outcomeStatuses.includes(statusFilter);
    
    if (!hasSearch && !hasStatusFilter && !hasSourceFilter && !hasClientTypeFilter && !hasOwnerFilter && !hasDateFilter && !hasAttemptsFilter) {
      // Even with no filters, exclude outcome statuses from active leads
      return leads.filter(lead => !outcomeStatuses.includes(lead.status));
    }
    
    // Optimize: Pre-process search query and dates once (outside the filter loop)
    const searchLower = hasSearch ? searchQuery.trim().toLowerCase() : '';
    const now = new Date();
    const today = hasDateFilter ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : null;
    const weekAgo = hasDateFilter && dateRangeFilter === '7days' ? new Date(today!.getTime() - 7 * 24 * 60 * 60 * 1000) : null;
    const monthAgo = hasDateFilter && dateRangeFilter === '30days' ? new Date(today!.getTime() - 30 * 24 * 60 * 60 * 1000) : null;
    
    // Single-pass filter for maximum performance
    return leads.filter((lead) => {
      // FIRST: Exclude outcome statuses from active leads (unless specifically filtering for them)
      if (shouldExcludeOutcomes && outcomeStatuses.includes(lead.status)) {
        return false;
      }
      
      // Search filter - fastest checks first
      if (hasSearch) {
        // Check if lead matches search query
        const matchesSearch = 
          lead.phone.includes(searchLower) || 
          lead.name.toLowerCase().includes(searchLower) || 
          (lead.email && lead.email.toLowerCase().includes(searchLower));
        
        // If search doesn't match, exclude this lead
        if (!matchesSearch) return false;
      }

      // Status filter
      if (hasStatusFilter && lead.status !== statusFilter) return false;
      
      // Source filter (case-insensitive)
      if (hasSourceFilter && lead.source?.toLowerCase() !== sourceFilter.toLowerCase()) return false;
      
      // Client type filter
      if (hasClientTypeFilter) {
        if (clientTypeFilter === 'existing' && lead.is_existing !== true) return false;
        if (clientTypeFilter === 'non-existing' && lead.is_existing === true) return false;
      }

      // Owner filter
      if (hasOwnerFilter) {
        if (!lead.assignedTo || lead.assignedTo.id !== ownerFilter) return false;
      }

      // Date range filter - optimized with pre-calculated dates
      if (hasDateFilter && today) {
        const leadDate = new Date(lead.createdAt);
        const leadDay = new Date(leadDate.getFullYear(), leadDate.getMonth(), leadDate.getDate());
        
        if (dateRangeFilter === 'today') {
          if (leadDay.getTime() !== today.getTime()) return false;
        } else if (dateRangeFilter === '7days' && weekAgo) {
          if (leadDay < weekAgo) return false;
        } else if (dateRangeFilter === '30days' && monthAgo) {
          if (leadDay < monthAgo) return false;
        }
      }
      
      // Call attempts filter
      if (hasAttemptsFilter) {
        const attempts = lead.callAttempts || 0;
        if (attemptsFilter === '0' && attempts !== 0) return false;
        if (attemptsFilter === '1-3' && (attempts < 1 || attempts > 3)) return false;
        if (attemptsFilter === '4-6' && (attempts < 4 || attempts > 6)) return false;
        if (attemptsFilter === '7+' && attempts < 7) return false;
      }
      
      return true;
    });
  }, [searchQuery, statusFilter, sourceFilter, ownerFilter, dateRangeFilter, attemptsFilter, leads, clientTypeFilter]);

  // Categorize and sort leads for categorized view
  const categorizedLeads = useMemo(() => {
    // Categorize filtered leads normally, even during search
    const categorized = categorizeAndSortLeads(filteredLeads, followUps);
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    // Apply status filter FIRST
    if (statusFilter === 'overdue') {
      return { overdue: categorized.overdue, newLeads: [], future: [], statusFiltered: [] };
    } else if (statusFilter === 'scheduled') {
      // When showOnlyToday is true (checkbox unchecked), only show today's scheduled follow-ups
      const scheduledToShow = showOnlyToday 
        ? categorized.future.filter(({ followUp }) => {
            if (!followUp) return false;
            const scheduledDate = new Date(followUp.scheduledAt);
            return scheduledDate >= todayStart && scheduledDate <= todayEnd;
          })
        : categorized.future;
      return { overdue: [], newLeads: [], future: scheduledToShow, statusFiltered: [] };
    } else if (statusFilter === 'today') {
      // Filter future to show only TODAY's follow-ups
      const todayFollowUps = categorized.future.filter(({ followUp }) => {
        if (!followUp) return false;
        const scheduledDate = new Date(followUp.scheduledAt);
        return scheduledDate >= todayStart && scheduledDate <= todayEnd && scheduledDate >= now;
      });
      
      return { overdue: [], newLeads: [], future: todayFollowUps, statusFiltered: [] };
    } else if (statusFilter === 'new') {
      // When showOnlyToday is true (checkbox unchecked), only show today's new leads
      const newLeadsToShow = showOnlyToday
        ? categorized.newLeads.filter(({ lead }) => {
            const createdDate = new Date(lead.createdAt);
            return createdDate >= todayStart && createdDate <= todayEnd;
          })
        : categorized.newLeads;
      return { overdue: [], newLeads: newLeadsToShow, future: [], statusFiltered: [] };
    } else if (statusFilter !== 'all' && ['qualified', 'unqualified', 'won', 'lost', 'unreach'].includes(statusFilter)) {
      // For specific status filters, show all filtered leads in a separate section
      return { 
        overdue: [], 
        newLeads: [], 
        future: [], 
        statusFiltered: filteredLeads.map(lead => ({ lead, followUp: getNextFollowUpForLead(lead.id) }))
      };
    }
    
    // When "Show All Leads" checkbox is UNCHECKED (showOnlyToday = true) and no specific filter
    // Show: Overdue follow-ups + Today's scheduled follow-ups + Today's new leads
    if (showOnlyToday && statusFilter === 'all') {
      // Filter new leads to show only today's
      const todayNewLeads = categorized.newLeads.filter(({ lead }) => {
        const createdDate = new Date(lead.createdAt);
        return createdDate >= todayStart && createdDate <= todayEnd;
      });
      
      // Filter scheduled follow-ups to show only today's
      const todayScheduled = categorized.future.filter(({ followUp }) => {
        if (!followUp) return false;
        const scheduledDate = new Date(followUp.scheduledAt);
        return scheduledDate >= todayStart && scheduledDate <= todayEnd;
      });
      
      // Always show ALL overdue follow-ups and ALL new leads (they should be addressed regardless of date)
      return { 
        overdue: categorized.overdue, 
        newLeads: categorized.newLeads, 
        future: todayScheduled, 
        statusFiltered: [] 
      };
    }
    
    return { ...categorized, statusFiltered: [] };
  }, [filteredLeads, followUps, currentTime, statusFilter, showOnlyToday]); // Re-calculate when time updates or showOnlyToday changes

  // Lazy loaded leads - only limit when showing all leads (showOnlyToday = false)
  const lazyLoadedLeads = useMemo(() => {
    // When showing only today's leads, return all (typically small count, no lazy loading needed)
    if (showOnlyToday) {
      const totalItems = categorizedLeads.overdue.length + categorizedLeads.newLeads.length + 
                         categorizedLeads.future.length + categorizedLeads.statusFiltered.length;
      return {
        ...categorizedLeads,
        totalItems,
        visibleItems: totalItems,
        hasMore: false,
        // Per-category totals and hasMore flags
        totalOverdue: categorizedLeads.overdue.length,
        totalNewLeads: categorizedLeads.newLeads.length,
        totalFuture: categorizedLeads.future.length,
        totalStatusFiltered: categorizedLeads.statusFiltered.length,
        hasMoreOverdue: false,
        hasMoreNewLeads: false,
        hasMoreFuture: false,
        hasMoreStatusFiltered: false,
      };
    }

    // Per-category lazy loading - show proportionally from each category
    // Calculate items per category (distribute visibleCount across categories)
    const itemsPerCategory = Math.ceil(visibleCount / 4); // Show equal amount from each category
    
    // Slice each category independently
    const overdue = categorizedLeads.overdue.slice(0, itemsPerCategory);
    const newLeads = categorizedLeads.newLeads.slice(0, itemsPerCategory);
    const future = categorizedLeads.future.slice(0, itemsPerCategory);
    const statusFiltered = categorizedLeads.statusFiltered.slice(0, itemsPerCategory);

    // Calculate totals and hasMore per category
    const totalOverdue = categorizedLeads.overdue.length;
    const totalNewLeads = categorizedLeads.newLeads.length;
    const totalFuture = categorizedLeads.future.length;
    const totalStatusFiltered = categorizedLeads.statusFiltered.length;
    
    const hasMoreOverdue = overdue.length < totalOverdue;
    const hasMoreNewLeads = newLeads.length < totalNewLeads;
    const hasMoreFuture = future.length < totalFuture;
    const hasMoreStatusFiltered = statusFiltered.length < totalStatusFiltered;
    
    const totalItems = totalOverdue + totalNewLeads + totalFuture + totalStatusFiltered;
    const displayedItems = overdue.length + newLeads.length + future.length + statusFiltered.length;
    const hasMore = hasMoreOverdue || hasMoreNewLeads || hasMoreFuture || hasMoreStatusFiltered;

    return {
      overdue,
      future,
      newLeads,
      statusFiltered,
      totalItems,
      visibleItems: displayedItems,
      hasMore,
      // Per-category totals and hasMore flags
      totalOverdue,
      totalNewLeads,
      totalFuture,
      totalStatusFiltered,
      hasMoreOverdue,
      hasMoreNewLeads,
      hasMoreFuture,
      hasMoreStatusFiltered,
    };
  }, [categorizedLeads, visibleCount, showOnlyToday]);

  // Update parent component with total filtered leads count (not just visible)
  useEffect(() => {
    if (onCountChange) {
      onCountChange(lazyLoadedLeads.totalItems);
    }
  }, [lazyLoadedLeads.totalItems, onCountChange]);

  // Load more handler for lazy loading
  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 50);
  };

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
    <Box opacity={scrollRestored ? 1 : 0} transition="opacity 0.15s ease-in">
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

      {fetchError && (
        <Box bg="red.50" p={4} borderRadius="lg" mb={4} color="red.700">
          {fetchError.message || 'Failed to fetch data'}
        </Box>
      )}

      {/* Show skeleton loaders only on TRUE initial load (no cached data) */}
      {isLoading && (!leads || leads.length === 0) && (
        <Box>
          <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={4}>
            <SectionHeaderSkeleton />
          </Box>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            <LeadCardGridSkeleton count={9} />
          </SimpleGrid>
        </Box>
      )}

      {/* Show content once data is available (from cache or fresh) */}
      {(!isLoading || (leads && leads.length > 0)) && (
        <>
      {/* Subtle indicator for background data refresh */}
      {isValidating && leads.length > 0 && (
        <Box 
          position="fixed" 
          top={4} 
          right={4} 
          bg="blue.50" 
          px={3} 
          py={2} 
          borderRadius="md" 
          boxShadow="md"
          zIndex={10}
          display="flex"
          alignItems="center"
          gap={2}
        >
          <Icon as={HiRefresh} color="blue.500" className="spin-animation" />
          <Text fontSize="sm" color="blue.700">Updating...</Text>
        </Box>
      )}
      
      {/* Search and Filters */}
      <Box bg="white" p={{ base: 3, md: 4 }} borderRadius="lg" boxShadow="sm" mb={4}>
        <VStack spacing={3} align="stretch">
          {/* Info about global filters */}
          <Text fontSize="sm" color="gray.600" fontWeight="medium">
            ℹ️ Global filters (search, source, client type, attempts) are applied at the page level above
          </Text>
          
          <Divider />

          {/* Tab-specific Filters Row */}
          <Flex gap={3} direction={{ base: 'column', sm: 'row' }} align="stretch" flexWrap="wrap">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              size={{ base: 'sm', md: 'md' }}
              maxW={{ base: 'full', sm: '220px' }}
              flex={{ base: '1 1 100%', sm: '0 1 auto' }}
            >
              <option value="all">All Active Leads</option>
              <option value="new">New</option>
              <option value="today">Follow-up Today</option>
              <option value="overdue">Overdue</option>
              <option value="scheduled">Scheduled Follow-up</option>
            </Select>

            {/* Reset Local Filters Button */}
            <Button
              leftIcon={<HiX />}
              onClick={handleResetFilters}
              size={{ base: 'sm', md: 'md' }}
              variant="outline"
              colorScheme="red"
              flex={{ base: '1 1 100%', sm: '0 1 auto' }}
              isDisabled={statusFilter === 'all' && !assignedToMe && showOnlyToday}
            >
              Reset Local Filters
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
          
          {/* Show All Leads Checkbox */}
          <Box>
            <Checkbox
              isChecked={!showOnlyToday}
              onChange={(e) => {
                setShowOnlyToday(!e.target.checked);
                setVisibleCount(50); // Reset lazy loading when toggling
              }}
              size={{ base: 'sm', md: 'md' }}
              colorScheme="blue"
            >
              <Text fontSize={{ base: 'sm', md: 'md' }}>Show All Leads</Text>
            </Checkbox>
          </Box>

          {/* Results Count - Show contextual count based on selected filter */}
          <Text fontSize="sm" fontWeight="medium" color="gray.700">
            {(() => {
              const displayedCount = lazyLoadedLeads.overdue.length + lazyLoadedLeads.newLeads.length + lazyLoadedLeads.future.length + lazyLoadedLeads.statusFiltered.length;
              const totalCount = lazyLoadedLeads.totalItems;
              
              // When a specific status filter is active, show the count as "X of X"
              // since we're showing all items that match that specific filter
              if (statusFilter !== 'all') {
                let label = '';
                switch (statusFilter) {
                  case 'new':
                    label = 'New';
                    break;
                  case 'overdue':
                    label = 'Overdue';
                    break;
                  case 'scheduled':
                    label = 'Scheduled Follow-up';
                    break;
                  case 'today':
                    label = 'Follow-up Today';
                    break;
                  case 'qualified':
                    label = 'Qualified';
                    break;
                  case 'unqualified':
                    label = 'Unqualified';
                    break;
                  case 'won':
                    label = 'Won';
                    break;
                  case 'lost':
                    label = 'Lost';
                    break;
                  case 'unreach':
                    label = 'Unreachable';
                    break;
                  default:
                    label = 'Leads';
                }
                return lazyLoadedLeads.hasMore 
                  ? `Showing ${displayedCount} of ${totalCount} ${label}`
                  : `Showing ${displayedCount} ${label}`;
              }
              
              // When showOnlyToday is true (checkbox unchecked), show today's count
              if (showOnlyToday) {
                return `Showing ${displayedCount} of ${displayedCount} Active Leads`;
              }
              
              // Show all active leads with lazy loading info
              return lazyLoadedLeads.hasMore
                ? `Showing ${displayedCount} of ${totalCount} Active Leads`
                : `Showing ${displayedCount} Active Leads`;
            })()}
          </Text>
        </VStack>
      </Box>

      {/* Categorized View - Follow-up List with 3 Categories */}
      <VStack spacing={6} align="stretch">
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
              justify="space-between"
            >
              <Flex align="center" gap={2} flexWrap="wrap">
                <Icon as={HiUserAdd} boxSize={{ base: 5, md: 6 }} color="blue.600" />
                <Heading size={{ base: 'sm', md: 'md' }} ml={{ base: 1, md: 2 }} color="blue.700">
                  New Leads
                </Heading>
                <Badge ml={{ base: 2, md: 3 }} colorScheme="blue" fontSize={{ base: 'xs', sm: 'sm', md: 'md' }}>
                  {lazyLoadedLeads.totalNewLeads}
                </Badge>
              </Flex>
              <IconButton
                aria-label={isNewLeadsCollapsed ? "Show" : "Hide"}
                icon={isNewLeadsCollapsed ? <HiChevronDown /> : <HiChevronUp />}
                size="sm"
                variant="ghost"
                colorScheme="blue"
                onClick={() => setIsNewLeadsCollapsed(!isNewLeadsCollapsed)}
              />
            </Flex>
            
            {!isNewLeadsCollapsed && (lazyLoadedLeads.newLeads.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 2, md: 3 }}>
                {lazyLoadedLeads.newLeads.map(({ lead, followUp }) => {
                  const lastCall = getLastCallForLead(lead.id);
                  
                  return (
                    <ModernLeadCard
                      key={lead.id}
                      lead={lead}
                      followUp={followUp}
                      lastCall={lastCall}
                      onCallClick={() => {
                        setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone, source: lead.source, campaign: lead.campaign });
                        onCallDialerOpen();
                      }}
                      onWhatsAppClick={(e) => handleWhatsAppClick(lead.phone, e)}
                      onChangeStatusClick={(e) => {
                        e.stopPropagation();
                        setLeadToChangeStatus({
                          id: lead.id,
                          name: lead.name,
                          status: lead.status
                        });
                        onChangeStatusOpen();
                      }}
                      onAssignClick={(e) => {
                        e.stopPropagation();
                        setLeadToAssign({
                          id: lead.id,
                          name: lead.name,
                          currentAssignee: lead.assignedTo?.name ?? undefined
                        });
                        onAssignOpen();
                      }}
                      onViewClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                      getStatusBadgeColor={getStatusBadgeColor}
                      getStatusLabel={getStatusLabel}
                      LeadAgeComponent={LeadAge}
                      CallRemarksComponent={CallRemarksDisplay}
                      onAddCallRemark={() => handleAddCallRemark(lead.id, lead.name)}
                      onEditCallRemark={handleEditCallRemark}
                    />
                  );
                })}
              </SimpleGrid>
            ) : (
              <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="lg" textAlign="center">
                <Text color="gray.500" fontSize={{ base: 'sm', md: 'md' }}>No new leads</Text>
              </Box>
            ))}
          </Box>

          <Divider />

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
              justify="space-between"
            >
              <Flex align="center" gap={2} flexWrap="wrap">
                <Icon as={HiExclamation} boxSize={{ base: 5, md: 6 }} color="red.600" />
                <Heading size={{ base: 'sm', md: 'md' }} ml={{ base: 1, md: 2 }} color="red.700">
                  Overdue Follow-ups
                </Heading>
                <Badge ml={{ base: 2, md: 3 }} colorScheme="red" fontSize={{ base: 'xs', sm: 'sm', md: 'md' }}>
                  {lazyLoadedLeads.totalOverdue}
                </Badge>
              </Flex>
              <IconButton
                aria-label={isOverdueCollapsed ? "Show" : "Hide"}
                icon={isOverdueCollapsed ? <HiChevronDown /> : <HiChevronUp />}
                size="sm"
                variant="ghost"
                colorScheme="red"
                onClick={() => setIsOverdueCollapsed(!isOverdueCollapsed)}
              />
            </Flex>
            
            {!isOverdueCollapsed && (lazyLoadedLeads.overdue.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 2, md: 3 }}>
                {lazyLoadedLeads.overdue.map(({ lead, followUp }) => {
                  const lastCall = getLastCallForLead(lead.id);
                  
                  return (
                    <ModernLeadCard
                      key={lead.id}
                      lead={lead}
                      followUp={followUp}
                      lastCall={lastCall}
                      onCallClick={() => {
                        setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone, source: lead.source, campaign: lead.campaign });
                        onCallDialerOpen();
                      }}
                      onWhatsAppClick={(e) => handleWhatsAppClick(lead.phone, e)}
                      onChangeStatusClick={(e) => {
                        e.stopPropagation();
                        setLeadToChangeStatus({
                          id: lead.id,
                          name: lead.name,
                          status: lead.status
                        });
                        onChangeStatusOpen();
                      }}
                      onAssignClick={(e) => {
                        e.stopPropagation();
                        setLeadToAssign({
                          id: lead.id,
                          name: lead.name,
                          currentAssignee: lead.assignedTo?.name ?? undefined
                        });
                        onAssignOpen();
                      }}
                      onViewClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                      getStatusBadgeColor={getStatusBadgeColor}
                      getStatusLabel={getStatusLabel}
                      LeadAgeComponent={LeadAge}
                      CallRemarksComponent={CallRemarksDisplay}
                      onAddCallRemark={() => handleAddCallRemark(lead.id, lead.name)}
                      onEditCallRemark={handleEditCallRemark}
                    />
                  );
                })}
              </SimpleGrid>
            ) : (
              <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="lg" textAlign="center">
                <Text color="gray.500" fontSize={{ base: 'sm', md: 'md' }}>No overdue follow-ups 🎉</Text>
              </Box>
            ))}
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
              justify="space-between"
            >
              <Flex align="center" gap={2} flexWrap="wrap">
                <Icon as={HiClock} boxSize={{ base: 5, md: 6 }} color="green.600" />
                <Heading size={{ base: 'sm', md: 'md' }} ml={{ base: 1, md: 2 }} color="green.700">
                  Scheduled Follow-ups
                </Heading>
                <Badge ml={{ base: 2, md: 3 }} colorScheme="green" fontSize={{ base: 'xs', sm: 'sm', md: 'md' }}>
                  {lazyLoadedLeads.totalFuture}
                </Badge>
              </Flex>
              <IconButton
                aria-label={isScheduledCollapsed ? "Show" : "Hide"}
                icon={isScheduledCollapsed ? <HiChevronDown /> : <HiChevronUp />}
                size="sm"
                variant="ghost"
                colorScheme="green"
                onClick={() => setIsScheduledCollapsed(!isScheduledCollapsed)}
              />
            </Flex>
            
            {!isScheduledCollapsed && (lazyLoadedLeads.future.length > 0 ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 2, md: 3 }}>
                {lazyLoadedLeads.future.map(({ lead, followUp }) => {
                  const lastCall = getLastCallForLead(lead.id);
                  
                  return (
                    <ModernLeadCard
                      key={lead.id}
                      lead={lead}
                      followUp={followUp}
                      lastCall={lastCall}
                      onCallClick={() => {
                        setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone, source: lead.source, campaign: lead.campaign });
                        onCallDialerOpen();
                      }}
                      onWhatsAppClick={(e) => handleWhatsAppClick(lead.phone, e)}
                      onChangeStatusClick={(e) => {
                        e.stopPropagation();
                        setLeadToChangeStatus({
                          id: lead.id,
                          name: lead.name,
                          status: lead.status
                        });
                        onChangeStatusOpen();
                      }}
                      onAssignClick={(e) => {
                        e.stopPropagation();
                        setLeadToAssign({
                          id: lead.id,
                          name: lead.name,
                          currentAssignee: lead.assignedTo?.name ?? undefined
                        });
                        onAssignOpen();
                      }}
                      onViewClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                      getStatusBadgeColor={getStatusBadgeColor}
                      getStatusLabel={getStatusLabel}
                      LeadAgeComponent={LeadAge}
                      CallRemarksComponent={CallRemarksDisplay}
                      onAddCallRemark={() => handleAddCallRemark(lead.id, lead.name)}
                      onEditCallRemark={handleEditCallRemark}
                    />
                  );
                })}
              </SimpleGrid>
            ) : (
              <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="lg" textAlign="center">
                <Text color="gray.500" fontSize={{ base: 'sm', md: 'md' }}>No scheduled follow-ups</Text>
              </Box>
            ))}
          </Box>

          {/* Status Filtered Leads - For specific status filters like unqualified, won, lost, etc. OR search results */}
          {lazyLoadedLeads.statusFiltered && lazyLoadedLeads.statusFiltered.length > 0 && (
            <Box>
              <Flex
                align="center"
                mb={4}
                p={{ base: 2, md: 3 }}
                bg={searchQuery.trim() !== '' ? 'blue.50' : 'gray.50'}
                borderRadius="md"
                borderLeft="4px"
                borderColor={
                  searchQuery.trim() !== '' ? 'blue.500' :
                  statusFilter === 'unqualified' ? 'purple.500' :
                  statusFilter === 'won' ? 'green.500' :
                  statusFilter === 'lost' ? 'red.500' :
                  statusFilter === 'qualified' ? 'cyan.500' :
                  statusFilter === 'unreach' ? 'pink.500' :
                  'gray.500'
                }
                flexWrap="wrap"
                gap={2}
                justify="space-between"
              >
                <Flex align="center" gap={2} flexWrap="wrap">
                  <Icon 
                    as={
                      searchQuery.trim() !== '' ? HiSearch :
                      statusFilter === 'unqualified' ? HiX :
                      statusFilter === 'won' ? HiPlus :
                      statusFilter === 'lost' ? HiBan :
                      HiViewBoards
                    } 
                    boxSize={{ base: 5, md: 6 }} 
                    color={
                      searchQuery.trim() !== '' ? 'blue.600' :
                      statusFilter === 'unqualified' ? 'purple.600' :
                      statusFilter === 'won' ? 'green.600' :
                      statusFilter === 'lost' ? 'red.600' :
                      statusFilter === 'qualified' ? 'cyan.600' :
                      statusFilter === 'unreach' ? 'pink.600' :
                      'gray.600'
                    }
                  />
                  <Heading size={{ base: 'sm', md: 'md' }} ml={{ base: 1, md: 2 }} color={
                    searchQuery.trim() !== '' ? 'blue.700' :
                    statusFilter === 'unqualified' ? 'purple.700' :
                    statusFilter === 'won' ? 'green.700' :
                    statusFilter === 'lost' ? 'red.700' :
                    statusFilter === 'qualified' ? 'cyan.700' :
                    statusFilter === 'unreach' ? 'pink.700' :
                    'gray.700'
                  }>
                    {searchQuery.trim() !== '' ? 'Search Results' : `${getStatusLabel(statusFilter)} Leads`}
                  </Heading>
                  <Badge ml={{ base: 2, md: 3 }} colorScheme={
                    searchQuery.trim() !== '' ? 'blue' :
                    statusFilter === 'unqualified' ? 'purple' :
                    statusFilter === 'won' ? 'green' :
                    statusFilter === 'lost' ? 'red' :
                    statusFilter === 'qualified' ? 'cyan' :
                    statusFilter === 'unreach' ? 'pink' :
                    'gray'
                  } fontSize={{ base: 'xs', sm: 'sm', md: 'md' }}>
                    {lazyLoadedLeads.totalStatusFiltered}
                  </Badge>
                </Flex>
                <IconButton
                  aria-label={isStatusFilteredCollapsed ? "Show" : "Hide"}
                  icon={isStatusFilteredCollapsed ? <HiChevronDown /> : <HiChevronUp />}
                  size="sm"
                  variant="ghost"
                  colorScheme={
                    searchQuery.trim() !== '' ? 'blue' :
                    statusFilter === 'unqualified' ? 'purple' :
                    statusFilter === 'won' ? 'green' :
                    statusFilter === 'lost' ? 'red' :
                    statusFilter === 'qualified' ? 'cyan' :
                    statusFilter === 'unreach' ? 'pink' :
                    'gray'
                  }
                  onClick={() => setIsStatusFilteredCollapsed(!isStatusFilteredCollapsed)}
                />
              </Flex>
              
              {!isStatusFilteredCollapsed && (
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={{ base: 2, md: 3 }}>
                  {lazyLoadedLeads.statusFiltered.map(({ lead, followUp }) => {
                    const lastCall = getLastCallForLead(lead.id);
                    
                    return (
                      <ModernLeadCard
                        key={lead.id}
                        lead={lead}
                        followUp={followUp}
                        lastCall={lastCall}
                        onCallClick={() => {
                          setLeadToCall({ id: lead.id, name: lead.name, phone: lead.phone, source: lead.source, campaign: lead.campaign });
                          onCallDialerOpen();
                        }}
                        onWhatsAppClick={(e) => handleWhatsAppClick(lead.phone, e)}
                        onChangeStatusClick={(e) => {
                          e.stopPropagation();
                          setLeadToChangeStatus({
                            id: lead.id,
                            name: lead.name,
                            status: lead.status
                          });
                          onChangeStatusOpen();
                        }}
                        onAssignClick={(e) => {
                          e.stopPropagation();
                          setLeadToAssign({
                            id: lead.id,
                            name: lead.name,
                            currentAssignee: lead.assignedTo?.name ?? undefined
                          });
                          onAssignOpen();
                        }}
                        onViewClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                        getStatusBadgeColor={getStatusBadgeColor}
                        getStatusLabel={getStatusLabel}
                        LeadAgeComponent={LeadAge}
                        CallRemarksComponent={CallRemarksDisplay}
                        onAddCallRemark={() => handleAddCallRemark(lead.id, lead.name)}
                        onEditCallRemark={handleEditCallRemark}
                      />
                    );
                  })}
                </SimpleGrid>
              )}
            </Box>
          )}
          
          {/* Load More Button - Only show when there are more leads to load */}
          {lazyLoadedLeads.hasMore && (
            <Flex justify="center" mt={6} pb={4}>
              <Button
                size={{ base: 'md', md: 'lg' }}
                colorScheme="blue"
                variant="outline"
                onClick={handleLoadMore}
                px={{ base: 6, md: 8 }}
                width={{ base: 'full', sm: 'auto' }}
                maxW={{ base: 'full', sm: '400px' }}
              >
                Load More ({lazyLoadedLeads.totalItems - lazyLoadedLeads.visibleItems} remaining)
              </Button>
            </Flex>
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
            onSuccess={() => {
              // Optimistic update
              optimisticUpdateLead(selectedLead.id, { status: 'unreach' });
            }}
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
            onSuccess={() => {
              // Optimistic update
              optimisticUpdateLead(selectedLead.id, { status: 'unqualified' });
            }}
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
          onSuccess={() => {
            // Background refresh only (assignment doesn't change visible status)
            setTimeout(() => refreshAll(), 100);
          }}
        />
      )}

      {/* Add Lead Modal */}
      <AddLeadModal 
        isOpen={isAddLeadOpen} 
        onClose={onAddLeadClose} 
        onSuccess={() => {
          // Background refresh to fetch new lead
          setTimeout(() => refreshAll(), 100);
        }} 
      />

      {/* Call Dialer Modal */}
      {leadToCall && (
        <CallDialerModal
          isOpen={isCallDialerOpen}
          onClose={() => {
            onCallDialerClose();
            setLeadToCall(null);
          }}
          onSuccess={() => {
            // Optimistic update - increment call attempts
            optimisticUpdateLead(leadToCall.id, {
              callAttempts: (leads.find(l => l.id === leadToCall.id)?.callAttempts || 0) + 1
            });
          }}
          leadId={leadToCall.id}
          leadName={leadToCall.name}
          leadPhone={leadToCall.phone}
          leadSource={leadToCall.source}
          leadCampaign={leadToCall.campaign}
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

      {/* Change Status Modal */}
      {leadToChangeStatus && (
        <ChangeStatusModal
          isOpen={isChangeStatusOpen}
          onClose={() => {
            onChangeStatusClose();
            setLeadToChangeStatus(null);
          }}
          leadId={leadToChangeStatus.id}
          leadName={leadToChangeStatus.name}
          currentStatus={leadToChangeStatus.status}
          onSuccess={(newStatus?: string) => {
            // Optimistic update - instant UI feedback
            if (newStatus && leadToChangeStatus) {
              optimisticUpdateLead(leadToChangeStatus.id, { status: newStatus });
            }
          }}
        />
      )}

      {/* Edit Call Remark Modal */}
      <EditCallRemarkModal
        isOpen={isEditCallRemarkOpen}
        onClose={() => {
          onEditCallRemarkClose();
          setCallRemarkToEdit(null);
          setLeadForCallRemark(null);
        }}
        callLog={callRemarkToEdit}
        leadId={leadForCallRemark?.id}
        leadName={leadForCallRemark?.name}
        onSuccess={handleCallRemarkSuccess}
      />
        </>
      )}
    </Box>
  );
}

// Export the component
export default LeadsTabContent;





