'use client';

import React, { useState, useMemo } from 'react';
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
} from '@chakra-ui/react';
import { FiUsers, FiPhone, FiCheckCircle, FiClock, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { mockLeads, mockFollowUps, mockDashboardStats } from '@/shared/lib/mock-data';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
    contacted: 'purple',
    qualified: 'green',
    unqualified: 'yellow',
    unreachable: 'gray',
    won: 'teal',
    lost: 'red',
  };
  return colors[status] || 'gray';
};

export default function DashboardPage() {
  const router = useRouter();

  // Get today's date and set default date range
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(todayString);
  const [endDate, setEndDate] = useState(todayString);

  const handleCardClick = (filter: string) => {
    router.push(`/dashboard/leads?filter=${filter}`);
  };

  // Filter data based on date range
  const filteredData = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredLeads = mockLeads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= start && leadDate <= end;
    });

    const filteredFollowUps = mockFollowUps.filter(followUp => {
      const followUpDate = new Date(followUp.scheduledFor);
      return followUp.status === 'pending' && followUpDate >= start && followUpDate <= end;
    });

    return { filteredLeads, filteredFollowUps };
  }, [startDate, endDate]);

  const todayFollowUps = filteredData.filteredFollowUps.slice(0, 5);
  const recentLeads = filteredData.filteredLeads.slice(0, 5);

  // Calculate overdue follow-ups
  const now = new Date();
  const overdueFollowUps = mockFollowUps.filter(f => {
    const scheduledDate = new Date(f.scheduledFor);
    return f.status === 'pending' && scheduledDate < now;
  });

  // Calculate stats based on filtered data
  const stats = {
    newLeads: filteredData.filteredLeads.filter(l => l.status === 'new').length,
    qualifiedLeads: filteredData.filteredLeads.filter(l => l.status === 'qualified').length,
    wonDeals: filteredData.filteredLeads.filter(l => l.status === 'won').length,
    totalLeads: filteredData.filteredLeads.length,
    conversionRate: filteredData.filteredLeads.length > 0 
      ? Math.round((filteredData.filteredLeads.filter(l => l.status === 'won').length / filteredData.filteredLeads.length) * 100)
      : 0,
  };

  return (
    <VStack spacing={{ base: 4, md: 6 }} align="stretch">
      {/* Header */}
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>Dashboard</Heading>
        <Button
          leftIcon={<FiRefreshCw />}
          size="sm"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
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
          value={todayFollowUps.length}
          helpText="Due soon"
          icon={FiClock}
          colorScheme="orange"
          onClick={() => handleCardClick('followups')}
        />
        <StatCard
          label="Overdue"
          value={overdueFollowUps.length}
          helpText="Needs attention"
          icon={FiAlertCircle}
          colorScheme="red"
          onClick={() => router.push('/dashboard/followups')}
        />
        <StatCard
          label="Total Leads"
          value={stats.totalLeads}
          helpText="In date range"
          icon={FiPhone}
          colorScheme="purple"
          onClick={() => router.push('/dashboard/leads')}
        />
        <StatCard
          label="Won Deals"
          value={stats.wonDeals}
          helpText={`${stats.conversionRate}% conversion`}
          icon={FiCheckCircle}
          colorScheme="green"
          onClick={() => handleCardClick('won')}
        />
      </SimpleGrid>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 4, md: 6 }}>
        <Box 
          bg="white" 
          p={6} 
          borderRadius="lg" 
          boxShadow="sm" 
          borderWidth="1px"
          cursor="pointer"
          transition="all 0.2s"
          _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
          onClick={() => router.push('/dashboard/leads')}
        >
          <Stat>
            <StatLabel fontSize="sm">Qualified Leads</StatLabel>
            <StatNumber>{stats.qualifiedLeads}</StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">Ready to convert</StatHelpText>
          </Stat>
        </Box>
        <Box 
          bg="white" 
          p={6} 
          borderRadius="lg" 
          boxShadow="sm" 
          borderWidth="1px"
        >
          <Stat>
            <StatLabel fontSize="sm">Avg Response Time</StatLabel>
            <StatNumber fontSize="2xl">{mockDashboardStats.avgResponseTime}</StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">Team performance</StatHelpText>
          </Stat>
        </Box>
        <Box 
          bg="white" 
          p={6} 
          borderRadius="lg" 
          boxShadow="sm" 
          borderWidth="1px"
        >
          <Stat>
            <StatLabel fontSize="sm">Conversion Rate</StatLabel>
            <StatNumber>{stats.conversionRate}%</StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">In selected range</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Today's Follow-ups */}
      {todayFollowUps.length > 0 && (
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
                  <Th display={{ base: 'none', md: 'table-cell' }}>Status</Th>
                  <Th display={{ base: 'none', sm: 'table-cell' }}>Notes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {todayFollowUps.map((followUp) => (
                  <Tr key={followUp.id}>
                    <Td>{format(new Date(followUp.scheduledFor), 'MMM dd, HH:mm')}</Td>
                    <Td>
                      <Link href={`/dashboard/leads/${followUp.leadId}`}>
                        <Text color="brand.500" fontWeight="medium" noOfLines={1}>
                          {followUp.leadName}
                        </Text>
                      </Link>
                    </Td>
                    <Td display={{ base: 'none', md: 'table-cell' }}>
                      <Badge colorScheme={followUp.status === 'pending' ? 'orange' : 'green'}>
                        {followUp.status}
                      </Badge>
                    </Td>
                    <Td display={{ base: 'none', sm: 'table-cell' }}>
                      <Text noOfLines={1} fontSize="sm">{followUp.notes}</Text>
                    </Td>
                  </Tr>
                ))}
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
              {recentLeads.map((lead) => (
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





