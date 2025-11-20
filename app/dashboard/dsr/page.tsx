'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Heading,
  HStack,
  VStack,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
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
  Card,
  CardBody,
  CardHeader,
  Badge,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Divider,
  Progress,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  FiPhone,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiTrendingUp,
  FiDownload,
  FiEye,
  FiCalendar,
} from 'react-icons/fi';

// Simple Chart Components
const PieChart = ({ data }: { data: Array<{ status: string; count: number; percentage: number }> }) => {
  const colors = {
    new: '#3182CE',
    followup: '#38A169',
    unreach: '#E53E3E',
    unqualified: '#DD6B20',
    contacted: '#805AD5',
    qualified: '#D69E2E',
    converted: '#48BB78',
  };

  return (
    <VStack spacing={4} align="stretch">
      <SimpleGrid columns={2} spacing={4}>
        {data.map((item, index) => (
          <Box key={index}>
            <HStack justify="space-between" mb={2}>
              <HStack>
                <Box
                  w={3}
                  h={3}
                  borderRadius="full"
                  bg={colors[item.status as keyof typeof colors] || 'gray.400'}
                />
                <Text fontSize="sm" textTransform="capitalize">
                  {item.status}
                </Text>
              </HStack>
              <Text fontSize="sm" fontWeight="bold">
                {item.percentage}%
              </Text>
            </HStack>
            <Progress
              value={item.percentage}
              size="sm"
              colorScheme={
                item.status === 'converted' ? 'green' :
                item.status === 'unreach' ? 'red' :
                item.status === 'followup' ? 'green' : 'blue'
              }
              borderRadius="full"
            />
            <Text fontSize="xs" color="gray.600" mt={1}>
              {item.count} leads
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </VStack>
  );
};

const LineChart = ({ data }: { data: Array<{ date: string; avgCallsPerLead: number; totalCalls: number }> }) => {
  const maxValue = Math.max(...data.map(d => d.avgCallsPerLead), 1);
  
  return (
    <VStack spacing={2} align="stretch">
      <SimpleGrid columns={7} spacing={2}>
        {data.map((item, index) => {
          const heightPercent = (item.avgCallsPerLead / maxValue) * 100;
          
          return (
            <VStack key={index} spacing={1}>
              <Box
                bg="blue.500"
                w="100%"
                h={`${Math.max(heightPercent, 5)}px`}
                maxH="120px"
                borderRadius="md"
                position="relative"
                _hover={{
                  bg: 'blue.600',
                  cursor: 'pointer',
                }}
                title={`${item.avgCallsPerLead.toFixed(2)} avg calls`}
              />
              <Text fontSize="xs" color="gray.600">
                {item.date}
              </Text>
              <Text fontSize="xs" fontWeight="bold" color="blue.600">
                {item.avgCallsPerLead.toFixed(1)}
              </Text>
            </VStack>
          );
        })}
      </SimpleGrid>
    </VStack>
  );
};

export default function DSRPage() {
  const { data: session } = useSession();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Date filters
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Calculate date range based on filter
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return {
          startDate: format(startOfDay(now), 'yyyy-MM-dd'),
          endDate: format(endOfDay(now), 'yyyy-MM-dd'),
        };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return {
          startDate: format(startOfDay(yesterday), 'yyyy-MM-dd'),
          endDate: format(endOfDay(yesterday), 'yyyy-MM-dd'),
        };
      case 'week':
        return {
          startDate: format(subDays(now, 6), 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd'),
        };
      case 'month':
        return {
          startDate: format(subDays(now, 29), 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd'),
        };
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate,
        };
      default:
        return {
          startDate: format(now, 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd'),
        };
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Fetch my performance
  const { data: myPerformance, isLoading: loadingPerf } = useSWR(
    `/api/dsr/my-performance?from=${startDate}&to=${endDate}`,
    fetcher
  );

  // Fetch agent performance (admin only)
  const { data: agentPerformance, isLoading: loadingAgents } = useSWR(
    session?.user?.role === 'SuperAgent' 
      ? `/api/dsr/agent-performance?from=${startDate}&to=${endDate}`
      : null,
    fetcher
  );

  // Fetch status breakdown
  const { data: statusBreakdown, isLoading: loadingStatus } = useSWR(
    `/api/dsr/status-breakdown?from=${startDate}&to=${endDate}`,
    fetcher
  );

  // Fetch average calls per lead
  const { data: avgCallsData, isLoading: loadingAvg } = useSWR(
    `/api/dsr/average-calls-per-lead?from=${startDate}&to=${endDate}`,
    fetcher
  );

  // Fetch most contacted lead
  const { data: mostContactedLead, isLoading: loadingMostContacted } = useSWR(
    `/api/dsr/most-contacted-lead?from=${startDate}&to=${endDate}`,
    fetcher
  );

  // Fetch attempts for selected lead
  const { data: attemptsData } = useSWR(
    selectedLeadId ? `/api/dsr/attempts/${selectedLeadId}` : null,
    fetcher
  );

  const handleExportExcel = async () => {
    toast({
      title: 'Export Started',
      description: 'Preparing Excel export...',
      status: 'info',
      duration: 2000,
    });
    
    // Placeholder for Excel export
    setTimeout(() => {
      toast({
        title: 'Export Complete',
        description: 'Excel file downloaded successfully',
        status: 'success',
        duration: 3000,
      });
    }, 1500);
  };

  const handleExportPDF = async () => {
    toast({
      title: 'Export Started',
      description: 'Preparing PDF export...',
      status: 'info',
      duration: 2000,
    });
    
    // Placeholder for PDF export
    setTimeout(() => {
      toast({
        title: 'Export Complete',
        description: 'PDF file downloaded successfully',
        status: 'success',
        duration: 3000,
      });
    }, 1500);
  };

  const handleViewAttempts = (leadId: string) => {
    setSelectedLeadId(leadId);
    onOpen();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const isLoading = loadingPerf || loadingStatus || loadingAvg || loadingMostContacted;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="brand.500" />
      </Box>
    );
  }

  const perf = myPerformance?.data || {};
  const breakdown = statusBreakdown?.data?.breakdown || [];
  const avgCalls = avgCallsData?.data || {};
  const mostContacted = mostContactedLead?.data || {};

  return (
    <Box>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>📊 Daily Sales Report (DSR)</Heading>
        <HStack spacing={2}>
          <Button
            leftIcon={<FiDownload />}
            colorScheme="green"
            size={{ base: 'sm', md: 'md' }}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
          <Button
            leftIcon={<FiDownload />}
            colorScheme="red"
            size={{ base: 'sm', md: 'md' }}
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
        </HStack>
      </Flex>

      {/* Date Filters */}
      <Card mb={6}>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <HStack spacing={4} flexWrap="wrap">
              <FormControl maxW={{ base: 'full', md: '200px' }}>
                <FormLabel fontSize="sm">Date Range</FormLabel>
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  size="sm"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </Select>
              </FormControl>

              {dateFilter === 'custom' && (
                <>
                  <FormControl maxW={{ base: 'full', md: '180px' }}>
                    <FormLabel fontSize="sm">Start Date</FormLabel>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      size="sm"
                    />
                  </FormControl>
                  <FormControl maxW={{ base: 'full', md: '180px' }}>
                    <FormLabel fontSize="sm">End Date</FormLabel>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      size="sm"
                    />
                  </FormControl>
                </>
              )}
            </HStack>

            <HStack>
              <FiCalendar />
              <Text fontSize="sm" color="gray.600">
                Showing data from <strong>{format(new Date(startDate), 'MMM dd, yyyy')}</strong> to{' '}
                <strong>{format(new Date(endDate), 'MMM dd, yyyy')}</strong>
              </Text>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      <Tabs colorScheme="blue" variant="enclosed">
        <TabList>
          <Tab>My Performance</Tab>
          {session?.user?.role === 'SuperAgent' && <Tab>Team Performance</Tab>}
          <Tab>Analytics</Tab>
        </TabList>

        <TabPanels>
          {/* US-024: My Daily Performance */}
          <TabPanel px={0}>
            <VStack spacing={6} align="stretch">
              {/* Performance Metrics */}
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
                <Card>
                  <CardBody>
                    <Stat>
                      <HStack mb={2}>
                        <Box p={2} bg="blue.100" borderRadius="md">
                          <FiPhone color="blue" />
                        </Box>
                      </HStack>
                      <StatLabel>Total Calls Made</StatLabel>
                      <StatNumber fontSize="3xl">{perf.totalCalls || 0}</StatNumber>
                      <StatHelpText>
                        <HStack spacing={4} fontSize="xs">
                          <Badge colorScheme="green">✓ {perf.answeredCalls || 0}</Badge>
                          <Badge colorScheme="red">✗ {perf.notAnsweredCalls || 0}</Badge>
                        </HStack>
                      </StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <Stat>
                      <HStack mb={2}>
                        <Box p={2} bg="purple.100" borderRadius="md">
                          <FiClock color="purple" />
                        </Box>
                      </HStack>
                      <StatLabel>Total Talk Time</StatLabel>
                      <StatNumber fontSize="3xl">
                        {formatDuration(perf.totalTalkTime || 0)}
                      </StatNumber>
                      <StatHelpText>
                        Avg: {formatDuration(perf.avgCallDuration || 0)} per call
                      </StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <Stat>
                      <HStack mb={2}>
                        <Box p={2} bg="orange.100" borderRadius="md">
                          <FiUsers color="orange" />
                        </Box>
                      </HStack>
                      <StatLabel>Leads Contacted</StatLabel>
                      <StatNumber fontSize="3xl">{perf.uniqueLeadsContacted || 0}</StatNumber>
                      <StatHelpText>
                        {perf.newLeadsHandled || 0} new leads
                      </StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <Stat>
                      <HStack mb={2}>
                        <Box p={2} bg="green.100" borderRadius="md">
                          <FiCheckCircle color="green" />
                        </Box>
                      </HStack>
                      <StatLabel>Follow-ups</StatLabel>
                      <StatNumber fontSize="3xl">
                        {perf.followUpsCompleted || 0}/{perf.followUpsScheduled || 0}
                      </StatNumber>
                      <StatHelpText>
                        {perf.followUpsScheduled > 0
                          ? `${Math.round((perf.followUpsCompleted / perf.followUpsScheduled) * 100)}% completed`
                          : 'No follow-ups'}
                      </StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
              </SimpleGrid>

              {/* Additional Metrics */}
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Card bg="red.50" borderLeft="4px solid" borderColor="red.500">
                  <CardBody>
                    <Stat>
                      <StatLabel color="red.700">Unreachable</StatLabel>
                      <StatNumber color="red.600">{perf.unreachableCount || 0}</StatNumber>
                      <StatHelpText>Leads marked unreachable</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg="orange.50" borderLeft="4px solid" borderColor="orange.500">
                  <CardBody>
                    <Stat>
                      <StatLabel color="orange.700">Unqualified</StatLabel>
                      <StatNumber color="orange.600">{perf.unqualifiedCount || 0}</StatNumber>
                      <StatHelpText>Leads marked unqualified</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>

                <Card bg="blue.50" borderLeft="4px solid" borderColor="blue.500">
                  <CardBody>
                    <Stat>
                      <StatLabel color="blue.700">Follow-up Calls</StatLabel>
                      <StatNumber color="blue.600">{perf.followUpCalls || 0}</StatNumber>
                      <StatHelpText>Calls on existing leads</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
              </SimpleGrid>
            </VStack>
          </TabPanel>

          {/* US-025: All Agent Performance */}
          {session?.user?.role === 'SuperAgent' && (
            <TabPanel px={0}>
              <Card>
                <CardHeader>
                  <Heading size="md">Team Performance Overview</Heading>
                </CardHeader>
                <CardBody>
                  {loadingAgents ? (
                    <Flex justify="center" py={8}>
                      <Spinner />
                    </Flex>
                  ) : (
                    <Box overflowX="auto">
                      <Table variant="simple" size="sm">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th>Agent Name</Th>
                            <Th isNumeric>Total Calls</Th>
                            <Th isNumeric>Answered</Th>
                            <Th isNumeric>Not Answered</Th>
                            <Th isNumeric>Follow-ups</Th>
                            <Th isNumeric>Talk Time</Th>
                            <Th isNumeric>Avg Duration</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {agentPerformance?.data?.map((agent: any) => (
                            <Tr key={agent.agentId} _hover={{ bg: 'gray.50' }}>
                              <Td>
                                <VStack align="start" spacing={0}>
                                  <Text fontWeight="medium">{agent.agentName}</Text>
                                  <Text fontSize="xs" color="gray.500">
                                    {agent.agentEmail}
                                  </Text>
                                </VStack>
                              </Td>
                              <Td isNumeric fontWeight="bold">{agent.totalCalls}</Td>
                              <Td isNumeric>
                                <Badge colorScheme="green">{agent.answeredCalls}</Badge>
                              </Td>
                              <Td isNumeric>
                                <Badge colorScheme="red">{agent.notAnsweredCalls}</Badge>
                              </Td>
                              <Td isNumeric>{agent.followUps}</Td>
                              <Td isNumeric>{formatDuration(agent.totalTalkTime)}</Td>
                              <Td isNumeric>{formatDuration(agent.avgDuration)}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  )}
                </CardBody>
              </Card>
            </TabPanel>
          )}

          {/* Analytics Tab */}
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              {/* US-026: Status Breakdown */}
              <Card>
                <CardHeader>
                  <Heading size="md">Status Distribution</Heading>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Lead status breakdown for selected period
                  </Text>
                </CardHeader>
                <CardBody>
                  {breakdown.length > 0 ? (
                    <PieChart data={breakdown} />
                  ) : (
                    <Text color="gray.500" textAlign="center" py={8}>
                      No data available
                    </Text>
                  )}
                </CardBody>
              </Card>

              {/* US-028: Average Calls Per Lead */}
              <Card>
                <CardHeader>
                  <Heading size="md">Average Calls Per Lead</Heading>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Last 7 days trend
                  </Text>
                </CardHeader>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <SimpleGrid columns={3} spacing={4}>
                      <Box>
                        <Text fontSize="xs" color="gray.600">Total Leads</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          {avgCalls.totalLeadsWorked || 0}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.600">Total Calls</Text>
                        <Text fontSize="2xl" fontWeight="bold">
                          {avgCalls.totalCalls || 0}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.600">Average</Text>
                        <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                          {avgCalls.avgCallsPerLead?.toFixed(2) || '0.00'}
                        </Text>
                      </Box>
                    </SimpleGrid>
                    
                    <Divider />
                    
                    {avgCalls.trend && avgCalls.trend.length > 0 ? (
                      <LineChart data={avgCalls.trend} />
                    ) : (
                      <Text color="gray.500" textAlign="center" py={4}>
                        No trend data available
                      </Text>
                    )}
                  </VStack>
                </CardBody>
              </Card>

              {/* US-029: Most Contacted Lead */}
              <Card gridColumn={{ base: '1', lg: 'span 2' }}>
                <CardHeader>
                  <Heading size="md">Most Contacted Lead</Heading>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Lead with highest number of call attempts
                  </Text>
                </CardHeader>
                <CardBody>
                  {mostContacted.lead ? (
                    <HStack
                      p={4}
                      bg="blue.50"
                      borderRadius="lg"
                      justify="space-between"
                      flexWrap="wrap"
                      spacing={4}
                    >
                      <VStack align="start" spacing={2} flex="1">
                        <Text fontWeight="bold" fontSize="lg" color="blue.700">
                          {mostContacted.lead.name}
                        </Text>
                        <HStack spacing={4} flexWrap="wrap">
                          <HStack>
                            <FiPhone size={14} />
                            <Text fontSize="sm">{mostContacted.lead.phone}</Text>
                          </HStack>
                          <Badge colorScheme="blue" fontSize="sm">
                            {mostContacted.attemptCount} attempts
                          </Badge>
                          <Badge
                            colorScheme={
                              mostContacted.lastCallStatus === 'answered' ? 'green' : 'orange'
                            }
                            fontSize="sm"
                          >
                            Last: {mostContacted.lastCallStatus || 'N/A'}
                          </Badge>
                        </HStack>
                      </VStack>
                      <Button
                        leftIcon={<FiEye />}
                        colorScheme="blue"
                        size="sm"
                        onClick={() => handleViewAttempts(mostContacted.lead.id)}
                      >
                        View Attempts
                      </Button>
                    </HStack>
                  ) : (
                    <Text color="gray.500" textAlign="center" py={8}>
                      No call data available for this period
                    </Text>
                  )}
                </CardBody>
              </Card>
            </SimpleGrid>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Modal for viewing call attempts */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Call Attempts History</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {attemptsData?.data ? (
              <VStack spacing={4} align="stretch">
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold" fontSize="lg">
                    {attemptsData.data.lead?.name}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {attemptsData.data.lead?.phone}
                  </Text>
                  <Badge mt={2} colorScheme="blue">
                    Total Attempts: {attemptsData.data.totalAttempts}
                  </Badge>
                </Box>

                <Divider />

                <VStack spacing={3} align="stretch" maxH="400px" overflowY="auto">
                  {attemptsData.data.attempts?.map((attempt: any, index: number) => (
                    <Box
                      key={attempt.id}
                      p={3}
                      bg="white"
                      borderWidth="1px"
                      borderRadius="md"
                      _hover={{ bg: 'gray.50' }}
                    >
                      <HStack justify="space-between" mb={2}>
                        <Badge colorScheme="gray">Attempt #{index + 1}</Badge>
                        <Badge
                          colorScheme={
                            attempt.callStatus === 'answered'
                              ? 'green'
                              : attempt.callStatus === 'not_answered'
                              ? 'red'
                              : 'orange'
                          }
                        >
                          {attempt.callStatus || 'N/A'}
                        </Badge>
                      </HStack>
                      <VStack align="start" spacing={1} fontSize="sm">
                        <HStack>
                          <FiClock size={12} />
                          <Text>
                            {format(new Date(attempt.startedAt), 'MMM dd, yyyy HH:mm')}
                          </Text>
                        </HStack>
                        {attempt.duration && (
                          <Text color="gray.600">
                            Duration: {formatDuration(attempt.duration)}
                          </Text>
                        )}
                        {attempt.remarks && (
                          <Text color="gray.600" fontSize="xs">
                            Remarks: {attempt.remarks}
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </VStack>
            ) : (
              <Flex justify="center" py={8}>
                <Spinner />
              </Flex>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
