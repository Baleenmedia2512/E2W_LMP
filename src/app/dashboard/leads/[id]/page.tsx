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
  useDisclosure,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  Tooltip,
} from '@chakra-ui/react';
import { useRouter, useParams } from 'next/navigation';
import { HiArrowLeft, HiPencil, HiPhone, HiCalendar, HiRefresh } from 'react-icons/hi';
import { formatDate, formatDateTime } from '@/shared/lib/date-utils';
import { formatPhoneForDisplay } from '@/shared/utils/phone';
import { useEffect, useState } from 'react';
import CallDialerModal from '@/features/leads/components/CallDialerModal';
import ChangeStatusModal from '@/features/leads/components/ChangeStatusModal';
import QuickActionsMenu from '@/shared/components/QuickActionsMenu';
import AssignLeadModal from '@/features/leads/components/AssignLeadModal';
import ConvertToUnreachableModal from '@/features/leads/components/ConvertToUnreachableModal';
import ConvertToUnqualifiedModal from '@/features/leads/components/ConvertToUnqualifiedModal';
import MarkAsWonModal from '@/features/leads/components/MarkAsWonModal';
import MarkAsLostModal from '@/features/leads/components/MarkAsLostModal';
import CallAttemptsModal from '@/shared/components/CallAttemptsModal';

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
  callAttempts?: number;
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
  
  const { isOpen: isCallDialerOpen, onOpen: onCallDialerOpen, onClose: onCallDialerClose } = useDisclosure();
  const { isOpen: isRequalifyOpen, onOpen: onRequalifyOpen, onClose: onRequalifyClose } = useDisclosure();
  const { isOpen: isChangeStatusOpen, onOpen: onChangeStatusOpen, onClose: onChangeStatusClose } = useDisclosure();
  const { isOpen: isAssignOpen, onOpen: onAssignOpen, onClose: onAssignClose } = useDisclosure();
  const { isOpen: isUnreachableOpen, onOpen: onUnreachableOpen, onClose: onUnreachableClose } = useDisclosure();
  const { isOpen: isUnqualifiedOpen, onOpen: onUnqualifiedOpen, onClose: onUnqualifiedClose } = useDisclosure();
  const { isOpen: isWonOpen, onOpen: onWonOpen, onClose: onWonClose } = useDisclosure();
  const { isOpen: isLostOpen, onOpen: onLostOpen, onClose: onLostClose } = useDisclosure();
  const { isOpen: isCallAttemptsOpen, onOpen: onCallAttemptsOpen, onClose: onCallAttemptsClose } = useDisclosure();
  const { isOpen: isRemarksOpen, onOpen: onRemarksOpen, onClose: onRemarksClose } = useDisclosure();

  const [lead, setLead] = useState<Lead | null>(null);
  const [selectedRemark, setSelectedRemark] = useState<string | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activityHistory, setActivityHistory] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requalifyStatus, setRequalifyStatus] = useState<'new' | 'followup'>('new');
  const [requalifyLoading, setRequalifyLoading] = useState(false);

  const handleShowRemark = (remark: string | null) => {
    setSelectedRemark(remark);
    onRemarksOpen();
  };

  // US-8: Auto-reopen Call Dialer Modal if there's unsaved call data after page refresh
  useEffect(() => {
    const unsavedCallKey = `unsaved_call_${leadId}`;
    const savedCallData = localStorage.getItem(unsavedCallKey);
    
    if (savedCallData && !isCallDialerOpen) {
      try {
        const callData = JSON.parse(savedCallData);
        const savedTime = callData.timestamp || 0;
        const hourInMs = 60 * 60 * 1000;
        
        // Only restore if saved within last hour
        if (Date.now() - savedTime < hourInMs) {
          // Open the call dialer modal to restore the call
          onCallDialerOpen();
        } else {
          // Clear stale data
          localStorage.removeItem(unsavedCallKey);
        }
      } catch (error) {
        console.error('Failed to restore call modal:', error);
      }
    }
  }, [leadId, isCallDialerOpen, onCallDialerOpen]);

  // Function to refresh data
  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [leadRes, callsRes, followupsRes, activityRes] = await Promise.all([
        fetch(`/api/leads/${leadId}`, { cache: 'no-store' }),
        fetch(`/api/calls?leadId=${leadId}&limit=100`, { cache: 'no-store' }),
        fetch(`/api/followups?leadId=${leadId}&limit=100`, { cache: 'no-store' }),
        fetch(`/api/activity?leadId=${leadId}&limit=50`, { cache: 'no-store' }),
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
      
      // Extract data arrays from API responses
      const leadCalls = Array.isArray(callsData) 
        ? callsData
        : callsData.data || [];
      
      const leadFollowups = Array.isArray(followupsData)
        ? followupsData
        : followupsData.data || [];

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

  useEffect(() => {
    if (leadId) {
      refreshData();
    }
  }, [leadId, toast]);

  const handleRequalify = async () => {
    if (!lead) return;

    setRequalifyLoading(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: requalifyStatus,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success!',
          description: `${lead.name} has been requalified as ${requalifyStatus}`,
          status: 'success',
          duration: 3000,
        });
        onRequalifyClose();
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        throw new Error('Failed to requalify lead');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to requalify lead',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setRequalifyLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'blue',
      followup: 'orange',
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
              size="lg"
            >
              Back
            </Button>
          </HStack>
          <Heading size="lg">{lead.name}</Heading>
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
        </VStack>
      </HStack>

      {/* Quick Actions Section */}
      <Card mb={6} bg="blue.50" borderColor="blue.200" borderWidth="1px">
        <CardBody>
          <HStack justify="space-between" align="center" flexWrap="wrap" spacing={4}>
            <HStack spacing={3}>
              <Text fontWeight="bold" fontSize="lg" color="blue.900">
                Quick Actions
              </Text>
              {lead && (
                <QuickActionsMenu
                  lead={lead as any}
                  size="md"
                  variant="outline"
                  onAssign={() => onAssignOpen()}
                  onConvertUnreachable={() => onUnreachableOpen()}
                  onConvertUnqualified={() => onUnqualifiedOpen()}
                  onMarkAsWon={() => onWonOpen()}
                  onMarkAsLost={() => onLostOpen()}
                  onLogCall={() => onCallDialerOpen()}
                />
              )}
            </HStack>
            <HStack spacing={3} flexWrap="wrap">
              <Button
                leftIcon={<HiPencil />}
                colorScheme="blue"
                variant="solid"
                size="md"
                onClick={() => router.push(`/dashboard/leads/${leadId}/edit`)}
              >
                Edit Lead
              </Button>
              <Button
                leftIcon={<HiPhone />}
                colorScheme="green"
                variant="solid"
                size="md"
                onClick={onCallDialerOpen}
              >
                Log Call
              </Button>
              <Button
                leftIcon={<HiRefresh />}
                colorScheme="purple"
                variant="outline"
                size="md"
                onClick={onChangeStatusOpen}
              >
                Change Status
              </Button>
              {lead.status === 'unqualified' && (
                <Button
                  leftIcon={<HiRefresh />}
                  colorScheme="purple"
                  variant="solid"
                  size="md"
                  onClick={onRequalifyOpen}
                >
                  Requalify Lead
                </Button>
              )}
            </HStack>
          </HStack>
        </CardBody>
      </Card>

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
                      Remarks
                    </Text>
                    <Text>{lead.customerRequirement}</Text>
                  </Box>
                )}

                {lead.assignedTo && (
                  <Box>
                    <Text fontWeight="bold" fontSize="sm" color="gray.600">
                      Assigned To
                    </Text>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium">{lead.assignedTo.name}</Text>
                      {(lead.assignedTo as any).email && (
                        <Text fontSize="sm" color="gray.500">
                          {(lead.assignedTo as any).email}
                        </Text>
                      )}
                    </VStack>
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
                    {callLogs && callLogs.length > 0 && (
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.600">
                          Showing {callLogs.length} call log{callLogs.length !== 1 ? 's' : ''}
                        </Text>
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="blue"
                          onClick={onCallAttemptsOpen}
                        >
                          View All Attempts
                        </Button>
                      </HStack>
                    )}
                    {callLogs && callLogs.length > 0 ? (
                      <Table size="sm" variant="simple">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th>Date/Time</Th>
                            <Th>Duration</Th>
                            <Th>Status</Th>
                            <Th>Agent</Th>
                            <Th>Remarks</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {callLogs.map((call: any) => {
                            // Helper function for call status display
                            const getCallStatusDisplay = (status: string) => {
                              switch (status) {
                                case 'answer':
                                case 'completed':
                                  return { label: 'Answer', color: 'green' };
                                case 'busy':
                                  return { label: 'Busy', color: 'orange' };
                                case 'wrong_number':
                                case 'ring_not_response':
                                  return { label: 'Wrong Number', color: 'red' };
                                default:
                                  return { label: status || 'N/A', color: 'gray' };
                              }
                            };
                            
                            const statusDisplay = getCallStatusDisplay(call.callStatus);
                            
                            return (
                              <Tr key={call.id}>
                                <Td>{formatDateTime(call.createdAt)}</Td>
                                <Td>
                                  {call.duration
                                    ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                                    : 'N/A'}
                                </Td>
                                <Td>
                                  <Badge colorScheme={statusDisplay.color}>{statusDisplay.label}</Badge>
                                </Td>
                                <Td>
                                  <Text fontSize="sm">
                                    {call.caller?.name || 'N/A'}
                                  </Text>
                                </Td>
                                <Td maxW="300px">
                                  {call.remarks ? (
                                    <Tooltip label="Click to view full text" placement="top" hasArrow>
                                      <Text
                                        noOfLines={2}
                                        fontSize="sm"
                                        cursor="pointer"
                                        onClick={() => handleShowRemark(call.remarks)}
                                        _hover={{ color: 'blue.600' }}
                                      >
                                        {call.remarks}
                                      </Text>
                                    </Tooltip>
                                  ) : (
                                    <Text fontSize="sm" color="gray.400">-</Text>
                                  )}
                                </Td>
                              </Tr>
                            );
                          })}
                        </Tbody>
                      </Table>
                    ) : (
                      <Box textAlign="center" py={8}>
                        <Text color="gray.500" mb={4}>No call logs yet</Text>
                        <Button
                          leftIcon={<HiPhone />}
                          colorScheme="blue"
                          size="sm"
                          onClick={onCallDialerOpen}
                        >
                          Log First Call
                        </Button>
                      </Box>
                    )}
                  </VStack>
                </TabPanel>

                {/* Follow-ups Tab */}
                <TabPanel>
                  <VStack align="stretch" spacing={4}>
                    {followUps && followUps.length > 0 ? (
                      <Table size="sm" variant="simple">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th>Scheduled Date</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {followUps.map((followup: any) => (
                            <Tr key={followup.id}>
                              <Td>{formatDateTime(followup.scheduledAt)}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    ) : (
                      <Box textAlign="center" py={8}>
                        <Text color="gray.500" mb={4}>No follow-ups scheduled</Text>
                        <Button
                          leftIcon={<HiCalendar />}
                          colorScheme="blue"
                          size="sm"
                          onClick={() => router.push(`/dashboard/leads/${leadId}/followup`)}
                        >
                          Schedule First Follow-up
                        </Button>
                      </Box>
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

      {/* Call Dialer Modal */}
      {lead && (
        <CallDialerModal
          isOpen={isCallDialerOpen}
          onClose={() => {
            onCallDialerClose();
            // Refresh data after call
            window.location.reload();
          }}
          leadId={leadId}
          leadName={lead.name}
          leadPhone={lead.phone}
          onOpenUnreachable={onUnreachableOpen}
          onOpenUnqualified={onUnqualifiedOpen}
        />
      )}

      {/* Change Status Modal */}
      {lead && (
        <ChangeStatusModal
          isOpen={isChangeStatusOpen}
          onClose={onChangeStatusClose}
          leadId={leadId}
          leadName={lead.name}
          currentStatus={lead.status}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* Additional Action Modals */}
      {lead && (
        <>
          <AssignLeadModal
            isOpen={isAssignOpen}
            onClose={onAssignClose}
            leadId={lead.id}
            leadName={lead.name}
            currentAssignee={lead.assignedTo?.name}
            onSuccess={() => window.location.reload()}
          />
          
          <ConvertToUnreachableModal
            isOpen={isUnreachableOpen}
            onClose={onUnreachableClose}
            leadId={lead.id}
            leadName={lead.name}
            onSuccess={() => window.location.reload()}
          />
          
          <ConvertToUnqualifiedModal
            isOpen={isUnqualifiedOpen}
            onClose={onUnqualifiedClose}
            leadId={lead.id}
            leadName={lead.name}
            onSuccess={() => window.location.reload()}
          />
          
          <MarkAsWonModal
            isOpen={isWonOpen}
            onClose={onWonClose}
            leadId={lead.id}
            leadName={lead.name}
            onSuccess={() => window.location.reload()}
          />
          
          <MarkAsLostModal
            isOpen={isLostOpen}
            onClose={onLostClose}
            leadId={lead.id}
            leadName={lead.name}
            onSuccess={() => window.location.reload()}
          />
        </>
      )}

      {/* Requalification Modal */}
      <Modal isOpen={isRequalifyOpen} onClose={onRequalifyClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Requalify Lead</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text>
                Change status for <strong>{lead?.name}</strong> back to an active status.
              </Text>
              <FormControl isRequired>
                <FormLabel fontWeight="600">New Status</FormLabel>
                <Select
                  value={requalifyStatus}
                  onChange={(e) => setRequalifyStatus(e.target.value as 'new' | 'followup')}
                >
                  <option value="new">New</option>
                  <option value="followup">Follow-up</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRequalifyClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={handleRequalify}
              isLoading={requalifyLoading}
              loadingText="Requalifying..."
            >
              Requalify Lead
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Call Attempts Modal */}
      {lead && (
        <CallAttemptsModal
          isOpen={isCallAttemptsOpen}
          onClose={onCallAttemptsClose}
          leadId={lead.id}
          leadName={lead.name}
        />
      )}

      {/* Remarks Modal */}
      <Modal isOpen={isRemarksOpen} onClose={onRemarksClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Remarks Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Box 
              bg="gray.50" 
              p={4} 
              borderRadius="md" 
              border="1px solid" 
              borderColor="gray.200"
            >
              <Text fontSize="sm" whiteSpace="pre-wrap">
                {selectedRemark || 'No remarks provided'}
              </Text>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
