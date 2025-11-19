'use client';

import React, { useEffect } from 'react';
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
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Spinner,
  Center,
  Button,
  Icon,
} from '@chakra-ui/react';
import { FiUsers, FiPhone, FiCheckCircle, FiClock, FiRefreshCw } from 'react-icons/fi';
import { useApi } from '@/lib/swr';
import { Lead, FollowUp } from '@/types';
import { format } from 'date-fns';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DashboardData {
  stats: {
    newLeadsToday: number;
    followUpsDue: number;
    callsToday: number;
    conversionsToday: number;
    totalLeads: number;
    assignedLeads: number;
    unassignedLeads: number;
  };
  recentLeads: Lead[];
  todayFollowUps: FollowUp[];
}

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
    qualified: 'orange',
    converted: 'green',
    lost: 'red',
  };
  return colors[status] || 'gray';
};

export default function DashboardPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useApi<DashboardData>('/api/dashboard');

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      mutate();
    }, 30000);

    return () => clearInterval(interval);
  }, [mutate]);

  const handleCardClick = (filter: string) => {
    router.push(`/dashboard/leads?filter=${filter}`);
  };

  if (isLoading) {
    return (
      <Center h="400px">
        <Spinner size="xl" color="brand.500" thickness="4px" />
      </Center>
    );
  }

  if (error || !data) {
    return (
      <Box bg="white" p={6} borderRadius="lg" textAlign="center">
        <Text color="red.500">Failed to load dashboard data</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <HStack justify="space-between">
        <Heading size="lg">Dashboard</Heading>
        <Button
          leftIcon={<FiRefreshCw />}
          size="sm"
          variant="outline"
          onClick={() => mutate()}
        >
          Refresh
        </Button>
      </HStack>

      {/* Stats Grid - All Clickable */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        <StatCard
          label="New Leads Today"
          value={data.stats.newLeadsToday}
          helpText="Fresh leads - Click to view"
          icon={FiUsers}
          colorScheme="blue"
          onClick={() => handleCardClick('newToday')}
        />
        <StatCard
          label="Follow-ups Due"
          value={data.stats.followUpsDue}
          helpText="Due today - Click to view"
          icon={FiClock}
          colorScheme="orange"
          onClick={() => handleCardClick('followupsToday')}
        />
        <StatCard
          label="Calls Today"
          value={data.stats.callsToday}
          helpText="Total calls made"
          icon={FiPhone}
          colorScheme="purple"
          onClick={() => handleCardClick('callsToday')}
        />
        <StatCard
          label="Conversions Today"
          value={data.stats.conversionsToday}
          helpText="Successful conversions"
          icon={FiCheckCircle}
          colorScheme="green"
          onClick={() => handleCardClick('conversionsToday')}
        />
      </SimpleGrid>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
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
            <StatLabel fontSize="sm">Total Leads</StatLabel>
            <StatNumber>{data.stats.totalLeads}</StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">Click to view all</StatHelpText>
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
          _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
          onClick={() => handleCardClick('assigned')}
        >
          <Stat>
            <StatLabel fontSize="sm">Assigned Leads</StatLabel>
            <StatNumber>{data.stats.assignedLeads}</StatNumber>
            <StatHelpText fontSize="xs" color="gray.500">Click to view assigned</StatHelpText>
          </Stat>
        </Box>
        {data.stats.unassignedLeads > 0 && (
          <Box 
            bg="white" 
            p={6} 
            borderRadius="lg" 
            boxShadow="sm" 
            borderWidth="1px"
            cursor="pointer"
            transition="all 0.2s"
            _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
            onClick={() => handleCardClick('unassigned')}
          >
            <Stat>
              <StatLabel fontSize="sm">Unassigned Leads</StatLabel>
              <StatNumber color="orange.500">{data.stats.unassignedLeads}</StatNumber>
              <StatHelpText fontSize="xs" color="gray.500">Click to view unassigned</StatHelpText>
            </Stat>
          </Box>
        )}
      </SimpleGrid>

      {/* Today's Follow-ups */}
      {data.todayFollowUps.length > 0 && (
        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm" borderWidth="1px">
          <HStack justify="space-between" mb={4}>
            <Heading size="md">Today's Follow-ups</Heading>
            <Button 
              size="sm" 
              colorScheme="blue" 
              variant="ghost"
              onClick={() => router.push('/dashboard/followups')}
            >
              View All
            </Button>
          </HStack>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Time</Th>
                <Th>Lead</Th>
                <Th>Phone</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.todayFollowUps.map((followUp) => (
                <Tr key={followUp.id}>
                  <Td>{format(new Date(followUp.scheduledAt), 'HH:mm')}</Td>
                  <Td>
                    <Link href={`/dashboard/leads/${followUp.leadId}`}>
                      <Text color="brand.500" fontWeight="medium">
                        {followUp.lead?.name}
                      </Text>
                    </Link>
                  </Td>
                  <Td>{followUp.lead?.phone}</Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(followUp.lead?.status || 'new')}>
                      {followUp.lead?.status}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={
                        followUp.priority === 'high'
                          ? 'red'
                          : followUp.priority === 'medium'
                            ? 'orange'
                            : 'gray'
                      }
                    >
                      {followUp.priority}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </VStack>
  );
}
