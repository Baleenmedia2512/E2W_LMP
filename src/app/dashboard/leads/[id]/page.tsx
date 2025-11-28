'use client';

import {
  Box,
  Heading,
  Card,
  CardBody,
  Text,
  Badge,
  SimpleGrid,
  VStack,
  HStack,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { useRouter, useParams } from 'next/navigation';
import { HiArrowLeft } from 'react-icons/hi';
import { formatDate, formatDateTime } from '@/shared/lib/date-utils';
import { useEffect, useState } from 'react';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  alternatePhone?: string;
  source?: string;
  campaign?: string;
  customerRequirement?: string;
  assignedTo?: { id: string; name: string };
  city?: string;
  state?: string;
  pincode?: string;
  address?: string;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CallLog {
  id: string;
  leadId: string;
  duration?: number;
  callStatus?: string;
  remarks?: string;
  createdAt: string;
}

interface FollowUp {
  id: string;
  leadId: string;
  scheduledAt: string;
  status: string;
  notes?: string;
  priority?: string;
}

interface Activity {
  id: string;
  description: string;
  performedBy?: { name: string };
  createdAt: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const leadId = params?.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activityHistory, setActivityHistory] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [leadRes, callsRes, followupsRes, activityRes] = await Promise.all([
          fetch(`/api/leads/${leadId}`),
          fetch(`/api/calls?limit=100`),
          fetch(`/api/followups?limit=100`),
          fetch(`/api/activity?leadId=${leadId}&limit=50`),
        ]);

        if (!leadRes.ok) {
          throw new Error('Lead not found');
        }

        const leadDataResponse = await leadRes.json();
        const callsData = await callsRes.json();
        const followupsData = await followupsRes.json();
        const activityData = await activityRes.json();

        // Extract lead data from response wrapper
        const leadData = leadDataResponse.data || leadDataResponse;
        setLead(leadData);
        
        // Filter calls and followups for this lead
        const leadCalls = Array.isArray(callsData) 
          ? callsData.filter((call: any) => call.leadId === leadId)
          : callsData.data?.filter((call: any) => call.leadId === leadId) || [];
        
        const leadFollowups = Array.isArray(followupsData)
          ? followupsData.filter((fu: any) => fu.leadId === leadId)
          : followupsData.data?.filter((fu: any) => fu.leadId === leadId) || [];

        // Extract activity history
        const activities = Array.isArray(activityData)
          ? activityData
          : activityData.data || [];

        setCallLogs(leadCalls);
        setFollowUps(leadFollowups);
        setActivityHistory(activities);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lead');
        toast({
          title: 'Error',
          description: 'Failed to load lead details',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      fetchData();
    }
  }, [leadId, toast]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'blue',
      followup: 'orange',
      contacted: 'purple',
      qualified: 'cyan',
      unreach: 'pink',
      unqualified: 'gray',
      won: 'green',
      lost: 'red',
    };
    return colors[status] || 'gray';
  };

  const getAttemptBadgeColor = (attempts: number | undefined) => {
    if (!attempts) return 'gray';
    if (attempts <= 3) return 'blue';
    if (attempts <= 6) return 'orange';
    return 'red';
  };

  if (loading) {
    return (
      <Box p={8} display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="lg" color="blue.500" />
          <Text color="gray.600">Loading lead details...</Text>
        </VStack>
      </Box>
    );
  }

  if (error || !lead) {
    return (
      <Box p={8}>
        <VStack spacing={4}>
          <Text color="gray.600" fontSize="lg">
            {error || 'Lead not found'}
          </Text>
          <Button onClick={() => router.back()} colorScheme="blue">
            Go Back
          </Button>
        </VStack>
      </Box>
    );
  }

  const callAttempts = lead?.callAttempts || 0;

  return (
    <Box p={8}>
      <HStack justify="space-between" mb={6} align="flex-start">
        <VStack align="start" spacing={2}>
          <HStack>
            <Button
              leftIcon={<HiArrowLeft />}
              variant="ghost"
              onClick={() => router.back()}
              size="sm"
            >
              Back
            </Button>
          </HStack>
          <Heading size="lg">{lead.name}</Heading>
          <HStack spacing={4} flexWrap="wrap">
      <HStack spacing={4} flexWrap="wrap">
            <Badge colorScheme={getStatusColor(lead.status)} fontSize="md" px={3} py={1}>
              {lead.status.toUpperCase()}
            </Badge>
            <Box bg="blue.50" px={3} py={1} borderRadius="md" display="flex" alignItems="center">
              <Text fontSize="sm" fontWeight="bold" color="blue.700">
                📞 {lead.callAttempts || 0} Call{(lead.callAttempts || 0) !== 1 ? 's' : ''}
              </Text>
            </Box>
          </HStack>
          </HStack>
        </VStack>
        <HStack spacing={2}>
          <Button onClick={() => router.push(`/dashboard/leads/${leadId}/edit`)}>
            Edit Lead
          </Button>
        </HStack>
      </HStack>

      <VStack spacing={6} align="stretch">
        {/* Basic Info Card */}
        <Card>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Heading size="md">{lead.name}</Heading>
                <HStack spacing={2}>
                  <Badge colorScheme={getStatusColor(lead.status)}>
                    {lead.status.toUpperCase()}
                  </Badge>
                  <Badge colorScheme={getAttemptBadgeColor(lead.callAttempts)} fontSize="sm">
                    {lead.callAttempts || 0} Attempts
                  </Badge>
                </HStack>
              </HStack>

              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Phone
                  </Text>
                  <Text>{lead.phone}</Text>
                </Box>

                {lead.email && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.600">
                      Email
                    </Text>
                    <Text>{lead.email}</Text>
                  </Box>
                )}

                {lead.alternatePhone && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.600">
                      Alternate Phone
                    </Text>
                    <Text>{lead.alternatePhone}</Text>
                  </Box>
                )}

                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Source
                  </Text>
                  <Text>{lead.source}</Text>
                </Box>

                {lead.campaign && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.600">
                      Campaign
                    </Text>
                    <Text>{lead.campaign}</Text>
                  </Box>
                )}

                {lead.customerRequirement && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.600">
                      Customer Requirement
                    </Text>
                    <Text>{lead.customerRequirement}</Text>
                  </Box>
                )}

                {lead.assignedTo && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.600">
                      Assigned To
                    </Text>
                    <Text>{lead.assignedTo.name}</Text>
                  </Box>
                )}

                {lead.city && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.600">
                      City
                    </Text>
                    <Text>{lead.city}</Text>
                  </Box>
                )}

                {lead.state && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.600">
                      State
                    </Text>
                    <Text>{lead.state}</Text>
                  </Box>
                )}

                {lead.pincode && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.600">
                      Pincode
                    </Text>
                    <Text>{lead.pincode}</Text>
                  </Box>
                )}
              </SimpleGrid>

              {lead.address && (
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Address
                  </Text>
                  <Text>{lead.address}</Text>
                </Box>
              )}

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Created At
                  </Text>
                  <Text>{formatDateTime(lead.createdAt)}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Updated At
                  </Text>
                  <Text>{formatDateTime(lead.updatedAt)}</Text>
                </Box>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        {/* Activity Tabs */}
        <Card>
          <CardBody>
            <Tabs>
              <TabList>
                <Tab>Call Logs ({callLogs.length})</Tab>
                <Tab>Follow-ups ({followUps.length})</Tab>
                <Tab>Activity History</Tab>
              </TabList>

              <TabPanels>
                {/* Call Logs Tab */}
                <TabPanel>
                  <VStack align="stretch" spacing={4}>
                    <Button
                      colorScheme="blue"
                      size="sm"
                      onClick={() => router.push(`/dashboard/leads/${leadId}/call`)}
                    >
                      + Log New Call
                    </Button>

                    {callLogs && callLogs.length > 0 ? (
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Date</Th>
                            <Th>Duration</Th>
                            <Th>Status</Th>
                            <Th>Remarks</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {callLogs.map((call: CallLog) => (
                            <Tr key={call.id}>
                              <Td>{formatDateTime(call.createdAt)}</Td>
                              <Td>
                                {call.duration
                                  ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                                  : 'N/A'}
                              </Td>
                              <Td>
                                <Badge>{call.callStatus || 'N/A'}</Badge>
                              </Td>
                              <Td>{call.remarks || '-'}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    ) : (
                      <Text color="gray.500">No call logs yet</Text>
                    )}
                  </VStack>
                </TabPanel>

                {/* Follow-ups Tab */}
                <TabPanel>
                  <VStack align="stretch" spacing={4}>
                    <Button
                      colorScheme="blue"
                      size="sm"
                      onClick={() => router.push(`/dashboard/leads/${leadId}/followup`)}
                    >
                      + Schedule Follow-up
                    </Button>

                    {followUps && followUps.length > 0 ? (
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th>Scheduled</Th>
                            <Th>Priority</Th>
                            <Th>Status</Th>
                            <Th>Notes</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {followUps.map((followup: FollowUp) => (
                            <Tr key={followup.id}>
                              <Td>{formatDateTime(followup.scheduledAt)}</Td>
                              <Td>
                                <Badge
                                  colorScheme={
                                    followup.status === 'completed' ? 'green' : 'yellow'
                                  }
                                >
                                  {followup.priority || 'medium'}
                                </Badge>
                              </Td>
                              <Td>{followup.status}</Td>
                              <Td>{followup.notes || '-'}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    ) : (
                      <Text color="gray.500">No follow-ups scheduled</Text>
                    )}
                  </VStack>
                </TabPanel>

                {/* Activity History Tab */}
                <TabPanel>
                  {activityHistory && activityHistory.length > 0 ? (
                    <VStack align="stretch" spacing={3}>
                      {activityHistory.map((activity: any) => (
                        <Box
                          key={activity.id}
                          bg="gray.50"
                          p={3}
                          borderRadius="md"
                          borderLeft="4px"
                          borderColor="blue.500"
                        >
                          <HStack justify="space-between" mb={1}>
                            <Text fontWeight="bold" fontSize="sm">
                              {activity.description}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {formatDateTime(activity.createdAt)}
                            </Text>
                          </HStack>
                          <Text fontSize="sm" color="gray.600">
                            By: {activity.user?.name || 'System'}
                          </Text>
                          {activity.fieldName && (
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              <strong>{activity.fieldName}:</strong> {activity.oldValue || 'none'} → {activity.newValue || 'none'}
                            </Text>
                          )}
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <Text color="gray.500">No activity history yet</Text>
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
