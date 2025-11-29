'use client';

import { useState, useMemo } from 'react';
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
} from '@chakra-ui/react';
import { HiFilter, HiUsers, HiPhone, HiUserAdd, HiClipboardList, HiBan, HiExclamation, HiCheckCircle, HiXCircle, HiClock } from 'react-icons/hi';
import { mockLeads, mockCallLogs, mockFollowUps, mockUsers } from '@/shared/lib/mock-data';
import { formatDate } from '@/shared/lib/date-utils';
import DSRCard from '@/features/dsr/components/DSRCard';

// Custom color theme
const THEME_COLORS = {
  primary: '#9c5342',
  dark: '#0b1316',
  light: '#b4a097',
  medium: '#7a5f58',
  accent: '#8c9b96',
};

// Dropdown options
const DROPDOWN_OPTIONS = [
  { value: 'all', label: 'All Agents' },
  { value: 'ABC', label: 'ABC' },
  { value: 'EFG', label: 'EFG' },
  { value: 'HIGK', label: 'HIGK' },
  { value: 'John Doe', label: 'John Doe' },
  { value: 'Jane Smith', label: 'Jane Smith' },
  { value: 'Mike Johnson', label: 'Mike Johnson' },
  { value: 'Sarah Williams', label: 'Sarah Williams' },
  { value: 'Tom Brown', label: 'Tom Brown' },
];

