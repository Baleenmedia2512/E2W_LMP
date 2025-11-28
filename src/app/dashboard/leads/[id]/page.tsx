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
} from '@chakra-ui/react';
import { useRouter, useParams } from 'next/navigation';
import { HiArrowLeft } from 'react-icons/hi';
import { getLeadById, mockCallLogs, mockFollowUps, getActivityHistory, getCallAttemptsForLead, initializeActivityHistory } from '@/shared/lib/mock-data';
import { formatDate, formatDateTime } from '@/lib/date-utils';
import { useEffect } from 'react';

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params?.id as string;

  useEffect(() => {
    initializeActivityHistory();
  }, []);

  const lead = getLeadById(leadId);

  if (!lead) {
    return (
      <Box p={8}>
        <VStack spacing={4}>
          <Text color="gray.600" fontSize="lg">
            Lead not found
          </Text>
          <Button onClick={() => router.back()} colorScheme="blue">
            Go Back
          </Button>
        </VStack>
      </Box>
    );
  }

  // Get related data
  const leadCallLogs = mockCallLogs.filter(call => call.leadId === leadId);
  const leadFollowUps = mockFollowUps.filter(followup => followup.leadId === leadId);
  const activityHistory = getActivityHistory(leadId);
  const callAttempts = getCallAttemptsForLead(leadId);

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
            <Badge colorScheme={getStatusColor(lead.status)} fontSize="md" px={3} py={1}>
              {lead.status.toUpperCase()}
            </Badge>
            <Box bg="blue.50" px={3} py={1} borderRadius="md">
              <Text fontSize="sm" fontWeight="bold" color="blue.700">
                📞 {callAttempts} Call Attempt{callAttempts !== 1 ? 's' : ''}
              </Text>
            </Box>
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
                <Badge colorScheme={getStatusColor(lead.status)}>
                  {lead.status.toUpperCase()}
                </Badge>
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

              {lead.notes && (
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Notes
                  </Text>
                  <Text>{lead.notes}</Text>
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
                <Tab>Call Logs ({leadCallLogs.length})</Tab>
                <Tab>Follow-ups ({leadFollowUps.length})</Tab>
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

                    {leadCallLogs && leadCallLogs.length > 0 ? (
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
                          {leadCallLogs.map((call: any) => (
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

                    {leadFollowUps && leadFollowUps.length > 0 ? (
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
                          {leadFollowUps.map((followup: any) => (
                            <Tr key={followup.id}>
                              <Td>{formatDateTime(followup.scheduledFor)}</Td>
                              <Td>
                                <Badge
                                  colorScheme={
                                    followup.status === 'completed' ? 'green' : 'yellow'
                                  }
                                >
                                  {followup.status}
                                </Badge>
                              </Td>
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
                            By: {activity.performedBy?.name || 'System'}
                          </Text>
                          {activity.fieldName && (
                            <Text fontSize="xs" color="gray.500" mt={1}>
                              {activity.fieldName}: {activity.oldValue} → {activity.newValue}
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
