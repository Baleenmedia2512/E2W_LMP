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
  Input,
  Textarea,
} from '@chakra-ui/react';
import { useRouter, useParams } from 'next/navigation';
import { HiArrowLeft, HiPencil, HiPhone, HiCalendar, HiRefresh } from 'react-icons/hi';
import { formatDate, formatDateTime } from '@/shared/lib/date-utils';
import { formatPhoneForDisplay } from '@/shared/utils/phone';
import { useEffect, useState } from 'react';
import { useLeadDetailData } from '@/shared/hooks/useLeadsData';
import { LeadCardSkeleton } from '@/shared/components/SkeletonLoaders';
import CallDialerModal from '@/features/leads/components/CallDialerModal';
import ChangeStatusModal from '@/features/leads/components/ChangeStatusModal';
import QuickActionsMenu from '@/shared/components/QuickActionsMenu';
import AssignLeadModal from '@/features/leads/components/AssignLeadModal';
import ConvertToUnreachableModal from '@/features/leads/components/ConvertToUnreachableModal';
import ConvertToUnqualifiedModal from '@/features/leads/components/ConvertToUnqualifiedModal';
import MarkAsWonModal from '@/features/leads/components/MarkAsWonModal';
import MarkAsLostModal from '@/features/leads/components/MarkAsLostModal';
import CallAttemptsModal from '@/shared/components/CallAttemptsModal';
import CallRecordingPlayer from '@/shared/components/CallRecordingPlayer';

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
  recordingUrl?: string;
  recordingStatus?: string;
  caller?: { name: string };
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
  const { isOpen: isRescheduleWonOpen, onOpen: onRescheduleWonOpen, onClose: onRescheduleWonClose } = useDisclosure();

  // Fetch all lead data using SWR for instant cached loading
  const {
    lead,
    callLogs,
    followUps,
    activities: activityHistory,
    isLoading,
    isValidating,
    error: fetchError,
    refreshAll,
    mutateLead,
  } = useLeadDetailData(leadId);
  
  const [selectedRemark, setSelectedRemark] = useState<string | null>(null);
  const [requalifyStatus, setRequalifyStatus] = useState<'new' | 'followup'>('new');
  const [requalifyLoading, setRequalifyLoading] = useState(false);
  
  // Reschedule Won Lead states
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  // Show error toast if fetch fails
  useEffect(() => {
    if (fetchError) {
      toast({
        title: 'Error',
        description: 'Failed to load lead details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [fetchError, toast]);

  const handleShowRemark = (remark: string | null) => {
    setSelectedRemark(remark);
    onRemarksOpen();
  };

  // Helper for optimistic updates using SWR's mutate
  const optimisticUpdate = (updateFn: (currentLead: Lead) => Partial<Lead>) => {
    if (!lead) return;
    
    // Optimistically update UI immediately
    mutateLead({ ...lead, ...updateFn(lead) }, false);
    
    // Revalidate in background after 100ms
    setTimeout(() => refreshAll(), 100);
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
        // Optimistic update
        optimisticUpdate(() => ({ status: requalifyStatus }));
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

  const handleRescheduleWon = async () => {
    if (!lead || !rescheduleDate || !rescheduleTime) {
      toast({
        title: 'Error',
        description: 'Please select date and time for follow-up',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setRescheduleLoading(true);
    try {
      // Combine date and time
      const scheduledAt = new Date(`${rescheduleDate}T${rescheduleTime}`);
      
      // Check if scheduled time is in the future
      const now = new Date();
      if (scheduledAt <= now) {
        toast({
          title: 'Invalid Date/Time',
          description: 'Follow-up date and time must be in the future',
          status: 'error',
          duration: 3000,
        });
        setRescheduleLoading(false);
        return;
      }

      // Create follow-up with allowWonOverride flag
      const followUpResponse = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          scheduledAt: scheduledAt.toISOString(),
          notes: rescheduleNotes || 'Rescheduled follow-up for won lead',
          customerRequirement: rescheduleNotes || 'Follow-up for previously won deal',
          allowWonOverride: true, // Special flag to allow rescheduling won leads
        }),
      });

      const followUpData = await followUpResponse.json();

      if (followUpResponse.ok) {
        toast({
          title: 'Success',
          description: `Follow-up scheduled for ${lead.name}. Lead status changed to Follow-up.`,
          status: 'success',
          duration: 4000,
        });
        
        // Reset form
        setRescheduleDate('');
        setRescheduleTime('09:00');
        setRescheduleNotes('');
        onRescheduleWonClose();
        
        // Optimistic update
        optimisticUpdate(() => ({ status: 'followup' }));
      } else {
        throw new Error(followUpData.error || 'Failed to schedule follow-up');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule follow-up',
        status: 'error',
        duration: 3000,
      });
      console.error(error);
    } finally {
      setRescheduleLoading(false);
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

  // Show skeleton loader only on TRUE initial load (no cached data)
  if (isLoading && !lead) {
    return (
      <Box p={8}>
        <VStack spacing={6} align="stretch">
          <LeadCardSkeleton />
          <LeadCardSkeleton />
          <LeadCardSkeleton />
        </VStack>
      </Box>
    );
  }

  if (fetchError || !lead) {
    return (
      <Box p={8}>
        <VStack spacing={4}>
          <Text color="gray.600" fontSize="lg">
           {fetchError?.message || 'Lead not found'}
          </Text>
          <Button onClick={() => router.back()} colorScheme="blue">
            Go Back
          </Button>
        </VStack>
      </Box>
    );
  }

  const callAttempts = lead?.callAttempts || 0;

  // Get next followup - prioritize upcoming future followups
  const nextFollowUp = followUps && followUps.length > 0 
    ? (() => {
        const now = new Date();
        
        // Separate future and past followups
        const futureFollowUps = followUps.filter((fu: any) => new Date(fu.scheduledAt) >= now);
        const pastFollowUps = followUps.filter((fu: any) => new Date(fu.scheduledAt) < now);
        
        // Prefer earliest future followup
        if (futureFollowUps.length > 0) {
          return futureFollowUps.reduce((earliest: any, current: any) => {
            const earliestDate = new Date(earliest.scheduledAt);
            const currentDate = new Date(current.scheduledAt);
            return currentDate < earliestDate ? current : earliest;
          });
        }
        
        // If no future followups, return most recent overdue one
        if (pastFollowUps.length > 0) {
          return pastFollowUps.reduce((latest: any, current: any) => {
            const latestDate = new Date(latest.scheduledAt);
            const currentDate = new Date(current.scheduledAt);
            return currentDate > latestDate ? current : latest;
          });
        }
        
        return null;
      })()
    : null;

  // Calculate if followup is overdue
  const isOverdue = nextFollowUp ? new Date(nextFollowUp.scheduledAt) < new Date() : false;
  
  // Format time difference
  const formatTimeDiff = (date: string) => {
    const now = new Date();
    const scheduled = new Date(date);
    const diff = Math.abs(now.getTime() - scheduled.getTime());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  return (
    <Box p={8}>
      {/* Subtle indicator for background data refresh */}
      {isValidating && lead && (
        <Box 
          position="fixed" 
          top={4} 
          right={4} 
          bg="blue.50" 
          px={3} 
          py={2} 
          borderRadius="md" 
          boxShadow="md"
          zIndex={10}
          display="flex"
          alignItems="center"
          gap={2}
        >
          <HiRefresh className="spin-animation" color="blue.500" />
          <Text fontSize="sm" color="blue.700">Updating...</Text>
        </Box>
      )}
      
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
              {lead.status === 'unreach' ? 'UNREACHABLE' : lead.status.toUpperCase()}
            </Badge>
            <Box bg="blue.50" px={3} py={1} borderRadius="md" display="flex" alignItems="center">
              <Text fontSize="sm" fontWeight="bold" color="blue.700">
                📞 {lead.callAttempts || 0} Call{(lead.callAttempts || 0) !== 1 ? 's' : ''}
              </Text>
            </Box>
          </HStack>
          {nextFollowUp && !['unqualified', 'unreach', 'won', 'lost'].includes(lead.status) && (
            <Box 
              bg={isOverdue ? "red.50" : "orange.50"} 
              px={3} 
              py={2} 
              borderRadius="md" 
              borderWidth="1px"
              borderColor={isOverdue ? "red.200" : "orange.200"}
            >
              <VStack align="start" spacing={1}>
                <HStack spacing={2}>
                  <Text fontSize="xs" fontWeight="bold" color={isOverdue ? "red.700" : "orange.700"}>
                    Next Followup:
                  </Text>
                  {isOverdue && (
                    <Badge colorScheme="red" fontSize="xs">
                      Overdue by {formatTimeDiff(nextFollowUp.scheduledAt)}
                    </Badge>
                  )}
                </HStack>
                <Text fontSize="sm" fontWeight="medium" color={isOverdue ? "red.800" : "orange.800"}>
                  {formatDateTime(nextFollowUp.scheduledAt)}
                </Text>
                {nextFollowUp.notes && (
                  <Text fontSize="xs" color="gray.600" noOfLines={1}>
                    Note: {nextFollowUp.notes}
                  </Text>
                )}
              </VStack>
            </Box>
          )}
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
              {lead.status === 'won' && (
                <Button
                  leftIcon={<HiCalendar />}
                  colorScheme="orange"
                  variant="solid"
                  size="md"
                  onClick={onRescheduleWonOpen}
                >
                  Reschedule Follow-up
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
                <Heading size="md" color={lead.is_existing ? "green.600" : "blue.600"}>{lead.name}</Heading>
                <HStack spacing={2}>
                  <Badge colorScheme={getStatusColor(lead.status)}>
                    {lead.status === 'unreach' ? 'UNREACHABLE' : lead.status.toUpperCase()}
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

              {nextFollowUp && !['unqualified', 'unreach', 'won', 'lost'].includes(lead.status) && (
                <Box 
                  bg={isOverdue ? "red.50" : "orange.50"} 
                  p={3} 
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={isOverdue ? "red.200" : "orange.200"}
                >
                  <VStack align="stretch" spacing={2}>
                    <HStack spacing={2}>
                      <Text fontWeight="bold" fontSize="sm" color={isOverdue ? "red.700" : "orange.700"}>
                        Next Followup:
                      </Text>
                      {isOverdue && (
                        <Badge colorScheme="red" fontSize="xs">
                          Overdue by {formatTimeDiff(nextFollowUp.scheduledAt)}
                        </Badge>
                      )}
                    </HStack>
                    <Text fontSize="sm" fontWeight="medium" color={isOverdue ? "red.800" : "orange.800"}>
                      {formatDateTime(nextFollowUp.scheduledAt)}
                    </Text>
                    {nextFollowUp.notes && (
                      <Box>
                        <Text fontSize="xs" fontWeight="bold" color="gray.600">
                          Note:
                        </Text>
                        <Text fontSize="sm" color="gray.700">
                          {nextFollowUp.notes}
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </Box>
              )}
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
                      <HStack justify="space-between" flexWrap="wrap" gap={2}>
                        <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.600">
                          Showing {callLogs.length} call log{callLogs.length !== 1 ? 's' : ''}
                        </Text>
                        <Button
                          size={{ base: 'xs', sm: 'sm' }}
                          variant="outline"
                          colorScheme="blue"
                          onClick={onCallAttemptsOpen}
                        >
                          View All Attempts
                        </Button>
                      </HStack>
                    )}
                    {callLogs && callLogs.length > 0 ? (
                      <Box overflowX="auto" mx={{ base: -4, md: 0 }}>
                        <Table size={{ base: 'sm', md: 'sm' }} variant="simple">
                          <Thead bg="gray.50">
                            <Tr>
                              <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Date/Time</Th>
                              <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Duration</Th>
                              <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Status</Th>
                              <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Agent</Th>
                              <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Recording</Th>
                              <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Remarks</Th>
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
                                <Tr key={call.id} _hover={{ bg: 'gray.50' }}>
                                  <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }} whiteSpace="nowrap">
                                    {formatDateTime(call.createdAt)}
                                  </Td>
                                  <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }} whiteSpace="nowrap">
                                    {call.duration
                                      ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
                                      : 'N/A'}
                                  </Td>
                                  <Td px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                                    <Badge colorScheme={statusDisplay.color} fontSize={{ base: '0.6rem', sm: 'xs' }}>{statusDisplay.label}</Badge>
                                  </Td>
                                  <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                                    <Text fontSize={{ base: 'xs', sm: 'sm' }} noOfLines={1}>
                                      {call.caller?.name || 'N/A'}
                                    </Text>
                                  </Td>
                                  <Td px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }} minW="180px">
                                    <CallRecordingPlayer
                                      recordingUrl={call.recordingUrl}
                                      recordingStatus={call.recordingStatus}
                                      callDuration={call.duration}
                                    />
                                  </Td>
                                  <Td maxW={{ base: '120px', sm: '200px', md: '300px' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                                    {call.remarks ? (
                                      <Tooltip label="Click to view full text" placement="top" hasArrow>
                                        <Text
                                          noOfLines={2}
                                          fontSize={{ base: 'xs', sm: 'sm' }}
                                          cursor="pointer"
                                          onClick={() => handleShowRemark(call.remarks)}
                                          _hover={{ color: 'blue.600' }}
                                        >
                                          {call.remarks}
                                        </Text>
                                      </Tooltip>
                                    ) : (
                                      <Text fontSize={{ base: 'xs', sm: 'sm' }} color="gray.400">-</Text>
                                    )}
                                  </Td>
                                </Tr>
                              );
                            })}
                          </Tbody>
                        </Table>
                      </Box>
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
                      <Box overflowX="auto" mx={{ base: -4, md: 0 }}>
                        <Table size={{ base: 'sm', md: 'sm' }} variant="simple">
                          <Thead bg="gray.50">
                            <Tr>
                              <Th fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }}>Scheduled Date</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {followUps.map((followup: any) => (
                              <Tr key={followup.id} _hover={{ bg: 'gray.50' }}>
                                <Td fontSize={{ base: 'xs', sm: 'sm' }} px={{ base: 2, md: 4 }} py={{ base: 2, md: 3 }}>
                                  {formatDateTime(followup.scheduledAt)}
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
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
                            By: {activity.User?.name || 'System'}
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
          onClose={onCallDialerClose}
          leadId={leadId}
          leadName={lead.name}
          leadPhone={lead.phone}
          leadSource={lead.source}
          leadCampaign={lead.campaign}
          onOpenUnreachable={onUnreachableOpen}
          onOpenUnqualified={onUnqualifiedOpen}
          onSuccess={() => {
            // Optimistic update
            optimisticUpdate((current) => ({
              callAttempts: (current.callAttempts || 0) + 1
            }));
          }}
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
          onSuccess={(newStatus?: string) => {
            // Optimistic update
            if (newStatus) {
              optimisticUpdate(() => ({ status: newStatus }));
            }
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
            onSuccess={() => {
              // Background refresh
              setTimeout(() => refreshAll(), 100);
            }}
          />
          
          <ConvertToUnreachableModal
            isOpen={isUnreachableOpen}
            onClose={onUnreachableClose}
            leadId={lead.id}
            leadName={lead.name}
            onSuccess={() => {
              optimisticUpdate(() => ({ status: 'unreach' }));
            }}
          />
          
          <ConvertToUnqualifiedModal
            isOpen={isUnqualifiedOpen}
            onClose={onUnqualifiedClose}
            leadId={lead.id}
            leadName={lead.name}
            onSuccess={() => {
              optimisticUpdate(() => ({ status: 'unqualified' }));
            }}
          />
          
          <MarkAsWonModal
            isOpen={isWonOpen}
            onClose={onWonClose}
            leadId={lead.id}
            leadName={lead.name}
            onSuccess={() => {
              optimisticUpdate(() => ({ status: 'won' }));
            }}
          />
          
          <MarkAsLostModal
            isOpen={isLostOpen}
            onClose={onLostClose}
            leadId={lead.id}
            leadName={lead.name}
            onSuccess={() => {
              optimisticUpdate(() => ({ status: 'lost' }));
            }}
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

      {/* Reschedule Won Lead Modal */}
      <Modal isOpen={isRescheduleWonOpen} onClose={onRescheduleWonClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reschedule Follow-up for Won Lead</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box bg="orange.50" p={3} borderRadius="md" borderWidth="1px" borderColor="orange.200">
                <Text fontSize="sm" color="orange.800">
                  ⚠️ This lead was marked as <strong>WON</strong>. Scheduling a follow-up will change the status back to <strong>Follow-up</strong>.
                  The previous won status will be recorded in the lead notes.
                </Text>
              </Box>
              <Text>
                Schedule a follow-up for <strong>{lead?.name}</strong>
              </Text>
              <FormControl isRequired>
                <FormLabel fontWeight="600">Follow-up Date</FormLabel>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontWeight="600">Follow-up Time</FormLabel>
                <Input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontWeight="600">Notes (Optional)</FormLabel>
                <Textarea
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="Enter follow-up notes or reason for rescheduling..."
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRescheduleWonClose}>
              Cancel
            </Button>
            <Button
              colorScheme="orange"
              onClick={handleRescheduleWon}
              isLoading={rescheduleLoading}
              loadingText="Scheduling..."
            >
              Schedule Follow-up
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
