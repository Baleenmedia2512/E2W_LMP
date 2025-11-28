'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  IconButton,
  Input,
  Textarea,
  Select,
  FormControl,
  FormLabel,
  Badge,
  useToast,
  Divider,
} from '@chakra-ui/react';
import { HiPhone, HiPhoneIncoming, HiX, HiArrowLeft } from 'react-icons/hi';
import { formatDate } from '@/shared/lib/date-utils';
import { useAuth } from '@/shared/lib/auth/auth-context';

interface CallDialerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  leadPhone: string;
}

type CallPhase = 'dialing' | 'calling' | 'ended' | 'next-action';

export default function CallDialerModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  leadPhone,
}: CallDialerModalProps) {
  const toast = useToast();
  const { user } = useAuth();
  const [callPhase, setCallPhase] = useState<CallPhase>('dialing');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(0);
  const [callTimer, setCallTimer] = useState(0);

  // Form state
  const [callStatus, setCallStatus] = useState<'completed' | 'busy' | 'ring_not_response'>('completed');
  const [remarks, setRemarks] = useState('');
  const [remarksInitialized, setRemarksInitialized] = useState(false);
  const [followUpTimeframe, setFollowUpTimeframe] = useState<'1hour' | 'tomorrow' | '1week' | '1month' | 'custom'>('tomorrow');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpPriority, setFollowUpPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [nextAction, setNextAction] = useState<'followup' | 'unqualified' | 'unreachable' | null>(null);
  const [callSaved, setCallSaved] = useState(false);

  // Timer effect for active call
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callPhase === 'calling' && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        setCallTimer(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callPhase, startTime]);

  // Format timer display
  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartCall = () => {
    const now = new Date();
    setStartTime(now);
    setCallPhase('calling');
    
    // Simulate opening phone dialer
    if (typeof window !== 'undefined') {
      window.open(`tel:${leadPhone}`, '_self');
    }
  };

  const handleEndCall = () => {
    const now = new Date();
    setEndTime(now);
    if (startTime) {
      const durationInSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setDuration(durationInSeconds);
    }
    setCallPhase('ended');
  };

  const handleSaveCall = async () => {
    if (!startTime || !endTime) {
      toast({
        title: 'Error',
        description: 'Call times are missing',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!user || !user.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      // Save call log via API
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          callerId: user.id,
          startedAt: startTime,
          endedAt: endTime,
          duration,
          callStatus,
          remarks: remarks || 'No remarks',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Call Logged',
          description: 'Call has been saved successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Mark call as saved and move to next action selection
        setCallSaved(true);
        setCallPhase('next-action');
      } else {
        throw new Error('Failed to save call');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save call log',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(error);
    }
  };

  const handleNextAction = async (action: 'followup' | 'unqualified' | 'unreachable') => {
    if (!callSaved) {
      toast({
        title: 'Error',
        description: 'Please save call details first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setNextAction(action);
    
    if (action === 'followup') {
      // Stay in modal and show follow-up form
      setCallPhase('ended');
    } else if (action === 'unqualified') {
      // Update lead status to unqualified via API
      try {
        await fetch(`/api/leads/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'unqualified',
            notes: remarks,
          }),
        });
        
        toast({
          title: 'Lead Marked as Unqualified',
          description: `${leadName} has been marked as unqualified`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        handleClose();
      } catch (error) {
        console.error('Failed to update lead:', error);
      }
    } else if (action === 'unreachable') {
      // Update lead status to unreachable via API
      try {
        await fetch(`/api/leads/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'unreach',
            notes: remarks,
          }),
        });
        
        toast({
          title: 'Lead Marked as Unreachable',
          description: `${leadName} has been marked as unreachable`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        handleClose();
      } catch (error) {
        console.error('Failed to update lead:', error);
      }
    }
  };

  const handleSkipNextAction = () => {
    handleClose();
  };

  const handleBackToNextAction = () => {
    setNextAction(null);
    setCallPhase('next-action');
  };

  const handleSaveFollowUp = async () => {
    let scheduledDateTime: Date;

    if (followUpTimeframe === 'custom') {
      if (!followUpDate) {
        toast({
          title: 'Error',
          description: 'Please select follow-up date',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      const timeStr = followUpTime || '09:00';
      scheduledDateTime = new Date(`${followUpDate}T${timeStr}`);
    } else {
      const now = new Date();
      switch (followUpTimeframe) {
        case '1hour':
          scheduledDateTime = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case 'tomorrow':
          scheduledDateTime = new Date(now);
          scheduledDateTime.setDate(scheduledDateTime.getDate() + 1);
          if (followUpTime) {
            const [hours, minutes] = followUpTime.split(':');
            scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          } else {
            scheduledDateTime.setHours(9, 0, 0, 0);
          }
          break;
        case '1week':
          scheduledDateTime = new Date(now);
          scheduledDateTime.setDate(scheduledDateTime.getDate() + 7);
          if (followUpTime) {
            const [hours, minutes] = followUpTime.split(':');
            scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          } else {
            scheduledDateTime.setHours(9, 0, 0, 0);
          }
          break;
        case '1month':
          scheduledDateTime = new Date(now);
          scheduledDateTime.setMonth(scheduledDateTime.getMonth() + 1);
          if (followUpTime) {
            const [hours, minutes] = followUpTime.split(':');
            scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          } else {
            scheduledDateTime.setHours(9, 0, 0, 0);
          }
          break;
        default:
          scheduledDateTime = new Date(now);
      }
    }

    try {
      // Create follow-up via API
      const response = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          scheduledAt: scheduledDateTime,
          status: 'pending',
          notes: followUpNotes || 'Follow-up scheduled from call',
          priority: followUpPriority,
          createdById: user?.id || 'unknown-user',
        }),
      });

      if (response.ok) {
        toast({
          title: 'Follow-up Scheduled',
          description: `Follow-up scheduled for ${formatDate(scheduledDateTime)}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Reset follow-up form
        setFollowUpTimeframe('tomorrow');
        setFollowUpDate('');
        setFollowUpTime('');
        setFollowUpNotes('');
        setFollowUpPriority('medium');
        
        // Close modal after successful save
        handleClose();
      } else {
        throw new Error('Failed to create follow-up');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to schedule follow-up',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(error);
    }
  };

  const handleClose = () => {
    // Reset all state
    setCallPhase('dialing');
    setStartTime(null);
    setEndTime(null);
    setDuration(0);
    setCallTimer(0);
    setCallStatus('completed');
    setRemarks('');
    setRemarksInitialized(false);
    setFollowUpTimeframe('tomorrow');
    setFollowUpDate('');
    setFollowUpTime('');
    setFollowUpNotes('');
    setFollowUpPriority('medium');
    setNextAction(null);
    setCallSaved(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size={{ base: 'full', md: 'xl' }} closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent mx={{ base: 0, md: 4 }} my={{ base: 0, md: 8 }}>
        <ModalHeader fontSize={{ base: 'lg', md: 'xl' }}>
          {callPhase === 'dialing' && 'Make a Call'}
          {callPhase === 'calling' && 'Call in Progress'}
          {callPhase === 'ended' && 'Call Details'}
          {callPhase === 'next-action' && 'Next Action'}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          {/* Dialing Phase */}
          {callPhase === 'dialing' && (
            <VStack spacing={6} py={{ base: 4, md: 6 }}>
              <Box textAlign="center">
                <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" mb={2}>
                  {leadName}
                </Text>
                <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.600">
                  {leadPhone}
                </Text>
              </Box>

              <IconButton
                aria-label="Start call"
                icon={<HiPhone />}
                size={{ base: 'md', md: 'lg' }}
                colorScheme="green"
                isRound
                onClick={handleStartCall}
                width={{ base: '60px', md: '80px' }}
                height={{ base: '60px', md: '80px' }}
                fontSize={{ base: '24px', md: '32px' }}
              />

              <Text fontSize="sm" color="gray.500">
                Tap to dial
              </Text>
            </VStack>
          )}

          {/* Calling Phase */}
          {callPhase === 'calling' && (
            <VStack spacing={6} py={6}>
              <Box textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" mb={2}>
                  {leadName}
                </Text>
                <Text fontSize="lg" color="gray.600" mb={4}>
                  {leadPhone}
                </Text>
                <Badge colorScheme="green" fontSize="md" px={4} py={2}>
                  Calling...
                </Badge>
              </Box>

              <Text fontSize="4xl" fontWeight="bold" color="green.500">
                {formatTimer(callTimer)}
              </Text>

              <IconButton
                aria-label="End call"
                icon={<HiX />}
                size="lg"
                colorScheme="red"
                isRound
                onClick={handleEndCall}
                width="80px"
                height="80px"
                fontSize="32px"
              />

              <Text fontSize="sm" color="gray.500">
                Tap to end call
              </Text>
            </VStack>
          )}

          {/* Next Action Phase */}
          {callPhase === 'next-action' && (
            <VStack spacing={6} py={6}>
              <Text fontSize="lg" fontWeight="medium" textAlign="center">
                What would you like to do next?
              </Text>

              <VStack spacing={3} width="full">
                <Button
                  width="full"
                  size="lg"
                  colorScheme="orange"
                  onClick={() => handleNextAction('followup')}
                >
                  Schedule Follow-up
                </Button>

                <Button
                  width="full"
                  size="lg"
                  colorScheme="gray"
                  onClick={() => handleNextAction('unqualified')}
                >
                  Mark as Unqualified
                </Button>

                <Button
                  width="full"
                  size="lg"
                  colorScheme="red"
                  onClick={() => handleNextAction('unreachable')}
                >
                  Mark as Unreachable
                </Button>

                <Button
                  width="full"
                  size="md"
                  variant="ghost"
                  onClick={handleSkipNextAction}
                >
                  Skip - Close
                </Button>
              </VStack>
            </VStack>
          )}

          {/* Ended Phase - Call Details Form Only */}
          {callPhase === 'ended' && nextAction !== 'followup' && (
            <VStack spacing={4} align="stretch">
              <Box>
                <HStack justify="space-between" mb={4}>
                  <Box>
                    <Text fontSize="sm" color="gray.600">
                      Start Time
                    </Text>
                    <Text fontWeight="medium">
                      {startTime ? formatDate(startTime) : '-'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.600">
                      End Time
                    </Text>
                    <Text fontWeight="medium">
                      {endTime ? formatDate(endTime) : '-'}
                    </Text>
                  </Box>
                </HStack>

                <Box bg="blue.50" p={3} borderRadius="md" textAlign="center">
                  <Text fontSize="sm" color="gray.600" mb={1}>
                    Call Duration
                  </Text>
                  <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                    {formatTimer(duration)}
                  </Text>
                </Box>
              </Box>

              <Divider />

              <FormControl>
                <FormLabel>Call Status</FormLabel>
                <Select
                  value={callStatus}
                  onChange={(e) => setCallStatus(e.target.value as 'completed' | 'busy' | 'ring_not_response')}
                >
                  <option value="completed">Completed</option>
                  <option value="busy">Busy</option>
                  <option value="ring_not_response">Ring Not Response</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Remarks</FormLabel>
                <Textarea
                  value={remarks}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (!remarksInitialized && value.length > 0) {
                      // Auto-add date and time on first input
                      const now = new Date();
                      const dateTimeStr = now.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });
                      setRemarks(`[${dateTimeStr}] ${value}`);
                      setRemarksInitialized(true);
                    } else if (remarksInitialized) {
                      // Protect the timestamp from being deleted
                      const timestampMatch = remarks.match(/^\[.+?\] /);
                      if (timestampMatch) {
                        const timestamp = timestampMatch[0];
                        // If user tries to delete the timestamp, restore it
                        if (!value.startsWith(timestamp)) {
                          setRemarks(timestamp + value.replace(timestamp, ''));
                        } else {
                          setRemarks(value);
                        }
                      } else {
                        setRemarks(value);
                      }
                    } else {
                      setRemarks(value);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Prevent deleting the timestamp with backspace or delete
                    if (remarksInitialized && (e.key === 'Backspace' || e.key === 'Delete')) {
                      const timestampMatch = remarks.match(/^\[.+?\] /);
                      if (timestampMatch) {
                        const timestamp = timestampMatch[0];
                        const cursorPos = e.currentTarget.selectionStart;
                        const selectionEnd = e.currentTarget.selectionEnd;
                        
                        // Prevent deletion if cursor is within the timestamp area
                        if ((e.key === 'Backspace' && cursorPos <= timestamp.length) ||
                            (e.key === 'Delete' && selectionEnd < timestamp.length) ||
                            (cursorPos < timestamp.length && selectionEnd >= timestamp.length)) {
                          e.preventDefault();
                          // Move cursor to after timestamp
                          const target = e.currentTarget;
                          setTimeout(() => {
                            if (target) {
                              target.setSelectionRange(timestamp.length, timestamp.length);
                            }
                          }, 0);
                        }
                      }
                    }
                  }}
                  onFocus={(e) => {
                    if (!remarksInitialized && remarks === '') {
                      // Auto-add date, time, and agent name when focusing on empty field
                      const now = new Date();
                      const dateTimeStr = now.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });
                      const agentName = user?.name || 'Unknown User';
                      setRemarks(`[${dateTimeStr} - ${agentName}] `);
                      setRemarksInitialized(true);
                      // Move cursor to the end
                      const target = e.target;
                      setTimeout(() => {
                        if (target) {
                          const len = target.value.length;
                          target.setSelectionRange(len, len);
                        }
                      }, 0);
                    }
                  }}
                  onClick={(e) => {
                    // Prevent clicking inside the timestamp
                    if (remarksInitialized) {
                      const timestampMatch = remarks.match(/^\[.+?\] /);
                      if (timestampMatch) {
                        const timestamp = timestampMatch[0];
                        const cursorPos = e.currentTarget.selectionStart;
                        if (cursorPos < timestamp.length) {
                          const target = e.currentTarget;
                          setTimeout(() => {
                            if (target) {
                              target.setSelectionRange(timestamp.length, timestamp.length);
                            }
                          }, 0);
                        }
                      }
                    }
                  }}
                  placeholder="Enter your notes about this call..."
                  rows={4}
                />
              </FormControl>
            </VStack>
          )}

          {/* Follow-up Only - After Next Action Selection */}
          {callPhase === 'ended' && nextAction === 'followup' && (
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between" align="center" mb={2}>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<HiArrowLeft />}
                  onClick={handleBackToNextAction}
                >
                  Back
                </Button>
                <Text fontSize="lg" fontWeight="medium">
                  Schedule Follow-up
                </Text>
                <Box width="60px" /> {/* Spacer for alignment */}
              </HStack>

              <FormControl>
                <FormLabel>Follow-up Timeframe</FormLabel>
                <VStack spacing={2} align="stretch">
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      colorScheme={followUpTimeframe === '1hour' ? 'blue' : 'gray'}
                      variant={followUpTimeframe === '1hour' ? 'solid' : 'outline'}
                      onClick={() => setFollowUpTimeframe('1hour')}
                      flex="1"
                    >
                      After 1 Hour
                    </Button>
                    <Button
                      size="sm"
                      colorScheme={followUpTimeframe === 'tomorrow' ? 'blue' : 'gray'}
                      variant={followUpTimeframe === 'tomorrow' ? 'solid' : 'outline'}
                      onClick={() => setFollowUpTimeframe('tomorrow')}
                      flex="1"
                    >
                      Tomorrow
                    </Button>
                  </HStack>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      colorScheme={followUpTimeframe === '1week' ? 'blue' : 'gray'}
                      variant={followUpTimeframe === '1week' ? 'solid' : 'outline'}
                      onClick={() => setFollowUpTimeframe('1week')}
                      flex="1"
                    >
                      After 1 Week
                    </Button>
                    <Button
                      size="sm"
                      colorScheme={followUpTimeframe === '1month' ? 'blue' : 'gray'}
                      variant={followUpTimeframe === '1month' ? 'solid' : 'outline'}
                      onClick={() => setFollowUpTimeframe('1month')}
                      flex="1"
                    >
                      After 1 Month
                    </Button>
                  </HStack>
                  <Button
                    size="sm"
                    colorScheme={followUpTimeframe === 'custom' ? 'blue' : 'gray'}
                    variant={followUpTimeframe === 'custom' ? 'solid' : 'outline'}
                    onClick={() => setFollowUpTimeframe('custom')}
                    width="full"
                  >
                    Custom Date
                  </Button>
                </VStack>
              </FormControl>

              {followUpTimeframe === 'custom' && (
                <FormControl isRequired>
                  <FormLabel>Follow-up Date</FormLabel>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </FormControl>
              )}

              <FormControl>
                <FormLabel>Follow-up Time</FormLabel>
                <Input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  placeholder="09:00"
                />
              </FormControl>

              <HStack spacing={3}>
                <Button variant="ghost" onClick={handleClose} flex="1">
                  Cancel
                </Button>
                <Button
                  colorScheme="orange"
                  onClick={() => {
                    handleSaveFollowUp();
                    handleClose();
                  }}
                  isDisabled={followUpTimeframe === 'custom' && !followUpDate}
                  flex="1"
                >
                  Schedule Follow-up
                </Button>
              </HStack>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {callPhase === 'ended' && nextAction !== 'followup' ? (
            <HStack spacing={3}>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="blue" 
                onClick={handleSaveCall}
                isDisabled={callSaved}
              >
                {callSaved ? 'Call Saved' : 'Save Call'}
              </Button>
            </HStack>
          ) : callPhase === 'next-action' || nextAction === 'followup' ? null : (
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}





