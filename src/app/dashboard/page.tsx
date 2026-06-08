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
  CardHeader,
  Switch,
  FormControl,
  FormLabel,
  Select,
  useToast,
  useDisclosure,
} from '@chakra-ui/react';
import { FiUsers, FiPhone, FiCheckCircle, FiClock, FiRefreshCw, FiAlertCircle, FiXCircle, FiFilter } from 'react-icons/fi';
import { HiPlus } from 'react-icons/hi';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import AddLeadModal from '@/features/leads/components/AddLeadModal';
import { useAuth } from '@/shared/lib/auth/auth-context';
import { useRoleBasedAccess } from '@/shared/hooks/useRoleBasedAccess';

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
    p={{ base: 4, md: 5 }} 
    borderRadius="lg" 
    boxShadow="sm" 
    borderWidth="1px"
    cursor={onClick ? "pointer" : "default"}
    transition="all 0.2s"
    minW="0"
    _hover={onClick ? { 
      boxShadow: "md", 
      transform: "translateY(-2px)",
      borderColor: `${colorScheme}.500`
    } : {}}
    onClick={onClick}
  >
    <Stat>
      <HStack justify="space-between" mb={{ base: 1, md: 2 }} spacing={2} align="flex-start">
        <StatLabel fontSize={{ base: 'sm', md: 'md' }} fontWeight="medium" color="gray.600" whiteSpace="normal" lineHeight="1.3">
          {label}
        </StatLabel>
        <Icon as={icon} boxSize={{ base: 5, md: 6 }} color={`${colorScheme}.500`} flexShrink={0} />
      </HStack>
      <StatNumber fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold">
        {value}
      </StatNumber>
      {helpText && (
        <StatHelpText fontSize={{ base: 'xs', sm: 'sm' }} color="gray.500" whiteSpace="normal">
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

// User Filter Card Component
const UserFilterCard = ({
  user,
  selectedUserId,
  onUserChange,
  isSuperAgent,
}: {
  user: any;
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
  isSuperAgent: boolean;
}) => {
  // Fetch users list for dropdown
  const { data: usersData } = useSWR('/api/users', fetcher);
  const users = usersData?.data || [];

  // Filter users based on role
  const displayUsers = isSuperAgent 
    ? users // Super Agent sees all users
    : users.filter((u: any) => u.Role?.name !== 'Super Agent'); // Team Lead doesn't see Super Agents

  // Get selected user name for display
  const selectedUser = users.find((u: any) => u.id === selectedUserId);
  const displayText = selectedUserId 
    ? (selectedUserId === user?.id ? 'My Data Only' : selectedUser?.name || 'Selected User')
    : (isSuperAgent ? 'All Users (System-wide)' : 'All Team Members');

  return (
    <Card>
      <CardHeader pb={3}>
        <HStack spacing={2}>
          <Icon as={FiFilter} color="blue.500" />
          <Heading size="sm">Filter by User</Heading>
        </HStack>
      </CardHeader>
      <CardBody pt={0}>
        <HStack spacing={4} flexWrap="wrap">
          <FormControl maxW={{ base: 'full', md: '400px' }}>
            <FormLabel fontSize="sm" mb={2}>View Data For:</FormLabel>
            <Select
              value={selectedUserId || 'all'}
              onChange={(e) => onUserChange(e.target.value === 'all' ? null : e.target.value)}
              size="md"
            >
              <option value="all">
                {isSuperAgent ? '📊 All Users (System-wide)' : '👥 All Team Members'}
              </option>
              <option value={user?.id}>👤 My Data Only</option>
              {displayUsers.length > 0 && (
                <>
                  <option disabled>───────────────</option>
                  {displayUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} {u.Role?.name ? `(${u.Role.name})` : ''}
                    </option>
                  ))}
                </>
              )}
            </Select>
          </FormControl>
          {selectedUserId && (
            <Button
              size="sm"
              variant="ghost"
              colorScheme="blue"
              onClick={() => onUserChange(null)}
              mt={{ base: 0, md: 8 }}
            >
              Clear Filter
            </Button>
          )}
        </HStack>
        <Text fontSize="xs" color="gray.600" mt={3}>
          Currently viewing: <strong>{displayText}</strong>
        </Text>
      </CardBody>
    </Card>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { isSalesAgent, isTeamLead, isSuperAgent } = useRoleBasedAccess();
  const { isOpen: isAddLeadOpen, onOpen: onAddLeadOpen, onClose: onAddLeadClose } = useDisclosure();
  
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
  
  // User filtering state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Auto-set userId for Sales Agents (they can only see their own data)
  useEffect(() => {
    if (isSalesAgent() && user?.id) {
      setSelectedUserId(user.id);
    }
  }, [user?.id, isSalesAgent]);

  // Build API URL with date filters and user filter
  const statsUrl = useMemo(() => {
    const params = new URLSearchParams();
    
    // Add date filters
    if (hasDateFilter && startDate && endDate) {
      params.append('startDate', startDate);
      params.append('endDate', endDate);
    }
    
    // Add user filter
    if (isSalesAgent() && user?.id) {
      // Sales agents must always see only their own data
      params.append('userId', user.id);
    } else if (selectedUserId) {
      // Team Lead or Super Agent filtering by specific user
      params.append('userId', selectedUserId);
    }
    
    const queryString = params.toString();
    return queryString ? `/api/dashboard/stats?${queryString}` : '/api/dashboard/stats';
  }, [hasDateFilter, startDate, endDate, selectedUserId, user?.id, isSalesAgent]);

  // Use SWR for real-time data fetching with auto-refresh
  const { data, error, isLoading, mutate } = useSWR(
    statsUrl,
    fetcher,
    {
      refreshInterval: autoRefresh ? 30000 : 0, // Refresh every 30 seconds when enabled
      revalidateOnFocus: false, // Don't refetch on window focus
      revalidateOnReconnect: true, // Revalidate when reconnecting
      dedupingInterval: 2000, // Dedupe requests within 2 seconds
      errorRetryCount: 3, // Retry up to 3 times on failure
      errorRetryInterval: 1000, // Wait 1 second between retries
      shouldRetryOnError: true, // Enable retry on errors
      onErrorRetry: (error: any, key, config, revalidate, { retryCount }) => {
        // Don't retry on 4xx errors (client errors)
        if (error.status >= 400 && error.status < 500) return;
        // Exponential backoff: 1s, 2s, 4s
        setTimeout(() => revalidate({ retryCount }), 1000 * Math.pow(2, retryCount));
      },
    }
  );

  // Note: Overdue follow-up checks are handled by server-side cron jobs
  // configured in vercel.json or your hosting platform's cron scheduler.
  // These should NOT be called from client-side code as they require authentication.

  // ✅ Meta leads now come via WEBHOOK (push-based) - no manual sync needed!

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
    totalLeadsForDashboard: 0,
    newLeads: 0,
    wonLeads: 0,
    lostLeads: 0,
    unqualifiedLeads: 0,
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
          <Icon as={FiRefreshCw} boxSize={8} color="blue.500" mb={2} className="spin" />
          <Text color="gray.500">Loading dashboard data...</Text>
          {error && <Text fontSize="sm" color="orange.500" mt={2}>Retrying connection...</Text>}
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
    <VStack spacing={{ base: 3, md: 6 }} align="stretch">
      {/* Header */}
      <Flex 
        justify="space-between" 
        align="center" 
        flexWrap="wrap" 
        gap={{ base: 2, md: 3 }}
        direction={{ base: 'column', sm: 'row' }}
        w="full"
      >
        <Heading size={{ base: 'md', md: 'lg' }}>Dashboard</Heading>
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

      {/* User Filter Section - Only for Team Lead and Super Agent */}
      {(isTeamLead() || isSuperAgent()) && (
        <UserFilterCard
          user={user}
          selectedUserId={selectedUserId}
          onUserChange={setSelectedUserId}
          isSuperAgent={isSuperAgent()}
        />
      )}

      {/* Info Badge for Sales Agents */}
      {isSalesAgent() && (
        <Card bg="blue.50" borderColor="blue.200">
          <CardBody py={3}>
            <HStack spacing={2}>
              <Icon as={FiFilter} color="blue.600" />
              <Text fontSize="sm" color="blue.800" fontWeight="medium">
                Showing your assigned leads only
              </Text>
            </HStack>
          </CardBody>
        </Card>
      )}

      {/* Stats Grid */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 3, md: 4, lg: 6 }}>
        <StatCard
          label="Total Leads"
          value={stats.totalLeadsForDashboard}
          helpText="New + Overdue + Today"
          icon={FiUsers}
          colorScheme="purple"
        />
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
      </SimpleGrid>

      {/* Upcoming Follow-ups */}
      <Box bg="white" p={{ base: 3, md: 6 }} borderRadius="lg" boxShadow="sm" borderWidth="1px">
        <Heading size={{ base: 'sm', md: 'md' }} mb={{ base: 3, md: 4 }}>Upcoming Follow-ups</Heading>
        {upcomingFollowUps.length > 0 ? (
          <Box>
            <Text 
              display={{ base: 'block', md: 'none' }} 
              fontSize="xs" 
              color="gray.500" 
              textAlign="center" 
              mb={2}
            >
              ← Scroll horizontally to view all columns →
            </Text>
            <Box 
              overflowX="auto" 
              mx={{ base: -3, md: 0 }}
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
            <Table variant="simple" size={{ base: 'sm', md: 'md' }} minW={{ base: '600px', md: 'auto' }}>
              <Thead>
                <Tr>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} whiteSpace="nowrap">Time</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} whiteSpace="nowrap">Lead</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} whiteSpace="nowrap">Status</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} whiteSpace="nowrap">Notes</Th>
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
                      <Td fontSize={{ base: '9px', sm: 'xs', md: 'sm' }} px={{ base: 1, sm: 2, md: 4 }} py={{ base: 2, md: 3 }} whiteSpace="nowrap">
                        {isValidDate 
                          ? format(scheduledDate, window.innerWidth < 640 ? 'dd-MMM h:mma' : 'dd-MMM-yy hh:mm a')
                          : 'Invalid date'
                        }
                      </Td>
                      <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                        <Text color="brand.500" fontWeight="medium" noOfLines={1}>
                          {followUp.Lead?.name || 'Unknown Lead'}
                        </Text>
                      </Td>
                      <Td px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
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
                      <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                        <Text noOfLines={1}>{followUp.notes || followUp.customerRequirement || '-'}</Text>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
            </Box>
          </Box>
        ) : (
          <Box textAlign="center" py={{ base: 6, md: 8 }}>
            <Text color="gray.500" fontSize={{ base: 'xs', sm: 'sm' }}>No upcoming follow-ups available</Text>
          </Box>
        )}
      </Box>

      {/* Recent Leads */}
      <Box bg="white" p={{ base: 3, md: 6 }} borderRadius="lg" boxShadow="sm" borderWidth="1px">
        <HStack justify="space-between" mb={{ base: 3, md: 4 }} flexWrap="wrap" gap={2}>
          <Heading size={{ base: 'sm', md: 'md' }}>Recent Leads</Heading>
          <Button 
            size={{ base: 'xs', sm: 'sm' }} 
            colorScheme="blue" 
            variant="ghost"
            onClick={() => router.push('/dashboard/leads')}
            fontSize={{ base: 'xs', sm: 'sm' }}
          >
            View All
          </Button>
        </HStack>
        {recentLeads.length > 0 ? (
          <Box overflowX="auto">
            <Table variant="simple" size={{ base: 'sm', md: 'md' }}>
              <Thead>
                <Tr>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Name</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} display="none">Company</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Status</Th>
                  <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Source</Th>
                </Tr>
              </Thead>
              <Tbody>
                {recentLeads.map((lead: any) => (
                  <Tr key={lead.id} _hover={{ bg: 'gray.50' }}>
                    <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                      <Link href={`/dashboard/leads/${lead.id}`}>
                        <Text color="brand.500" fontWeight="medium" noOfLines={1}>
                          {lead.name}
                        </Text>
                      </Link>
                    </Td>
                    <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }} display="none">
                      <Text noOfLines={1}>{lead.company}</Text>
                    </Td>
                    <Td px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                      <Badge colorScheme={getStatusColor(lead.status)} fontSize={{ base: '0.6rem', sm: 'xs' }}>
                        {lead.status}
                      </Badge>
                    </Td>
                    <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                      <Text noOfLines={1}>{lead.source}</Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ) : (
          <Box textAlign="center" py={{ base: 6, md: 8 }}>
            <Text color="gray.500" fontSize={{ base: 'xs', sm: 'sm' }}>
              {hasDateFilter 
                ? `No data available for ${dateRangeLabel === 'Today' ? 'today' : dateRangeLabel.toLowerCase()}` 
                : 'No leads found in the system'}
            </Text>
          </Box>
        )}
      </Box>

      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={onAddLeadClose}
        onSuccess={() => {
          onAddLeadClose();
          mutate();
        }}
      />
    </VStack>
  );
}





