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
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';

interface ReportsData {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  wonDeals: number;
  lostDeals: number;
  conversionRate: number;
  leadsBySource: Record<string, number>;
  leadsByAgent: Array<{ agent: string; count: number; percentage: number }>;
  leadsByStatus: Record<string, number>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0] || '');
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0] || '');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const [leadsRes, followUpsRes] = await Promise.all([
          fetch('/api/leads?limit=1000'),
          fetch('/api/followups?limit=100'),
        ]);
        
        const leadsData = await leadsRes.json();
        const followUpsData = await followUpsRes.json();
        
        if (leadsData.success && followUpsData.success) {
          let leads = leadsData.data;
          
          // Filter by date range
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          
          leads = leads.filter((lead: any) => {
            const createdDate = new Date(lead.createdAt);
            return createdDate >= start && createdDate <= end;
          });
          
          // Calculate leads by source
          const sourceMap: Record<string, number> = {};
          leads.forEach((lead: any) => {
            sourceMap[lead.source] = (sourceMap[lead.source] || 0) + 1;
          });
          
          // Calculate leads by agent
          const agentMap: Record<string, number> = {};
          leads.forEach((lead: any) => {
            const agentName = lead.assignedTo?.name || 'Unassigned';
            agentMap[agentName] = (agentMap[agentName] || 0) + 1;
          });
          const leadsByAgent = Object.entries(agentMap).map(([agent, count]) => ({
            agent,
            count,
            percentage: leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
          }));
          
          // Calculate leads by status
          const statusMap: Record<string, number> = {};
          leads.forEach((lead: any) => {
            statusMap[lead.status] = (statusMap[lead.status] || 0) + 1;
          });
          
          const stats = {
            totalLeads: leads.length,
            newLeads: leads.filter((l: any) => l.status === 'new').length,
            contactedLeads: leads.filter((l: any) => l.status === 'contacted').length,
            qualifiedLeads: leads.filter((l: any) => l.status === 'qualified').length,
            wonDeals: leads.filter((l: any) => l.status === 'won').length,
            lostDeals: leads.filter((l: any) => l.status === 'lost').length,
            conversionRate: leads.length > 0 ? Math.round((leads.filter((l: any) => l.status === 'won').length / leads.length) * 100) : 0,
            leadsBySource: sourceMap,
            leadsByAgent,
            leadsByStatus: statusMap,
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
  }, [startDate, endDate]);

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
      <Heading size="lg" mb={6}>
        Reports & Analytics
      </Heading>

      {/* Date Range Filter */}
      <Card mb={6}>
        <CardBody>
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
            <Box pt={7}>
              <Text fontSize="sm" color="gray.600">
                Showing data from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
              </Text>
            </Box>
          </HStack>
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

        <Card bg={data.conversionRate >= 50 ? 'green.50' : 'orange.50'} borderWidth="2px" borderColor={data.conversionRate >= 50 ? 'green.200' : 'orange.200'}>
          <CardBody>
            <Stat>
              <StatLabel color={data.conversionRate >= 50 ? 'green.800' : 'orange.800'}>Conversion Rate</StatLabel>
              <StatNumber color={data.conversionRate >= 50 ? 'green.900' : 'orange.900'}>{data.conversionRate}%</StatNumber>
              <StatHelpText color={data.conversionRate >= 50 ? 'green.700' : 'orange.700'}>
                {data.conversionRate >= 50 ? 'Excellent!' : 'Needs improvement'}
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

        <Card bg="gray.50" borderWidth="2px" borderColor="gray.200">
          <CardBody>
            <Stat>
              <StatLabel color="gray.600">Avg Call Duration</StatLabel>
              <StatNumber color="gray.700">-</StatNumber>
              <StatHelpText color="gray.500">Future enhancement</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Secondary Metrics */}
      <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4} mb={6}>
        <Card bg="blue.50">
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="blue.700">New Leads</StatLabel>
              <StatNumber fontSize="2xl" color="blue.900">{data.newLeads}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="purple.50">
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="purple.700">Qualified</StatLabel>
              <StatNumber fontSize="2xl" color="purple.900">{data.qualifiedLeads}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="green.50">
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="green.700">Won Deals</StatLabel>
              <StatNumber fontSize="2xl" color="green.600">{data.wonDeals}</StatNumber>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="red.50">
          <CardBody>
            <Stat>
              <StatLabel fontSize="sm" color="red.700">Lost Deals</StatLabel>
              <StatNumber fontSize="2xl" color="red.600">{data.lostDeals}</StatNumber>
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
                const percentage = data.totalLeads > 0 ? Math.round((count / data.totalLeads) * 100) : 0;
                return (
                  <Box key={source}>
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="sm" fontWeight="medium">{source}</Text>
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
                const percentage = data.totalLeads > 0 ? Math.round((count / data.totalLeads) * 100) : 0;
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





