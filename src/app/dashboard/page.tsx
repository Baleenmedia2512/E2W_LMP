'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Heading,
  VStack,
  HStack,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Button,
  Icon,
  Input,
  Card,
  CardBody,
  Switch,
  FormControl,
  FormLabel,
  useToast,
} from '@chakra-ui/react';
import { FiUsers, FiPhone, FiCheckCircle, FiClock, FiRefreshCw, FiAlertCircle, FiXCircle } from 'react-icons/fi';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

const StatCard = ({
  label,
  value,
  helpText,
  icon,
  colorScheme = 'brand',
  onClick,
}: {
  label: string;
  value: number;
  helpText?: string;
  icon: React.ElementType;
  colorScheme?: string;
  onClick?: () => void;
}) => (
  <Box 
    bg="white" 
    p={6} 
    borderRadius="lg" 
    boxShadow="sm" 
    borderWidth="1px"
    cursor={onClick ? "pointer" : "default"}
    transition="all 0.2s"
    _hover={onClick ? { 
      boxShadow: "md", 
      transform: "translateY(-2px)",
      borderColor: `${colorScheme}.500`
    } : {}}
    onClick={onClick}
  >
    <Stat>
      <HStack justify="space-between" mb={2}>
        <StatLabel fontSize="sm" fontWeight="medium" color="gray.600">
          {label}
        </StatLabel>
        <Icon as={icon} boxSize={5} color={`${colorScheme}.500`} />
      </HStack>
      <StatNumber fontSize="3xl" fontWeight="bold">
        {value}
      </StatNumber>
      {helpText && (
        <StatHelpText fontSize="sm" color="gray.500">
          {helpText}
        </StatHelpText>
      )}
    </Stat>
  </Box>
);

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'blue',
    qualified: 'green',
    unqualified: 'yellow',
    unreachable: 'gray',
    won: 'teal',
    lost: 'red',
  };
  return colors[status] || 'gray';
};

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to Today
    return new Date().toISOString().split('T')[0] || '';
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0] || '';
  });
  const [dateRangeLabel, setDateRangeLabel] = useState<string>('Today');
  const [hasDateFilter, setHasDateFilter] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Build API URL with date filters (only include dates if filter is active)
  const statsUrl = hasDateFilter && startDate && endDate
    ? `/api/dashboard/stats?startDate=${startDate}&endDate=${endDate}`
    : '/api/dashboard/stats';

  // Use SWR for real-time data fetching with auto-refresh
  const { data, error, isLoading, mutate } = useSWR(
    statsUrl,
    fetcher,
    {
      refreshInterval: autoRefresh ? 30000 : 0, // Refresh every 30 seconds when enabled
      revalidateOnFocus: true, // Revalidate when window regains focus
      revalidateOnReconnect: true, // Revalidate when reconnecting
      dedupingInterval: 2000, // Dedupe requests within 2 seconds
    }
  );

  // Note: Overdue follow-up checks are handled by server-side cron jobs
  // configured in vercel.json or your hosting platform's cron scheduler.
  // These should NOT be called from client-side code as they require authentication.

  // Manual Meta leads sync
  const [isSyncing, setIsSyncing] = useState(false);
  const handleSyncMetaLeads = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/cron/sync-meta-leads');
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Meta Leads Synced',
          description: `Updated ${result.updatedPlaceholders || 0} placeholders, fetched ${result.newLeads || 0} new leads`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        // Refresh dashboard data
        mutate();
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync Meta leads',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Show toast on auto-refresh (only once when enabled)
  useEffect(() => {
    if (autoRefresh) {
      toast({
        title: 'Auto-refresh Enabled',
        description: 'Dashboard will refresh every 30 seconds',
        status: 'info',
        duration: 3000,
        isClosable: true,
        position: 'bottom-right',
      });
    }
  }, [autoRefresh]);

  const handleManualRefresh = () => {
    mutate();
    toast({
      title: 'Refreshing...',
      description: 'Updating dashboard data',
      status: 'info',
      duration: 1500,
      isClosable: true,
      position: 'top-right',
    });
  };

  const setQuickDateRange = (range: 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'last30days') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]!;
    setHasDateFilter(true);
    
    switch (range) {
      case 'today':
        setStartDate(todayStr);
        setEndDate(todayStr);
        setDateRangeLabel('Today');
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0]!;
        setStartDate(yesterdayStr);
        setEndDate(yesterdayStr);
        setDateRangeLabel('Yesterday');
        break;
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6);
        setStartDate(last7.toISOString().split('T')[0]!);
        setEndDate(todayStr);
        setDateRangeLabel('Last 7 Days');
        break;
      case 'thisMonth':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(monthStart.toISOString().split('T')[0]!);
        setEndDate(todayStr);
        setDateRangeLabel('This Month');
        break;
      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 29);
        setStartDate(last30.toISOString().split('T')[0]!);
        setEndDate(todayStr);
        setDateRangeLabel('Last 30 Days');
        break;
    }
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setDateRangeLabel('All Time');
    setHasDateFilter(false);
  };

  const handleCardClick = (filter: string) => {
    // For 'won' status, redirect to outcomes page with today filter
    if (filter === 'won') {
      router.push('/dashboard/leads/outcomes?status=won&date=today');
    } else {
      router.push(`/dashboard/leads?filter=${filter}`);
    }
  };

  // Extract data from SWR response
  const stats = data?.data?.stats || {
    totalLeads: 0,
    newLeads: 0,
    wonLeads: 0,
    lostLeads: 0,
    followUpsDue: 0,
    overdue: 0,
    conversations: 0,
    conversionRate: 0,
    winRate: 0,
  };

  const recentLeads = data?.data?.recentLeads || [];
  const upcomingFollowUps = data?.data?.upcomingFollowUps || [];

  // Dynamic label helper
  const getLabel = (baseLabel: string) => {
    if (!hasDateFilter || dateRangeLabel === 'All Time') {
      return `Total ${baseLabel}`;
    } else if (dateRangeLabel === 'Today') {
      return `${baseLabel} Today`;
    } else if (dateRangeLabel === 'Yesterday') {
      return `${baseLabel} Yesterday`;
    } else {
      return `${baseLabel} (${dateRangeLabel})`;
    }
  };

  if (isLoading && !data) {
    return (
      <VStack spacing={4} align="stretch">
        <Heading size={{ base: 'md', md: 'lg' }}>Dashboard</Heading>
        <Box textAlign="center" py={8}>
          <Text color="gray.500">Loading dashboard data...</Text>
        </Box>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack spacing={4} align="stretch">
        <Heading size={{ base: 'md', md: 'lg' }}>Dashboard</Heading>
        <Box bg="red.50" p={4} borderRadius="lg" color="red.700">
          Failed to load dashboard. Please try refreshing.
        </Box>
      </VStack>
    );
  }

  return (
    <VStack spacing={{ base: 4, md: 6 }} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>Dashboard</Heading>
        <HStack spacing={3} flexWrap="wrap">
          <FormControl display="flex" alignItems="center" width="auto">
            <FormLabel htmlFor="auto-refresh" mb="0" fontSize="sm" mr={2}>
              Auto-refresh
            </FormLabel>
            <Switch
              id="auto-refresh"
              isChecked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              colorScheme="brand"
            />
          </FormControl>
          <Button
            leftIcon={<FiRefreshCw />}
            size="sm"
            variant="outline"
            onClick={handleSyncMetaLeads}
            isLoading={isSyncing}
            colorScheme="blue"
          >
            Sync Meta Leads
          </Button>
          <Button
            leftIcon={<FiRefreshCw />}
            size="sm"
            variant="outline"
            onClick={handleManualRefresh}
            isLoading={isLoading}
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {/* Date Filter */}
      <Card boxShadow="sm">
        <CardBody>
          <VStack align="stretch" spacing={3}>
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Quick Date Range: <Badge colorScheme={hasDateFilter ? 'blue' : 'green'} ml={2}>{dateRangeLabel}</Badge>
              </Text>
              <Flex gap={2} flexWrap="wrap">
                <Button
                  size="sm"
                  colorScheme={dateRangeLabel === 'All Time' ? 'green' : 'gray'}
                  variant={dateRangeLabel === 'All Time' ? 'solid' : 'outline'}
                  onClick={clearDateFilter}
                  fontWeight="bold"
                >
                  All Time
                </Button>
                <Button
                  size="sm"
                  colorScheme={dateRangeLabel === 'Today' ? 'blue' : 'gray'}
                  variant={dateRangeLabel === 'Today' ? 'solid' : 'outline'}
                  onClick={() => setQuickDateRange('today')}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  colorScheme={dateRangeLabel === 'Yesterday' ? 'blue' : 'gray'}
                  variant={dateRangeLabel === 'Yesterday' ? 'solid' : 'outline'}
                  onClick={() => setQuickDateRange('yesterday')}
                >
                  Yesterday
                </Button>
                <Button
                  size="sm"
                  colorScheme={dateRangeLabel === 'Last 7 Days' ? 'blue' : 'gray'}
                  variant={dateRangeLabel === 'Last 7 Days' ? 'solid' : 'outline'}
                  onClick={() => setQuickDateRange('last7days')}
                >
                  Last 7 Days
                </Button>
                <Button
                  size="sm"
                  colorScheme={dateRangeLabel === 'This Month' ? 'blue' : 'gray'}
                  variant={dateRangeLabel === 'This Month' ? 'solid' : 'outline'}
                  onClick={() => setQuickDateRange('thisMonth')}
                >
                  This Month
                </Button>
                <Button
                  size="sm"
                  colorScheme={dateRangeLabel === 'Last 30 Days' ? 'blue' : 'gray'}
                  variant={dateRangeLabel === 'Last 30 Days' ? 'solid' : 'outline'}
                  onClick={() => setQuickDateRange('last30days')}
                >
                  Last 30 Days
                </Button>
              </Flex>
            </Box>
            <Flex gap={3} flexWrap="wrap" align="center">
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  Start Date
                </Text>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setDateRangeLabel('Custom'); setHasDateFilter(true); }}
                  max={endDate}
                  size="md"
                />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  End Date
                </Text>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setDateRangeLabel('Custom'); setHasDateFilter(true); }}
                  min={startDate}
                  size="md"
                />
              </Box>
            </Flex>
          </VStack>
        </CardBody>
      </Card>

      {/* Info Banner for All Time View */}
      {!hasDateFilter && (
        <Box bg="green.50" p={3} borderRadius="md" borderWidth="1px" borderColor="green.200">
          <HStack spacing={2}>
            <Icon as={FiCheckCircle} color="green.600" />
            <Text fontSize="sm" color="green.800" fontWeight="medium">
              Showing total counts across all time. These numbers match your complete leads database.
            </Text>
          </HStack>
        </Box>
      )}

      {/* Stats Grid */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} spacing={{ base: 4, md: 6 }}>
        <StatCard
          label={getLabel('New Arrival')}
          value={stats.newLeads}
          helpText="Leads created"
          icon={FiUsers}
          colorScheme="blue"
          onClick={() => handleCardClick('new')}
        />
        <StatCard
          label={getLabel('Follow-up')}
          value={stats.followUpsDue}
          helpText="Due Today"
          icon={FiClock}
          colorScheme="orange"
          onClick={() => router.push('/dashboard/leads?filter=today')}
        />
        <StatCard
          label={getLabel('Overdue')}
          value={stats.overdue}
          helpText="Leads need attention"
          icon={FiAlertCircle}
          colorScheme="red"
          onClick={() => router.push('/dashboard/leads?filter=overdue')}
        />
        <StatCard
          label={getLabel('Won')}
          value={stats.wonLeads}
          helpText="Deals closed"
          icon={FiCheckCircle}
          colorScheme="green"
          onClick={() => handleCardClick('won')}
        />
        <StatCard
          label={getLabel('Conversations')}
          value={stats.conversations}
          helpText="Calls made"
          icon={FiPhone}
          colorScheme="teal"
          onClick={() => router.push('/dashboard/calls')}
        />
      </SimpleGrid>

      {/* Summary Stats - All Clickable */}
      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={{ base: 4, md: 6 }}>
        <Box 
          bg="white" 
          p={6} 
          borderRadius="lg" 
          boxShadow="sm" 
          borderWidth="1px"
          cursor="pointer"
          transition="all 0.2s"
          _hover={{ boxShadow: "md", transform: "translateY(-2px)", borderColor: "blue.500" }}
          onClick={() => router.push('/dashboard/reports')}
        >
          <Stat>
            <StatLabel fontSize="sm">{getLabel('Conversion Rate')}</StatLabel>
            <StatNumber color="blue.600">{stats.conversionRate}%</StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">Won / Total leads</StatHelpText>
          </Stat>
        </Box>
        <Box 
          bg="white" 
          p={6} 
          borderRadius="lg" 
          boxShadow="sm" 
          borderWidth="1px"
          cursor="pointer"
          transition="all 0.2s"
          _hover={{ boxShadow: "md", transform: "translateY(-2px)", borderColor: "teal.500" }}
          onClick={() => router.push('/dashboard/reports')}
        >
          <Stat>
            <StatLabel fontSize="sm">{getLabel('Win Rate')}</StatLabel>
            <StatNumber fontSize="2xl" color="teal.600">{stats.winRate}%</StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">Won / Closed deals</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Upcoming Follow-ups */}
      <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="lg" boxShadow="sm" borderWidth="1px">
        <Heading size={{ base: 'sm', md: 'md' }} mb={4}>Upcoming Follow-ups</Heading>
        {upcomingFollowUps.length > 0 ? (
          <Box overflowX="auto">
            <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
              <Thead>
                <Tr>
                  <Th>Time</Th>
                  <Th>Lead</Th>
                  <Th display={{ base: 'none', sm: 'table-cell' }}>Status</Th>
                  <Th display={{ base: 'none', md: 'table-cell' }}>Notes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {upcomingFollowUps.map((followUp: any) => {
                  const scheduledDate = followUp.scheduledAt ? new Date(followUp.scheduledAt) : null;
                  const isValidDate = scheduledDate && !isNaN(scheduledDate.getTime());
                  const now = new Date();
                  const isOverdue = isValidDate && scheduledDate < now;
                  
                  return (
                    <Tr 
                      key={followUp.id} 
                      bg={isOverdue ? 'red.50' : 'white'}
                      cursor="pointer"
                      _hover={{ bg: isOverdue ? 'red.100' : 'gray.50' }}
                      onClick={() => router.push(`/dashboard/leads/${followUp.leadId}`)}
                    >
                      <Td>
                        {isValidDate 
                          ? format(scheduledDate, 'dd/MM/yy hh:mm a')
                          : 'Invalid date'
                        }
                      </Td>
                      <Td>
                        <Text color="brand.500" fontWeight="medium" noOfLines={1}>
                          {followUp.lead?.name || 'Unknown Lead'}
                        </Text>
                      </Td>
                      <Td display={{ base: 'none', sm: 'table-cell' }}>
                        {isOverdue ? (
                          <Badge colorScheme="red" fontSize="xs">
                            🔴 Overdue
                          </Badge>
                        ) : (
                          <Badge colorScheme="green" fontSize="xs">
                            ⏰ Upcoming
                          </Badge>
                        )}
                      </Td>
                      <Td display={{ base: 'none', md: 'table-cell' }}>
                        <Text noOfLines={1} fontSize="sm">{followUp.notes || followUp.customerRequirement || '-'}</Text>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        ) : (
          <Box textAlign="center" py={8}>
            <Text color="gray.500" fontSize="sm">No upcoming follow-ups available</Text>
          </Box>
        )}
      </Box>

      {/* Recent Leads */}
      <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="lg" boxShadow="sm" borderWidth="1px">
        <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
          <Heading size={{ base: 'sm', md: 'md' }}>Recent Leads</Heading>
          <Button 
            size="sm" 
            colorScheme="blue" 
            variant="ghost"
            onClick={() => router.push('/dashboard/leads')}
          >
            View All
          </Button>
        </HStack>
        {recentLeads.length > 0 ? (
          <Box overflowX="auto">
            <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th display={{ base: 'none', md: 'table-cell' }}>Company</Th>
                  <Th>Status</Th>
                  <Th display={{ base: 'none', sm: 'table-cell' }}>Source</Th>
                </Tr>
              </Thead>
              <Tbody>
                {recentLeads.map((lead: any) => (
                  <Tr key={lead.id}>
                    <Td>
                      <Link href={`/dashboard/leads/${lead.id}`}>
                        <Text color="brand.500" fontWeight="medium" noOfLines={1}>
                          {lead.name}
                        </Text>
                      </Link>
                    </Td>
                    <Td display={{ base: 'none', md: 'table-cell' }}>{lead.company}</Td>
                    <Td>
                      <Badge colorScheme={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </Td>
                    <Td display={{ base: 'none', sm: 'table-cell' }}>
                      <Text fontSize="sm">{lead.source}</Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ) : (
          <Box textAlign="center" py={8}>
            <Text color="gray.500" fontSize="sm">
              {hasDateFilter 
                ? `No data available for ${dateRangeLabel === 'Today' ? 'today' : dateRangeLabel.toLowerCase()}` 
                : 'No leads found in the system'}
            </Text>
          </Box>
        )}
      </Box>
    </VStack>
  );
}





