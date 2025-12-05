'use client';

import {
  Box,
  Heading,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Progress,
  VStack,
  HStack,
  Text,
  Badge,
  Input,
  Button,
  useToast,
  Flex,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';

interface ReportsData {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  wonDeals: number;
  lostDeals: number;
  conversionRate: number;
  avgCallAttempts: number;
  totalCallAttempts: number;
  avgCallDuration: number;
  totalCallDuration: number;
  leadsBySource: Record<string, number>;
  leadsByAgent: Array<{ agent: string; count: number; percentage: number }>;
  leadsByStatus: Record<string, number>;
  leadsByAttempts: Record<string, number>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // 30 days ago
    return date.toISOString().split('T')[0] || '';
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0] || '');
  const [dateFilterType, setDateFilterType] = useState<'created' | 'updated'>('created');
  const toast = useToast();

  const handleExport = () => {
    toast({
      title: 'Export Feature',
      description: 'Export functionality will be available in future enhancement.',
      status: 'info',
      duration: 3000,
      isClosable: true,
      position: 'top',
    });
  };

      useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const [leadsRes, followUpsRes, callsRes] = await Promise.all([
          fetch('/api/leads?limit=1000'),
          fetch('/api/followups?limit=100'),
          fetch('/api/calls?limit=10000'),
        ]);
        
        const leadsData = await leadsRes.json();
        const followUpsData = await followUpsRes.json();
        const callsData = await callsRes.json();
        
        if (leadsData.success && followUpsData.success && callsData.success) {
          let leads = leadsData.data;
          const followUps = followUpsData.data;
          let calls = callsData.data;
          
          // Filter by date range
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          
          // Filter leads by selected date type (created or updated)
          leads = leads.filter((lead: any) => {
            const dateToCheck = dateFilterType === 'created' 
              ? new Date(lead.createdAt) 
              : new Date(lead.updatedAt);
            return dateToCheck >= start && dateToCheck <= end;
          });

          // Filter calls by date range
          calls = calls.filter((call: any) => {
            const callDate = new Date(call.createdAt);
            return callDate >= start && callDate <= end;
          });

          // Calculate average call duration
          const callsWithDuration = calls.filter((call: any) => call.duration && call.duration > 0);
          const totalCallDuration = callsWithDuration.reduce((sum: number, call: any) => sum + call.duration, 0);
          const avgCallDuration = callsWithDuration.length > 0 
            ? Math.round(totalCallDuration / callsWithDuration.length) 
            : 0;
          
          // Calculate leads by source
          const sourceMap: Record<string, number> = {};
          leads.forEach((lead: any) => {
            sourceMap[lead.source] = (sourceMap[lead.source] || 0) + 1;
          });          // Calculate leads by agent
          const agentMap: Record<string, number> = {};
          leads.forEach((lead: any) => {
            const agentName = lead.assignedTo?.name || 'Unassigned';
            agentMap[agentName] = (agentMap[agentName] || 0) + 1;
          });
          const leadsByAgent = Object.entries(agentMap).map(([agent, count]) => ({
            agent,
            count,
            percentage: leads.length > 0 ? Math.round((count / leads.length) * 100 * 100) / 100 : 0,
          }));
          
          // Calculate leads by status
          const statusMap: Record<string, number> = {};
          leads.forEach((lead: any) => {
            statusMap[lead.status] = (statusMap[lead.status] || 0) + 1;
          });
          
          // Calculate call attempts metrics (US-9)
          const totalCallAttempts = leads.reduce((sum: number, lead: any) => sum + (lead.callAttempts || 0), 0);
          const avgCallAttempts = leads.length > 0 ? Math.round((totalCallAttempts / leads.length) * 10) / 10 : 0;
          
          // Calculate leads by attempts range
          const attemptRanges: Record<string, number> = {
            '0': 0,
            '1-3': 0,
            '4-6': 0,
            '7+': 0,
          };
          leads.forEach((lead: any) => {
            const attempts = lead.callAttempts || 0;
            if (attempts === 0) attemptRanges['0'] = (attemptRanges['0'] || 0) + 1;
            else if (attempts <= 3) attemptRanges['1-3'] = (attemptRanges['1-3'] || 0) + 1;
            else if (attempts <= 6) attemptRanges['4-6'] = (attemptRanges['4-6'] || 0) + 1;
            else attemptRanges['7+'] = (attemptRanges['7+'] || 0) + 1;
          });
          
          const wonCount = leads.filter((l: any) => l.status === 'won').length;
          const lostCount = leads.filter((l: any) => l.status === 'lost').length;
          const totalClosed = wonCount + lostCount;
          
          const stats = {
            totalLeads: leads.length,
            newLeads: leads.filter((l: any) => l.status === 'new').length,
            qualifiedLeads: leads.filter((l: any) => l.status === 'qualified').length,
            wonDeals: wonCount,
            lostDeals: lostCount,
            conversionRate: totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0,
            avgCallAttempts,
            totalCallAttempts,
            avgCallDuration,
            totalCallDuration,
            leadsBySource: sourceMap,
            leadsByAgent,
            leadsByStatus: statusMap,
            leadsByAttempts: attemptRanges,
          };
          setData(stats);
        } else {
          setError('Failed to fetch reports');
        }
      } catch (err) {
        setError('Failed to fetch reports');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [startDate, endDate, dateFilterType]);

  if (loading) {
    return (
      <Box>
        <Heading size="lg" mb={6}>Reports & Analytics</Heading>
        <Text color="gray.500">Loading reports...</Text>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box>
        <Heading size="lg" mb={6}>Reports & Analytics</Heading>
        <Box bg="red.50" p={4} borderRadius="lg" color="red.700">
          {error || 'Failed to load reports'}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
        <Heading size="lg">
          Reports & Analytics
        </Heading>
        <Button 
          colorScheme="blue" 
          size="md"
          onClick={handleExport}
          variant="outline"
        >
          Export Report
        </Button>
      </Flex>

      {/* Date Range Filter */}
      <Card mb={6}>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4} flexWrap="wrap">
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>Start Date</Text>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                  size="md"
                />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>End Date</Text>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  size="md"
                />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>Filter By</Text>
                <HStack spacing={2}>
                  <Button
                    size="md"
                    colorScheme={dateFilterType === 'created' ? 'blue' : 'gray'}
                    variant={dateFilterType === 'created' ? 'solid' : 'outline'}
                    onClick={() => setDateFilterType('created')}
                  >
                    Created Date
                  </Button>
                  <Button
                    size="md"
                    colorScheme={dateFilterType === 'updated' ? 'blue' : 'gray'}
                    variant={dateFilterType === 'updated' ? 'solid' : 'outline'}
                    onClick={() => setDateFilterType('updated')}
                  >
                    Updated Date
                  </Button>
                </HStack>
              </Box>
            </HStack>
            <Box>
              <Text fontSize="sm" color="gray.600">
                Showing leads {dateFilterType === 'created' ? 'created' : 'updated'} from {new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\//g, '-')} to {new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\//g, '-')}
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Key Metrics */}
      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4} mb={6}>
        <Card bg="blue.50" borderWidth="2px" borderColor="blue.200">
          <CardBody>
            <Stat>
              <StatLabel color="blue.800">Total Leads</StatLabel>
              <StatNumber color="blue.900">{data.totalLeads}</StatNumber>
              <StatHelpText color="blue.700">In selected range</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={data.conversionRate >= 50 ? 'green.50' : 'red.50'} borderWidth="2px" borderColor={data.conversionRate >= 50 ? 'green.200' : 'red.200'}>
          <CardBody>
            <Stat>
              <StatLabel color={data.conversionRate >= 50 ? 'green.800' : 'red.800'}>Conversion Rate</StatLabel>
              <StatNumber color={data.conversionRate >= 50 ? 'green.900' : 'red.900'}>{data.conversionRate}%</StatNumber>
              <StatHelpText color={data.conversionRate >= 50 ? 'green.700' : 'red.700'}>
                Won / Closed deals
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="gray.50" borderWidth="2px" borderColor="gray.200">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Total Revenue</StatLabel>
              <StatNumber color="gray.700">-</StatNumber>
              <StatHelpText color="gray.500">Future enhancement</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="purple.50" borderWidth="2px" borderColor="purple.200">
          <CardBody>
            <Stat>
              <StatLabel color="purple.800">Avg Call Duration</StatLabel>
              <StatNumber color="purple.900">
                {Math.floor(data.avgCallDuration / 60)}:{(data.avgCallDuration % 60).toString().padStart(2, '0')}
              </StatNumber>
              <StatHelpText color="purple.700">
                {data.avgCallDuration > 0 ? 'minutes:seconds' : 'No data'}
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Secondary Metrics */}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4} mb={6}>
        <Card bg="blue.50" borderWidth="1px" borderColor="blue.100">
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="blue.700">New Leads</StatLabel>
              <StatNumber fontSize="2xl" color="blue.900">{data.newLeads}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="purple.50" borderWidth="1px" borderColor="purple.100">
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="purple.700">Qualified</StatLabel>
              <StatNumber fontSize="2xl" color="purple.900">{data.qualifiedLeads}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="green.50" borderWidth="1px" borderColor="green.100">
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="green.700">Won Deals</StatLabel>
              <StatNumber fontSize="2xl" color="green.700">{data.wonDeals}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="red.50" borderWidth="1px" borderColor="red.100">
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="red.700">Lost Deals</StatLabel>
              <StatNumber fontSize="2xl" color="red.700">{data.lostDeals}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        {/* Leads by Source */}
        <Card>
          <CardHeader>
            <Heading size="md">Leads by Source</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {Object.entries(data.leadsBySource).map(([source, count]) => {
                const percentage = data.totalLeads > 0 ? Math.round((count / data.totalLeads) * 100 * 100) / 100 : 0;
                return (
                  <Box key={source}>
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="sm" fontWeight="medium" textTransform="capitalize">{source}</Text>
                      <HStack spacing={2}>
                        <Text fontSize="sm" color="gray.600">{count} leads</Text>
                        <Badge colorScheme="blue">{percentage}%</Badge>
                      </HStack>
                    </HStack>
                    <Progress 
                      value={percentage} 
                      size="sm" 
                      colorScheme="blue" 
                      borderRadius="full"
                    />
                  </Box>
                );
              })}
              {Object.keys(data.leadsBySource).length === 0 && (
                <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>No source data available</Text>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Leads by Status Distribution */}
        <Card>
          <CardHeader>
            <Heading size="md">Leads by Status</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              {Object.entries(data.leadsByStatus).map(([status, count]) => {
                const percentage = data.totalLeads > 0 ? Math.round((count / data.totalLeads) * 100 * 100) / 100 : 0;
                const colorScheme = status === 'won' ? 'green' : status === 'lost' ? 'red' : status === 'qualified' ? 'purple' : 'blue';
                return (
                  <Box key={status}>
                    <HStack justify="space-between" mb={1}>
                      <Badge colorScheme={colorScheme} textTransform="capitalize">{status}</Badge>
                      <HStack spacing={2}>
                        <Text fontSize="sm" color="gray.600">{count} leads</Text>
                        <Badge>{percentage}%</Badge>
                      </HStack>
                    </HStack>
                    <Progress 
                      value={percentage} 
                      size="sm" 
                      colorScheme={colorScheme} 
                      borderRadius="full"
                    />
                  </Box>
                );
              })}
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Call Attempts Distribution - US-9 */}
      <Card mb={6}>
        <CardHeader>
          <Heading size="md">Call Attempts Distribution</Heading>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Track follow-through and persistence across leads
          </Text>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            {Object.entries(data.leadsByAttempts).map(([range, count]) => {
              const percentage = data.totalLeads > 0 ? Math.round((count / data.totalLeads) * 100 * 100) / 100 : 0;
              const colorScheme = range === '7+' ? 'red' : range === '4-6' ? 'orange' : range === '1-3' ? 'blue' : 'gray';
              return (
                <Box key={range}>
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Badge colorScheme={colorScheme} fontSize="md" px={2} py={1}>
                        {range === '0' ? 'No Calls' : `${range} Calls`}
                      </Badge>
                      <Text fontWeight="bold" fontSize="xl">{count}</Text>
                    </HStack>
                    <Progress 
                      value={percentage} 
                      size="md" 
                      colorScheme={colorScheme} 
                      borderRadius="full"
                    />
                    <Text fontSize="xs" color="gray.600" textAlign="center">
                      {percentage}% of total leads
                    </Text>
                  </VStack>
                </Box>
              );
            })}
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Leads by Agent Table */}
      <Card>
        <CardHeader>
          <Heading size="md">Leads by Agent</Heading>
        </CardHeader>
        <CardBody>
          <Table variant="simple" size="md">
            <Thead>
              <Tr>
                <Th>Agent Name</Th>
                <Th isNumeric>Lead Count</Th>
                <Th isNumeric>Percentage</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.leadsByAgent.map(({ agent, count, percentage }) => (
                <Tr key={agent}>
                  <Td fontWeight="medium">{agent}</Td>
                  <Td isNumeric>{count}</Td>
                  <Td isNumeric>
                    <HStack justify="flex-end" spacing={2}>
                      <Badge colorScheme="blue">{percentage}%</Badge>
                      <Progress 
                        value={percentage} 
                        size="sm" 
                        colorScheme="blue" 
                        w="100px"
                        borderRadius="full"
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
              {data.leadsByAgent.length === 0 && (
                <Tr>
                  <Td colSpan={3} textAlign="center" py={4}>
                    <Text fontSize="sm" color="gray.500">No agent data available</Text>
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </Box>
  );
}





