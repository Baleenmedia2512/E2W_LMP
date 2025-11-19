'use client';

import {
  Box,
  Heading,
  Card,
  CardBody,
  Spinner,
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
  useToast,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

export default function LeadDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const leadId = params?.id as string;

  const { data: lead, error, mutate } = useSWR(
    leadId ? `/api/leads/${leadId}` : null,
    fetcher
  );

  if (status === 'loading' || !lead) {
    return (
      <Box p={8} display="flex" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  if (error) {
    return (
      <Box p={8}>
        <Text color="red.500">Error loading lead: {error.message}</Text>
      </Box>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'blue',
      contacted: 'purple',
      qualified: 'green',
      converted: 'teal',
      lost: 'red',
    };
    return colors[status] || 'gray';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'gray',
      medium: 'yellow',
      high: 'red',
    };
    return colors[priority] || 'gray';
  };

  return (
    <Box p={8}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Lead Details</Heading>
        <HStack>
          <Button onClick={() => router.push(`/dashboard/leads/${leadId}/edit`)}>
            Edit Lead
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Back
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
                <HStack>
                  <Badge colorScheme={getStatusColor(lead.status)}>
                    {lead.status.toUpperCase()}
                  </Badge>
                  <Badge colorScheme={getPriorityColor(lead.priority)}>
                    {lead.priority.toUpperCase()}
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
                  <Text>{new Date(lead.createdAt).toLocaleString()}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Updated At
                  </Text>
                  <Text>{new Date(lead.updatedAt).toLocaleString()}</Text>
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
                <Tab>Call Logs ({lead.callLogs?.length || 0})</Tab>
                <Tab>Follow-ups ({lead.followUps?.length || 0})</Tab>
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

                    {lead.callLogs && lead.callLogs.length > 0 ? (
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
                          {lead.callLogs.map((call: any) => (
                            <Tr key={call.id}>
                              <Td>{new Date(call.startedAt).toLocaleString()}</Td>
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

                    {lead.followUps && lead.followUps.length > 0 ? (
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
                          {lead.followUps.map((followup: any) => (
                            <Tr key={followup.id}>
                              <Td>{new Date(followup.scheduledAt).toLocaleString()}</Td>
                              <Td>
                                <Badge colorScheme={getPriorityColor(followup.priority)}>
                                  {followup.priority}
                                </Badge>
                              </Td>
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
                  <Text color="gray.500">Activity history coming soon...</Text>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