export default function DSRPage() {
  const toast = useToast();
  
  // Get today's date and set default date range
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  // Filter state
  const [startDate, setStartDate] = useState(todayString);
  const [endDate, setEndDate] = useState(todayString);
  const [selectedOption, setSelectedOption] = useState('all');
  const [isFiltered, setIsFiltered] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState('all_time');

  // Temporary state for filters before applying
  const [tempStartDate, setTempStartDate] = useState(todayString);
  const [tempEndDate, setTempEndDate] = useState(todayString);
  const [tempSelectedOption, setTempSelectedOption] = useState('all');
  const [tempDateRangePreset, setTempDateRangePreset] = useState('all_time');

  // Handle date range preset changes
  const handleDateRangePresetChange = (preset: string) => {
    setTempDateRangePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    if (preset === 'today') {
      setTempStartDate(todayStr);
      setTempEndDate(todayStr);
    } else if (preset === 'last_week') {
      const lastWeek = new Date(now);
      lastWeek.setDate(now.getDate() - 7);
      setTempStartDate(lastWeek.toISOString().split('T')[0]);
      setTempEndDate(todayStr);
    } else if (preset === 'last_month') {
      const lastMonth = new Date(now);
      lastMonth.setMonth(now.getMonth() - 1);
      setTempStartDate(lastMonth.toISOString().split('T')[0]);
      setTempEndDate(todayStr);
    } else if (preset === 'all_time') {
      // For all time, use a very old date to current date
      const oldDate = new Date(now);
      oldDate.setFullYear(now.getFullYear() - 5);
      setTempStartDate(oldDate.toISOString().split('T')[0]);
      setTempEndDate(todayStr);
    }
    // For 'custom', don't change dates - user will set them manually
  };

  // Apply filters
  const handleApplyFilters = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setSelectedOption(tempSelectedOption);
    setDateRangePreset(tempDateRangePreset);
    setIsFiltered(true);
    
    toast({
      title: 'Filters Applied',
      description: 'DSR data has been updated based on your filters.',
      status: 'success',
      duration: 2000,
      isClosable: true,
      position: 'top-right',
    });
  };

  // Reset filters
  const handleResetFilters = () => {
    setTempStartDate(todayString);
    setTempEndDate(todayString);
    setTempSelectedOption('all');
    setTempDateRangePreset('all_time');
    setStartDate(todayString);
    setEndDate(todayString);
    setSelectedOption('all');
    setDateRangePreset('all_time');
    setIsFiltered(false);
    setActiveCard(null);
    setSearchQuery('');
    
    toast({
      title: 'Filters Reset',
      description: 'All filters have been cleared.',
      status: 'info',
      duration: 2000,
      isClosable: true,
      position: 'top-right',
    });
  };

  // Handle card click
  const handleCardClick = (type: string) => {
    setActiveCard(activeCard === type ? null : type);
    
    const cardLabels: Record<string, string> = {
      newLeads: 'New Leads',
      followUps: 'Follow-ups',
      overdue: 'Overdue Follow-ups',
      unqualified: 'Unqualified',
      unreachable: 'Unreachable',
      win: 'Won Deals',
      lose: 'Lost Deals',
      totalCalls: 'Total Calls',
      completedCalls: 'Completed Calls',
    };
    
    const label = cardLabels[type] || type;
    toast({
      title: `${label} Card Selected`,
      description: `Viewing details for ${label.toLowerCase()}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
      position: 'top-right',
    });
  };

  // Filter and calculate stats
  const stats = useMemo(() => {
    if (!startDate || !endDate) {
      return {
        newLeadsHandledToday: 0,
        totalNewLeads: 0,
        followUpsHandledToday: 0,
        totalFollowUps: 0,
        unqualifiedToday: 0,
        unreachableToday: 0,
        wonToday: 0,
        lostToday: 0,
        totalCalls: 0,
        completedCalls: 0,
      };
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Filter leads by selected option
    const filteredLeads = selectedOption === 'all' 
      ? mockLeads 
      : mockLeads.filter(lead => 
          lead.assignedTo?.name === selectedOption || 
          selectedOption === 'ABC' || 
          selectedOption === 'EFG' || 
          selectedOption === 'HIGK'
        );

    // 1. New Leads Handled Today (within date range)
    const newLeadsHandledToday = filteredLeads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= start && leadDate <= end;
    }).length;

    // 2. Total New Leads (all time for selected option)
    const totalNewLeads = filteredLeads.length;

    // 3. Follow-ups Handled Today (within date range)
    const followUpsHandledToday = mockFollowUps.filter(followUp => {
      const followUpDate = new Date(followUp.scheduledFor);
      const isInDateRange = followUpDate >= start && followUpDate <= end;
      
      const lead = filteredLeads.find(l => l.id === followUp.leadId);
      return isInDateRange && lead && followUp.status === 'pending';
    }).length;

    // Total follow-ups
    const totalFollowUps = mockFollowUps.filter(followUp => {
      const lead = filteredLeads.find(l => l.id === followUp.leadId);
      return lead !== undefined;
    }).length;

    // 4. Unqualified Today
    const unqualifiedToday = filteredLeads.filter(lead => {
      const leadDate = new Date(lead.updatedAt);
      return leadDate >= start && leadDate <= end && lead.status === 'unqualified';
    }).length;

    // 5. Unreachable Today
    const unreachableToday = filteredLeads.filter(lead => {
      const leadDate = new Date(lead.updatedAt);
      return leadDate >= start && leadDate <= end && lead.status === 'unreach';
    }).length;

    // 6. Won Deals Today
    const wonToday = filteredLeads.filter(lead => {
      const leadDate = new Date(lead.updatedAt);
      return leadDate >= start && leadDate <= end && lead.status === 'won';
    }).length;

    // 7. Lost Deals Today
    const lostToday = filteredLeads.filter(lead => {
      const leadDate = new Date(lead.updatedAt);
      return leadDate >= start && leadDate <= end && lead.status === 'lost';
    }).length;

    // 8. Overdue Follow-ups (all pending follow-ups that are past scheduled time)
    const now = new Date();
    const overdueFollowUps = mockFollowUps.filter(followUp => {
      const scheduledDate = new Date(followUp.scheduledFor);
      const lead = filteredLeads.find(l => l.id === followUp.leadId);
      return followUp.status === 'pending' && scheduledDate < now && lead;
    }).length;

    // 9. High Priority Overdue
    const highPriorityOverdue = mockFollowUps.filter(followUp => {
      const scheduledDate = new Date(followUp.scheduledFor);
      const lead = filteredLeads.find(l => l.id === followUp.leadId);
      return followUp.status === 'pending' && 
             scheduledDate < now && 
             followUp.priority === 'high' && 
             lead;
    }).length;

    // 10. Total Calls in date range
    const callsInRange = mockCallLogs.filter(call => {
      const callDate = new Date(call.createdAt);
      const isInRange = callDate >= start && callDate <= end;
      
      // Filter by agent if selected
      if (selectedOption !== 'all') {
        return isInRange && call.userName === selectedOption;
      }
      return isInRange;
    });

    const totalCalls = callsInRange.length;

    // 11. Completed Calls (status === 'completed')
    const completedCalls = callsInRange.filter(call => call.status === 'completed').length;

    return {
      newLeadsHandledToday,
      totalNewLeads,
      followUpsHandledToday,
      totalFollowUps,
      unqualifiedToday,
      unreachableToday,
      wonToday,
      lostToday,
      overdueFollowUps,
      highPriorityOverdue,
      totalCalls,
      completedCalls,
    };
  }, [startDate, endDate, selectedOption]);

  // Filtered leads for the table
  const filteredLeads = useMemo(() => {
    if (!startDate || !endDate) {
      return [];
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let filtered = selectedOption === 'all' 
      ? [...mockLeads] 
      : mockLeads.filter(lead => 
          lead.assignedTo?.name === selectedOption || 
          selectedOption === 'ABC' || 
          selectedOption === 'EFG' || 
          selectedOption === 'HIGK'
        );

    // Filter by date range (either created date or has follow-up in range)
    filtered = filtered.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      const isLeadInRange = leadDate >= start && leadDate <= end;

      // Check if lead has follow-up in date range
      const hasFollowUpInRange = mockFollowUps.some(followUp => {
        const followUpDate = new Date(followUp.scheduledFor);
        return followUp.leadId === lead.id && 
               followUpDate >= start && 
               followUpDate <= end;
      });

      return isLeadInRange || hasFollowUpInRange;
    });

    // If a card is active, filter further
    if (activeCard === 'newLeads') {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.createdAt);
        return leadDate >= start && leadDate <= end;
      });
    } else if (activeCard === 'followUps') {
      const followUpLeadIds = mockFollowUps
        .filter(followUp => {
          const followUpDate = new Date(followUp.scheduledFor);
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return followUpDate >= start && followUpDate <= end && followUp.status === 'pending';
        })
        .map(f => f.leadId);
      
      filtered = filtered.filter(lead => followUpLeadIds.includes(lead.id));
    } else if (activeCard === 'unqualified') {
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.updatedAt);
        return lead.status === 'unqualified' && leadDate >= start && leadDate <= end;
      });
    } else if (activeCard === 'unreachable') {
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.updatedAt);
        return lead.status === 'unreach' && leadDate >= start && leadDate <= end;
      });
    } else if (activeCard === 'overdue') {
      // Filter leads that have overdue follow-ups
      const now = new Date();
      const overdueLeadIds = mockFollowUps
        .filter(followUp => {
          const scheduledDate = new Date(followUp.scheduledFor);
          return followUp.status === 'pending' && scheduledDate < now;
        })
        .map(f => f.leadId);
      
      filtered = filtered.filter(lead => overdueLeadIds.includes(lead.id));
    } else if (activeCard === 'win') {
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.updatedAt);
        return lead.status === 'won' && leadDate >= start && leadDate <= end;
      });
    } else if (activeCard === 'lose') {
      filtered = filtered.filter(lead => {
        const leadDate = new Date(lead.updatedAt);
        return lead.status === 'lost' && leadDate >= start && leadDate <= end;
      });
    } else if (activeCard === 'totalCalls' || activeCard === 'completedCalls') {
      // For call-related cards, filter leads that have calls in the date range
      const callsInRange = mockCallLogs.filter(call => {
        const callDate = new Date(call.createdAt);
        const isInRange = callDate >= start && callDate <= end;
        
        // Filter by agent if selected
        if (selectedOption !== 'all') {
          return isInRange && call.userName === selectedOption;
        }
        return isInRange;
      });

      // If completedCalls card is active, filter only completed calls
      const relevantCalls = activeCard === 'completedCalls'
        ? callsInRange.filter(call => call.status === 'completed')
        : callsInRange;

      const callLeadIds = relevantCalls.map(call => call.leadId);
      filtered = filtered.filter(lead => callLeadIds.includes(lead.id));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.name.toLowerCase().includes(query) ||
        lead.phone.includes(query) ||
        (lead.email && lead.email.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [startDate, endDate, selectedOption, activeCard, searchQuery]);

  // Calculate agent performance data
  const agentPerformanceData = useMemo(() => {
    if (!startDate || !endDate) {
      return [];
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all unique agents
    const agentsMap = new Map<string, {
      agent: string;
      date: Date;
      callsMade: number;
      leadsGenerated: number;
      conversions: number;
      status: string;
    }>();

    // Filter calls in date range
    const callsInRange = mockCallLogs.filter(call => {
      const callDate = new Date(call.createdAt);
      return callDate >= start && callDate <= end;
    });

    // Filter leads in date range
    const leadsInRange = mockLeads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= start && leadDate <= end;
    });

    // Group by agent
    const agents = selectedOption === 'all' 
      ? [...new Set(mockUsers.map(u => u.name))]
      : [selectedOption];

    agents.forEach(agentName => {
      // Count calls for this agent
      const agentCalls = callsInRange.filter(call => call.userName === agentName);
      
      // Count leads generated by this agent
      const agentLeads = leadsInRange.filter(lead => 
        lead.assignedTo?.name === agentName
      );

      // Count conversions (won leads)
      const agentConversions = agentLeads.filter(lead => lead.status === 'won');

      // Determine status based on performance
      let status = 'Active';
      if (agentCalls.length === 0 && agentLeads.length === 0) {
        status = 'Inactive';
      } else if (agentConversions.length > 2) {
        status = 'Excellent';
      } else if (agentConversions.length > 0) {
        status = 'Good';
      }

      agentsMap.set(agentName, {
        agent: agentName,
        date: new Date(startDate),
        callsMade: agentCalls.length,
        leadsGenerated: agentLeads.length,
        conversions: agentConversions.length,
        status,
      });
    });

    return Array.from(agentsMap.values()).sort((a, b) => b.callsMade - a.callsMade);
  }, [startDate, endDate, selectedOption]);

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }} color={THEME_COLORS.dark}>
          Daily Sales Report (DSR)
        </Heading>
        {isFiltered && (
          <Badge 
            colorScheme="blue" 
            fontSize="md" 
            px={3} 
            py={1}
            bg={THEME_COLORS.primary}
            color="white"
          >
            Filtered Results
          </Badge>
        )}
      </Flex>

      {/* Search Bar and Filters in Single Row */}
      <Card mb={6} boxShadow="lg" borderTop="4px" borderColor={THEME_COLORS.primary}>
        <CardBody p={{ base: 4, md: 6 }}>
          <VStack spacing={4} align="stretch">
            {/* Search and Filter Row */}
            <Flex gap={3} flexWrap="wrap" align="center">
              {/* Search Input */}
              <Box flex={{ base: '1 1 100%', md: '1 1 300px' }} minW={{ base: 'full', md: '300px' }}>
                <Input
                  placeholder="Search name, phone or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="md"
                  borderColor={THEME_COLORS.light}
                  _hover={{ borderColor: THEME_COLORS.primary }}
                  _focus={{ borderColor: THEME_COLORS.primary, boxShadow: `0 0 0 1px ${THEME_COLORS.primary}` }}
                />
              </Box>

              {/* Date Range Preset Dropdown */}
              <Select
                value={tempDateRangePreset}
                onChange={(e) => handleDateRangePresetChange(e.target.value)}
                borderColor={THEME_COLORS.light}
                _hover={{ borderColor: THEME_COLORS.primary }}
                _focus={{ borderColor: THEME_COLORS.primary, boxShadow: `0 0 0 1px ${THEME_COLORS.primary}` }}
                size="md"
                maxW={{ base: 'full', md: '180px' }}
                flex={{ base: '1 1 100%', md: '0 0 auto' }}
              >
                <option value="all_time">All Time</option>
                <option value="today">Today</option>
                <option value="last_week">Last Week</option>
                <option value="last_month">Last Month</option>
                <option value="custom">Custom</option>
              </Select>

              {/* Agent/Option Selector */}
              <Select
                value={tempSelectedOption}
                onChange={(e) => setTempSelectedOption(e.target.value)}
                borderColor={THEME_COLORS.light}
                _hover={{ borderColor: THEME_COLORS.primary }}
                _focus={{ borderColor: THEME_COLORS.primary, boxShadow: `0 0 0 1px ${THEME_COLORS.primary}` }}
                size="md"
                maxW={{ base: 'full', md: '180px' }}
                flex={{ base: '1 1 100%', md: '0 0 auto' }}
              >
                {DROPDOWN_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              {/* Action Buttons */}
              <HStack spacing={2} flex={{ base: '1 1 100%', md: '0 0 auto' }}>
                <Button
                  bg={THEME_COLORS.primary}
                  color="white"
                  leftIcon={<HiFilter />}
                  onClick={handleApplyFilters}
                  size="md"
                  _hover={{ bg: THEME_COLORS.medium }}
                  _active={{ bg: THEME_COLORS.dark }}
                  flex="1"
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  borderColor={THEME_COLORS.light}
                  color={THEME_COLORS.medium}
                  size="md"
                  _hover={{ bg: THEME_COLORS.light, color: 'white' }}
                  flex="1"
                >
                  Reset
                </Button>
              </HStack>
            </Flex>

            {/* Conditional Date Inputs - Only show when Custom is selected */}
            {tempDateRangePreset === 'custom' && (
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2} color={THEME_COLORS.medium}>
                    Start Date
                  </Text>
                  <Input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    max={tempEndDate}
                    borderColor={THEME_COLORS.light}
                    _hover={{ borderColor: THEME_COLORS.primary }}
                    _focus={{ borderColor: THEME_COLORS.primary, boxShadow: `0 0 0 1px ${THEME_COLORS.primary}` }}
                    size="md"
                  />
                </Box>

                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2} color={THEME_COLORS.medium}>
                    End Date
                  </Text>
                  <Input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    min={tempStartDate}
                    borderColor={THEME_COLORS.light}
                    _hover={{ borderColor: THEME_COLORS.primary }}
                    _focus={{ borderColor: THEME_COLORS.primary, boxShadow: `0 0 0 1px ${THEME_COLORS.primary}` }}
                    size="md"
                  />
                </Box>
              </SimpleGrid>
            )}

            {/* Active Filters Info */}
            {(isFiltered || searchQuery) && startDate && endDate && (
              <Box>
                <Divider my={2} borderColor={THEME_COLORS.light} />
                <Text fontSize="sm" color={THEME_COLORS.medium}>
                  Showing results from <strong>{formatDate(new Date(startDate))}</strong> to{' '}
                  <strong>{formatDate(new Date(endDate))}</strong>
                  {selectedOption !== 'all' && (
                    <> for option <strong>{selectedOption}</strong></>
                  )}
                  {searchQuery && (
                    <> matching search <strong>"{searchQuery}"</strong></>
                  )}
                </Text>
              </Box>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Stats Grid - Clickable DSR Cards - All in responsive grid */}
      <SimpleGrid columns={{ base: 2, sm: 3, lg: 4, xl: 9 }} spacing={{ base: 3, md: 4 }} mb={6}>
        {/* New Leads Card */}
        <DSRCard
          label="New Leads Handled"
          value={stats.newLeadsHandledToday}
          total={stats.totalNewLeads}
          helpText="Within selected date range"
          icon={HiUserAdd}
          colorScheme="primary"
          type="newLeads"
          onClick={handleCardClick}
          isActive={activeCard === 'newLeads'}
        />

        {/* Follow-ups Card */}
        <DSRCard
          label="Follow-ups Handled"
          value={stats.followUpsHandledToday}
          total={stats.totalFollowUps}
          helpText="Pending follow-ups in range"
          icon={HiClipboardList}
          colorScheme="medium"
          type="followUps"
          onClick={handleCardClick}
          isActive={activeCard === 'followUps'}
        />

        {/* Total Calls Card */}
        <DSRCard
          label="Total Calls"
          value={stats.totalCalls}
          helpText="All calls in date range"
          icon={HiPhone}
          colorScheme="accent"
          type="totalCalls"
          onClick={handleCardClick}
          isActive={activeCard === 'totalCalls'}
        />

        {/* Completed Calls Card */}
        <DSRCard
          label="Completed Calls"
          value={stats.completedCalls}
          total={stats.totalCalls}
          helpText="Successfully completed"
          icon={HiCheckCircle}
          colorScheme="primary"
          type="completedCalls"
          onClick={handleCardClick}
          isActive={activeCard === 'completedCalls'}
        />

        {/* Overdue Follow-ups Card */}
        <DSRCard
          label="Overdue Follow-ups"
          value={stats.overdueFollowUps || 0}
          total={stats.highPriorityOverdue || 0}
          helpText={(stats.highPriorityOverdue || 0) > 0 ? `${stats.highPriorityOverdue} high priority` : 'Needs attention'}
          icon={HiClock}
          colorScheme="dark"
          type="overdue"
          onClick={handleCardClick}
          isActive={activeCard === 'overdue'}
        />

        {/* Unqualified Card */}
        <DSRCard
          label="Unqualified Today"
          value={stats.unqualifiedToday}
          helpText="Leads marked unqualified"
          icon={HiBan}
          colorScheme="accent"
          type="unqualified"
          onClick={handleCardClick}
          isActive={activeCard === 'unqualified'}
        />

        {/* Unreachable Card */}
        <DSRCard
          label="Unreachable Today"
          value={stats.unreachableToday}
          helpText="Leads marked unreachable"
          icon={HiExclamation}
          colorScheme="dark"
          type="unreachable"
          onClick={handleCardClick}
          isActive={activeCard === 'unreachable'}
        />

        {/* Won Deals Card */}
        <DSRCard
          label="Won Deals Today"
          value={stats.wonToday}
          helpText="Successfully closed deals"
          icon={HiCheckCircle}
          colorScheme="primary"
          type="win"
          onClick={handleCardClick}
          isActive={activeCard === 'win'}
        />

        {/* Lost Deals Card */}
        <DSRCard
          label="Lost Deals Today"
          value={stats.lostToday}
          helpText="Deals marked as lost"
          icon={HiXCircle}
          colorScheme="medium"
          type="lose"
          onClick={handleCardClick}
          isActive={activeCard === 'lose'}
        />
      </SimpleGrid>

      {/* Filtered Leads Table */}
      <Card boxShadow="lg" borderTop="4px" borderColor={THEME_COLORS.primary}>
        <CardBody p={0}>
          <Box p={4} bg={THEME_COLORS.light} bgGradient={`linear(to-r, ${THEME_COLORS.light}, ${THEME_COLORS.accent})`} borderTopRadius="lg">
            <Flex justify="space-between" align="center">
              <Heading size="md" color="white">
                {activeCard ? `Filtered by ${activeCard}` : 'All Filtered Leads'}
              </Heading>
              <Badge 
                bg="white" 
                color={THEME_COLORS.primary}
                fontSize="md"
                px={3}
                py={1}
              >
                {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
              </Badge>
            </Flex>
            {activeCard && (
              <Text fontSize="sm" color="white" mt={2}>
                Click the card again to view all leads
              </Text>
            )}
          </Box>

          <Box overflowX="auto">
            <Table variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th color={THEME_COLORS.dark}>Lead Name</Th>
                  <Th color={THEME_COLORS.dark}>Phone</Th>
                  <Th color={THEME_COLORS.dark} display={{ base: 'none', md: 'table-cell' }}>Email</Th>
                  <Th color={THEME_COLORS.dark}>Status</Th>
                  <Th color={THEME_COLORS.dark} display={{ base: 'none', lg: 'table-cell' }}>Source</Th>
                  <Th color={THEME_COLORS.dark} display={{ base: 'none', lg: 'table-cell' }}>Assigned To</Th>
                  <Th color={THEME_COLORS.dark} display={{ base: 'none', sm: 'table-cell' }}>Created Date</Th>
                  <Th color={THEME_COLORS.dark} display={{ base: 'none', lg: 'table-cell' }}>Campaign</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <Tr 
                      key={lead.id} 
                      _hover={{ bg: `${THEME_COLORS.light}20` }}
                      transition="all 0.2s"
                    >
                      <Td fontWeight="medium" color={THEME_COLORS.primary} fontSize={{ base: 'xs', md: 'sm' }} whiteSpace="nowrap">
                        {lead.name}
                      </Td>
                      <Td fontSize={{ base: 'xs', md: 'sm' }} whiteSpace="nowrap">{lead.phone}</Td>
                      <Td fontSize={{ base: 'xs', md: 'sm' }} display={{ base: 'none', md: 'table-cell' }}>{lead.email || '-'}</Td>
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
                          {lead.status.toUpperCase()}
                        </Badge>
                      </Td>
                      <Td display={{ base: 'none', lg: 'table-cell' }}>
                        <Badge 
                          bg={THEME_COLORS.accent}
                          color="white"
                          variant="subtle"
                          fontSize={{ base: 'xs', md: 'sm' }}
                        >
                          {lead.source}
                        </Badge>
                      </Td>
                      <Td color={THEME_COLORS.medium} fontSize={{ base: 'xs', md: 'sm' }} display={{ base: 'none', lg: 'table-cell' }}>{lead.assignedTo?.name || 'Unassigned'}</Td>
                      <Td whiteSpace="nowrap" fontSize={{ base: 'xs', md: 'sm' }} display={{ base: 'none', sm: 'table-cell' }}>{formatDate(lead.createdAt)}</Td>
                      <Td fontSize={{ base: 'xs', md: 'sm' }} display={{ base: 'none', lg: 'table-cell' }}>{lead.campaign || '-'}</Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={8} textAlign="center" py={8}>
                      <Text color={THEME_COLORS.medium}>
                        No leads found for the selected filters
                      </Text>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      {/* Agent Performance Table */}
      <Card boxShadow="lg" borderTop="4px" borderColor={THEME_COLORS.primary} mt={6}>
        <CardBody p={0}>
          <Box p={4} bg={THEME_COLORS.medium} bgGradient={`linear(to-r, ${THEME_COLORS.medium}, ${THEME_COLORS.primary})`} borderTopRadius="lg">
            <Flex justify="space-between" align="center">
              <Heading size="md" color="white">
                Agent Performance Summary
              </Heading>
              <Badge 
                bg="white" 
                color={THEME_COLORS.primary}
                fontSize="md"
                px={3}
                py={1}
              >
                {agentPerformanceData.length} agent{agentPerformanceData.length !== 1 ? 's' : ''}
              </Badge>
            </Flex>
            <Text fontSize="sm" color="white" mt={2}>
              Performance metrics for the selected date range and agent filter
            </Text>
          </Box>

          <Box overflowX="auto">
            <Table variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th color={THEME_COLORS.dark}>Date</Th>
                  <Th color={THEME_COLORS.dark}>Agent</Th>
                  <Th color={THEME_COLORS.dark}>Calls Made</Th>
                  <Th color={THEME_COLORS.dark}>Leads Generated</Th>
                  <Th color={THEME_COLORS.dark}>Conversions</Th>
                  <Th color={THEME_COLORS.dark}>Status/Remarks</Th>
                </Tr>
              </Thead>
              <Tbody>
                {agentPerformanceData.length > 0 ? (
                  agentPerformanceData.map((row, index) => (
                    <Tr 
                      key={`${row.agent}-${index}`} 
                      _hover={{ bg: `${THEME_COLORS.light}20` }}
                      transition="all 0.2s"
                    >
                      <Td fontWeight="medium" fontSize={{ base: 'xs', md: 'sm' }} whiteSpace="nowrap">
                        {formatDate(row.date)}
                      </Td>
                      <Td color={THEME_COLORS.primary} fontWeight="semibold" fontSize={{ base: 'xs', md: 'sm' }}>
                        {row.agent}
                      </Td>
                      <Td fontSize={{ base: 'xs', md: 'sm' }}>
                        <Badge bg={THEME_COLORS.accent} color="white">
                          {row.callsMade}
                        </Badge>
                      </Td>
                      <Td fontSize={{ base: 'xs', md: 'sm' }}>
                        <Badge bg={THEME_COLORS.medium} color="white">
                          {row.leadsGenerated}
                        </Badge>
                      </Td>
                      <Td fontSize={{ base: 'xs', md: 'sm' }}>
                        <Badge 
                          bg={row.conversions > 2 ? THEME_COLORS.accent : row.conversions > 0 ? THEME_COLORS.primary : THEME_COLORS.light}
                          color="white"
                          fontWeight="bold"
                        >
                          {row.conversions}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge
                          bg={
                            row.status === 'Excellent' ? THEME_COLORS.accent :
                            row.status === 'Good' ? THEME_COLORS.primary :
                            row.status === 'Active' ? THEME_COLORS.medium :
                            THEME_COLORS.light
                          }
                          color="white"
                          fontSize={{ base: 'xs', md: 'sm' }}
                        >
                          {row.status}
                        </Badge>
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={6} textAlign="center" py={8}>
                      <Text color={THEME_COLORS.medium}>
                        No agent performance data available for the selected filters
                      </Text>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
}





