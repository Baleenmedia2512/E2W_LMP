'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Spinner,
  Center,
} from '@chakra-ui/react';
import { HiFilter, HiPhone, HiUserAdd, HiClipboardList, HiBan, HiExclamation, HiCheckCircle, HiXCircle, HiClock } from 'react-icons/hi';
import { formatDate } from '@/shared/lib/date-utils';
import { formatPhoneForDisplay } from '@/shared/utils/phone';
import DSRCard from '@/features/dsr/components/DSRCard';
import { useResponsive } from '@/shared/hooks/useResponsive';

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
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
}

interface AgentPerformance {
  agentId: string;
  agentName: string;
  agentEmail: string;
  date: Date;
  callsMade: number;
  leadsGenerated: number;
  conversions: number;
  status: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
}

export default function DSRPage() {
  const toast = useToast();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  // Get today's date and set default date range
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  // State for API data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [apiLeads, setApiLeads] = useState<Lead[]>([]);
  const [agentPerformanceData, setAgentPerformanceData] = useState<AgentPerformance[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // Filter state
  const [startDate, setStartDate] = useState(todayString);
  const [endDate, setEndDate] = useState(todayString);
  const [selectedAgentId, setSelectedAgentId] = useState('all');
  const [isFiltered, setIsFiltered] = useState(false);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRangePreset, setDateRangePreset] = useState('all_time');

  // Temporary state for filters before applying
  const [tempStartDate, setTempStartDate] = useState(todayString);
  const [tempEndDate, setTempEndDate] = useState(todayString);
  const [tempSelectedAgentId, setTempSelectedAgentId] = useState('all');
  const [tempDateRangePreset, setTempDateRangePreset] = useState('all_time');

  // Fetch DSR data from API
  const fetchDSRData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedAgentId !== 'all') params.append('agentId', selectedAgentId);
      
      const response = await fetch(`/api/dsr/stats?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch DSR data');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data.stats);
        setApiLeads(result.data.filteredLeads);
        setAgentPerformanceData(result.data.agentPerformanceData);
        setAgents(result.data.agents);
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching DSR data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast({
        title: 'Error',
        description: 'Failed to fetch DSR data. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchDSRData();
  }, [startDate, endDate, selectedAgentId]);

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
    setSelectedAgentId(tempSelectedAgentId);
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
    setTempSelectedAgentId('all');
    setTempDateRangePreset('all_time');
    setStartDate(todayString);
    setEndDate(todayString);
    setSelectedAgentId('all');
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

  // Filter leads for the table based on active card and search
  const filteredLeads = useMemo(() => {
    if (!apiLeads) return [];
    
    let filtered = [...apiLeads];

    // Apply card-based filters
    if (activeCard === 'newLeads') {
      // Already filtered by API
      filtered = filtered;
    } else if (activeCard === 'unqualified') {
      filtered = filtered.filter(lead => lead.status === 'unqualified');
    } else if (activeCard === 'unreachable') {
      filtered = filtered.filter(lead => lead.status === 'unreach');
    } else if (activeCard === 'win') {
      filtered = filtered.filter(lead => lead.status === 'won');
    } else if (activeCard === 'lose') {
      filtered = filtered.filter(lead => lead.status === 'lost');
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
  }, [apiLeads, activeCard, searchQuery]);

  // Show loading state
  if (loading && !stats) {
    return (
      <Center h="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color={THEME_COLORS.primary} thickness="4px" />
          <Text color={THEME_COLORS.medium}>Loading DSR data...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Box p={{ base: 3, sm: 4, md: 6 }} maxW="100%" overflowX="hidden" bg={{ base: 'gray.50', md: 'transparent' }}>
      <Flex justify="space-between" align="center" mb={{ base: 4, md: 6 }} flexWrap="wrap" gap={3} direction={{ base: 'column', sm: 'row' }}>
        <Heading size={{ base: 'md', md: 'lg' }} color={THEME_COLORS.dark} w={{ base: 'full', sm: 'auto' }} textAlign={{ base: 'center', sm: 'left' }}>
          Daily Sales Report (DSR)
        </Heading>
        {isFiltered && (
          <Badge 
            colorScheme="blue" 
            fontSize={{ base: 'sm', md: 'md' }}
            px={3} 
            py={1}
            bg={THEME_COLORS.primary}
            color="white"
          >
            Filtered Results
          </Badge>
        )}
      </Flex>

      {/* Search Bar and Filters */}
      <Card mb={{ base: 4, md: 6 }} boxShadow={{ base: 'md', md: 'lg' }} borderTop="4px" borderColor={THEME_COLORS.primary} bg="white">
        <CardBody p={{ base: 3, md: 6 }}>
          <VStack spacing={4} align="stretch">
            {/* Search and Filter Row */}
            <Flex gap={3} flexWrap="wrap" align="stretch" direction={{ base: 'column', md: 'row' }}>
              {/* Search Input */}
              <Box flex={{ base: '1', md: '1 1 300px' }} w={{ base: 'full', md: 'auto' }}>
                <Input
                  placeholder="Search name, phone or email"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size={{ base: 'md', md: 'md' }}
                  borderColor={THEME_COLORS.light}
                  _hover={{ borderColor: THEME_COLORS.primary }}
                  _focus={{ borderColor: THEME_COLORS.primary, boxShadow: `0 0 0 1px ${THEME_COLORS.primary}` }}
                  fontSize={{ base: 'sm', md: 'md' }}
                />
              </Box>

              {/* Date Range Preset Dropdown */}
              <Select
                value={tempDateRangePreset}
                onChange={(e) => handleDateRangePresetChange(e.target.value)}
                borderColor={THEME_COLORS.light}
                _hover={{ borderColor: THEME_COLORS.primary }}
                _focus={{ borderColor: THEME_COLORS.primary, boxShadow: `0 0 0 1px ${THEME_COLORS.primary}` }}
                size={{ base: 'md', md: 'md' }}
                w={{ base: 'full', md: 'auto' }}
                maxW={{ base: 'full', md: '180px' }}
                fontSize={{ base: 'sm', md: 'md' }}
              >
                <option value="all_time">All Time</option>
                <option value="today">Today</option>
                <option value="last_week">Last Week</option>
                <option value="last_month">Last Month</option>
                <option value="custom">Custom</option>
              </Select>

              {/* Agent Selector */}
              <Select
                value={tempSelectedAgentId}
                onChange={(e) => setTempSelectedAgentId(e.target.value)}
                borderColor={THEME_COLORS.light}
                _hover={{ borderColor: THEME_COLORS.primary }}
                _focus={{ borderColor: THEME_COLORS.primary, boxShadow: `0 0 0 1px ${THEME_COLORS.primary}` }}
                size={{ base: 'md', md: 'md' }}
                w={{ base: 'full', md: 'auto' }}
                maxW={{ base: 'full', md: '200px' }}
                fontSize={{ base: 'sm', md: 'md' }}
              >
                <option value="all">All Agents</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name || agent.email}
                  </option>
                ))}
              </Select>

              {/* Action Buttons */}
              <HStack spacing={2} w={{ base: 'full', md: 'auto' }}>
                <Button
                  bg={THEME_COLORS.primary}
                  color="white"
                  leftIcon={<HiFilter />}
                  onClick={handleApplyFilters}
                  size={{ base: 'md', md: 'md' }}
                  _hover={{ bg: THEME_COLORS.medium }}
                  _active={{ bg: THEME_COLORS.dark }}
                  flex="1"
                  isLoading={loading}
                  fontSize={{ base: 'sm', md: 'md' }}
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  borderColor={THEME_COLORS.light}
                  color={THEME_COLORS.medium}
                  size={{ base: 'md', md: 'md' }}
                  _hover={{ bg: THEME_COLORS.light, color: 'white' }}
                  flex="1"
                  fontSize={{ base: 'sm', md: 'md' }}
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
                    size={{ base: 'sm', md: 'md' }}
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
                    size={{ base: 'sm', md: 'md' }}
                  />
                </Box>
              </SimpleGrid>
            )}

            {/* Active Filters Info */}
            {(isFiltered || searchQuery) && startDate && endDate && (
              <Box>
                <Divider my={2} borderColor={THEME_COLORS.light} />
                <Text fontSize={{ base: 'xs', md: 'sm' }} color={THEME_COLORS.medium}>
                  Showing results from <strong>{formatDate(new Date(startDate))}</strong> to{' '}
                  <strong>{formatDate(new Date(endDate))}</strong>
                  {selectedAgentId !== 'all' && agents.find(a => a.id === selectedAgentId) && (
                    <> for agent <strong>{agents.find(a => a.id === selectedAgentId)?.name}</strong></>
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

      {/* Stats Grid - Clickable DSR Cards */}
      {stats && (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing={{ base: 4, md: 4 }} mb={{ base: 4, md: 6 }}>
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
            helpText="Needs attention"
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
      )}

      {/* Filtered Leads Table */}
      <Card boxShadow="lg" borderTop="4px" borderColor={THEME_COLORS.primary} mb={{ base: 4, md: 6 }}>
        <CardBody p={0}>
          <Box p={{ base: 3, md: 4 }} bg={THEME_COLORS.light} bgGradient={`linear(to-r, ${THEME_COLORS.light}, ${THEME_COLORS.accent})`} borderTopRadius="lg">
            <Flex justify="space-between" align="center" direction={{ base: 'column', sm: 'row' }} gap={2}>
              <Heading size={{ base: 'sm', md: 'md' }} color="white" textAlign={{ base: 'center', sm: 'left' }}>
                {activeCard ? `Filtered by ${activeCard}` : 'All Filtered Leads'}
              </Heading>
              <Badge 
                bg="white" 
                color={THEME_COLORS.primary}
                fontSize={{ base: 'sm', md: 'md' }}
                px={3}
                py={1}
              >
                {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
              </Badge>
            </Flex>
            {activeCard && (
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="white" mt={2}>
                Click the card again to view all leads
              </Text>
            )}
          </Box>

          <Box 
            overflowX="auto" 
            css={{
              '&::-webkit-scrollbar': {
                height: '8px',
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
              <Thead bg="gray.50">
                <Tr>
                  <Th color={THEME_COLORS.dark}>Lead Name</Th>
                  <Th color={THEME_COLORS.dark}>Phone</Th>
                  <Th color={THEME_COLORS.dark} display={{ base: 'none', md: 'table-cell' }}>Email</Th>
                  <Th color={THEME_COLORS.dark}>Status</Th>
                  <Th color={THEME_COLORS.dark} display={{ base: 'none', lg: 'table-cell' }}>Source</Th>
                  <Th color={THEME_COLORS.dark} display={{ base: 'none', lg: 'table-cell' }}>Assigned To</Th>
                  <Th color={THEME_COLORS.dark} display={{ base: 'none', sm: 'table-cell' }}>Created Date</Th>
                  <Th color={THEME_COLORS.dark} display={{ base: 'none', xl: 'table-cell' }}>Campaign</Th>
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
                      <Td fontSize={{ base: 'xs', md: 'sm' }} whiteSpace="nowrap">{formatPhoneForDisplay(lead.phone)}</Td>
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
                          {lead.status === 'unreach' ? 'UNREACHABLE' : lead.status.toUpperCase()}
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
                      <Td color={THEME_COLORS.medium} fontSize={{ base: 'xs', md: 'sm' }} display={{ base: 'none', lg: 'table-cell' }}>
                        {lead.assignedTo?.name || 'Unassigned'}
                      </Td>
                      <Td whiteSpace="nowrap" fontSize={{ base: 'xs', md: 'sm' }} display={{ base: 'none', sm: 'table-cell' }}>
                        {formatDate(new Date(lead.createdAt))}
                      </Td>
                      <Td fontSize={{ base: 'xs', md: 'sm' }} display={{ base: 'none', xl: 'table-cell' }}>
                        {lead.campaign || '-'}
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={8} textAlign="center" py={8}>
                      <Text color={THEME_COLORS.medium} fontSize={{ base: 'sm', md: 'md' }}>
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
              Performance metrics for the selected date range and agent filter
            </Text>
          </Box>

          <Box 
            overflowX="auto"
            css={{
              '&::-webkit-scrollbar': {
                height: '8px',
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
                      key={`${row.agentId}-${index}`} 
                      _hover={{ bg: `${THEME_COLORS.light}20` }}
                      transition="all 0.2s"
                    >
                      <Td fontWeight="medium" fontSize={{ base: 'xs', md: 'sm' }} whiteSpace="nowrap">
                        {formatDate(new Date(row.date))}
                      </Td>
                      <Td color={THEME_COLORS.primary} fontWeight="semibold" fontSize={{ base: 'xs', md: 'sm' }}>
                        {row.agentName}
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
                      <Text color={THEME_COLORS.medium} fontSize={{ base: 'sm', md: 'md' }}>
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
