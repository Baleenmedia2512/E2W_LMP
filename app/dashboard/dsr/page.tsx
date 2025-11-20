'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Heading,
  HStack,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Select,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  IconButton,
  Card,
  CardBody,
  Badge,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { HiViewGrid, HiViewList } from 'react-icons/hi';

interface DSRMetrics {
  totalCalls: number;
  callsAnswered: number;
  callsNotAnswered: number;
  callsBusy: number;
  leadsContacted: number;
  leadsQualified: number;
  leadsConverted: number;
  followUpsScheduled: number;
  followUpsCompleted: number;
}

interface DSRDataItem {
  userId: string;
  userName: string;
  userEmail: string;
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: DSRMetrics;
}

export default function DSRPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const [viewMode, setViewMode] = useState<'table' | 'tiles'>('table');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportType, setExportType] = useState<'individual' | 'team'>('individual');
  
  const { data: response, isLoading, error } = useSWR<{ data: DSRDataItem[] }>(
    `/api/dsr?startDate=${startDate}&endDate=${endDate}&exportType=${exportType}`,
    fetcher
  );
  
  const dsrData = response?.data || [];

  const handleExport = async () => {
    try {
      const res = await fetch('/api/dsr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, exportType }),
      });
      
      if (res.ok) {
        const result = await res.json();
        toast({
          title: 'Export ready',
          description: 'DSR export has been prepared',
          status: 'success',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export DSR',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // Calculate totals
  const totals = dsrData.reduce(
    (acc, item) => ({
      totalCalls: acc.totalCalls + item.metrics.totalCalls,
      leadsContacted: acc.leadsContacted + item.metrics.leadsContacted,
      leadsQualified: acc.leadsQualified + item.metrics.leadsQualified,
      leadsConverted: acc.leadsConverted + item.metrics.leadsConverted,
      followUpsScheduled: acc.followUpsScheduled + item.metrics.followUpsScheduled,
      followUpsCompleted: acc.followUpsCompleted + item.metrics.followUpsCompleted,
    }),
    {
      totalCalls: 0,
      leadsContacted: 0,
      leadsQualified: 0,
      leadsConverted: 0,
      followUpsScheduled: 0,
      followUpsCompleted: 0,
    }
  );

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="brand.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8}>
        <Text color="red.500">Error loading DSR: {error.message}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Daily Sales Report (DSR)</Heading>
        <Button colorScheme="brand" onClick={handleExport}>
          Export CSV
        </Button>
      </HStack>

      {/* Filters */}
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm" mb={6}>
        <HStack spacing={4}>
          <FormControl>
            <FormLabel>Start Date</FormLabel>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <FormLabel>End Date</FormLabel>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </FormControl>
          {session?.user?.role === 'SuperAgent' && (
            <FormControl>
              <FormLabel>Report Type</FormLabel>
              <Select
                value={exportType}
                onChange={(e) => setExportType(e.target.value as 'individual' | 'team')}
              >
                <option value="individual">Individual</option>
                <option value="team">Team</option>
              </Select>
            </FormControl>
          )}
        </HStack>
      </Box>

      {/* Summary Stats */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mb={8}>
        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Stat>
            <StatLabel>Total Calls</StatLabel>
            <StatNumber>{totals.totalCalls}</StatNumber>
            <StatHelpText>Calls made during period</StatHelpText>
          </Stat>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Stat>
            <StatLabel>Leads Contacted</StatLabel>
            <StatNumber>{totals.leadsContacted}</StatNumber>
            <StatHelpText>Successfully contacted</StatHelpText>
          </Stat>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Stat>
            <StatLabel>Conversions</StatLabel>
            <StatNumber color="green.500">{totals.leadsConverted}</StatNumber>
            <StatHelpText>Leads converted</StatHelpText>
          </Stat>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Stat>
            <StatLabel>Leads Qualified</StatLabel>
            <StatNumber color="blue.500">{totals.leadsQualified}</StatNumber>
            <StatHelpText>Qualified leads</StatHelpText>
          </Stat>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Stat>
            <StatLabel>Follow-ups Scheduled</StatLabel>
            <StatNumber>{totals.followUpsScheduled}</StatNumber>
            <StatHelpText>Total scheduled</StatHelpText>
          </Stat>
        </Box>

        <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
          <Stat>
            <StatLabel>Follow-ups Completed</StatLabel>
            <StatNumber color="purple.500">{totals.followUpsCompleted}</StatNumber>
            <StatHelpText>Completed tasks</StatHelpText>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* Detailed Table */}
      {exportType === 'team' && dsrData.length > 0 && (
        <Box bg="white" borderRadius="lg" boxShadow="sm" overflow="hidden">
          <HStack justify="space-between" p={6} borderBottomWidth="1px">
            <Heading size="md">
              Team Performance Breakdown
            </Heading>
            <HStack spacing={2}>
              <IconButton
                aria-label="Table view"
                icon={<HiViewList />}
                size="sm"
                colorScheme={viewMode === 'table' ? 'blue' : 'gray'}
                variant={viewMode === 'table' ? 'solid' : 'ghost'}
                onClick={() => setViewMode('table')}
              />
              <IconButton
                aria-label="Tiles view"
                icon={<HiViewGrid />}
                size="sm"
                colorScheme={viewMode === 'tiles' ? 'blue' : 'gray'}
                variant={viewMode === 'tiles' ? 'solid' : 'ghost'}
                onClick={() => setViewMode('tiles')}
              />
            </HStack>
          </HStack>
          {viewMode === 'table' ? (
            <Box overflowX="auto">
              <Table variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Agent</Th>
                  <Th isNumeric>Calls</Th>
                  <Th isNumeric>Contacted</Th>
                  <Th isNumeric>Qualified</Th>
                  <Th isNumeric>Converted</Th>
                  <Th isNumeric>Follow-ups</Th>
                </Tr>
              </Thead>
              <Tbody>
                {dsrData.map((item) => (
                  <Tr key={item.userId}>
                    <Td>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="medium">{item.userName}</Text>
                        <Text fontSize="sm" color="gray.500">{item.userEmail}</Text>
                      </VStack>
                    </Td>
                    <Td isNumeric>{item.metrics.totalCalls}</Td>
                    <Td isNumeric>{item.metrics.leadsContacted}</Td>
                    <Td isNumeric>{item.metrics.leadsQualified}</Td>
                    <Td isNumeric>
                      <Text color="green.500" fontWeight="bold">
                        {item.metrics.leadsConverted}
                      </Text>
                    </Td>
                    <Td isNumeric>
                      {item.metrics.followUpsCompleted}/{item.metrics.followUpsScheduled}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          ) : (
            <Box p={6}>
              <Box
                display="grid"
                gridTemplateColumns={{ base: '1fr', md: '1fr 1fr', lg: 'repeat(3, 1fr)' }}
                gap={4}
              >
                {dsrData.map((item) => (
                  <Card key={item.userId} variant="outline">
                    <CardBody>
                      <VStack align="stretch" spacing={4}>
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="bold" fontSize="lg" color="blue.600">
                            {item.userName}
                          </Text>
                          <Text fontSize="sm" color="gray.500">
                            {item.userEmail}
                          </Text>
                        </VStack>
                        
                        <SimpleGrid columns={2} spacing={3}>
                          <Box>
                            <Text fontSize="xs" color="gray.600" fontWeight="semibold">
                              Total Calls
                            </Text>
                            <Text fontSize="xl" fontWeight="bold">
                              {item.metrics.totalCalls}
                            </Text>
                          </Box>
                          
                          <Box>
                            <Text fontSize="xs" color="gray.600" fontWeight="semibold">
                              Contacted
                            </Text>
                            <Text fontSize="xl" fontWeight="bold">
                              {item.metrics.leadsContacted}
                            </Text>
                          </Box>
                          
                          <Box>
                            <Text fontSize="xs" color="gray.600" fontWeight="semibold">
                              Qualified
                            </Text>
                            <Text fontSize="xl" fontWeight="bold" color="blue.500">
                              {item.metrics.leadsQualified}
                            </Text>
                          </Box>
                          
                          <Box>
                            <Text fontSize="xs" color="gray.600" fontWeight="semibold">
                              Converted
                            </Text>
                            <Text fontSize="xl" fontWeight="bold" color="green.500">
                              {item.metrics.leadsConverted}
                            </Text>
                          </Box>
                        </SimpleGrid>
                        
                        <Box pt={2} borderTopWidth="1px">
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.600">
                              Follow-ups
                            </Text>
                            <Badge colorScheme="purple">
                              {item.metrics.followUpsCompleted}/{item.metrics.followUpsScheduled}
                            </Badge>
                          </HStack>
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
