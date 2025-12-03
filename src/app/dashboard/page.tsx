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
import { FiUsers, FiPhone, FiCheckCircle, FiClock, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
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
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date.toISOString().split('T')[0] || '';
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0] || '';
  });
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Build API URL with date filters
  const statsUrl = `/api/dashboard/stats?startDate=${startDate}&endDate=${endDate}`;

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

  // Check for overdue followups on mount and periodically
  useEffect(() => {
    const checkOverdueFollowups = async () => {
      try {
        const response = await fetch('/api/cron/check-overdue-followups');
        if (response.ok) {
          console.log('✅ Overdue followups checked');
        }
      } catch (error) {
        console.error('Failed to check overdue followups:', error);
      }
    };

    // Check immediately on mount
    checkOverdueFollowups();

    // Check every 5 minutes while user is active
    const interval = setInterval(checkOverdueFollowups, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

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

  const handleCardClick = (filter: string) => {
    router.push(`/dashboard/leads?filter=${filter}`);
  };

  // Extract data from SWR response
  const stats = data?.data?.stats || {
    totalLeads: 0,
    newLeads: 0,
    qualifiedLeads: 0,
    wonLeads: 0,
    followUpsDue: 0,
    overdue: 0,
    conversionRate: 0,
    winRate: 0,
  };

  const recentLeads = data?.data?.recentLeads || [];
  const upcomingFollowUps = data?.data?.upcomingFollowUps || [];

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
          <Flex gap={3} flexWrap="wrap" align="center">
            <Box>
              <Text fontSize="sm" fontWeight="semibold" mb={2}>
                Start Date
              </Text>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                size="md"
              />
            </Box>
          </Flex>
        </CardBody>
      </Card>

      {/* Stats Grid */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} spacing={{ base: 4, md: 6 }}>
        <StatCard
          label="New Leads"
          value={stats.newLeads}
          helpText="Click to view"
          icon={FiUsers}
          colorScheme="blue"
          onClick={() => handleCardClick('new')}
        />
        <StatCard
          label="Follow-ups Due"
          value={stats.followUpsDue}
          helpText="Due soon"
          icon={FiClock}
          colorScheme="orange"
          onClick={() => router.push('/dashboard/followups')}
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          helpText="Needs attention"
          icon={FiAlertCircle}
          colorScheme="red"
          onClick={() => router.push('/dashboard/followups?filter=overdue')}
        />
        <StatCard
          label="Total Leads"
          value={stats.totalLeads}
          helpText="All leads in system"
          icon={FiPhone}
          colorScheme="purple"
          onClick={() => router.push('/dashboard/leads')}
        />
        <StatCard
          label="Won Today"
          value={stats.wonLeads}
          helpText="Deals closed today"
          icon={FiCheckCircle}
          colorScheme="green"
          onClick={() => handleCardClick('won')}
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
            <StatLabel fontSize="sm">Conversion Rate</StatLabel>
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
            <StatLabel fontSize="sm">Win Rate</StatLabel>
            <StatNumber fontSize="2xl" color="teal.600">{stats.winRate}%</StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">Won / Closed deals</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Today's Follow-ups */}
      {upcomingFollowUps.length > 0 && (
        <Box bg="white" p={{ base: 4, md: 6 }} borderRadius="lg" boxShadow="sm" borderWidth="1px">
          <HStack justify="space-between" mb={4} flexWrap="wrap" gap={2}>
            <Heading size={{ base: 'sm', md: 'md' }}>Upcoming Follow-ups</Heading>
            <Button 
              size="sm" 
              colorScheme="blue" 
              variant="ghost"
              onClick={() => router.push('/dashboard/followups')}
            >
              View All
            </Button>
          </HStack>
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
                    <Tr key={followUp.id} bg={isOverdue ? 'red.50' : 'white'}>
                      <Td>
                        {isValidDate 
                          ? format(scheduledDate, 'dd/MM/yy hh:mm a')
                          : 'Invalid date'
                        }
                      </Td>
                      <Td>
                        <Link href={`/dashboard/leads/${followUp.leadId}`}>
                          <Text color="brand.500" fontWeight="medium" noOfLines={1}>
                            {followUp.lead?.name || 'Unknown Lead'}
                          </Text>
                        </Link>
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
        </Box>
      )}

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
      </Box>
    </VStack>
  );
}





