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
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { useUnsavedChanges } from '@/shared/hooks/useUnsavedChanges';
import { ConfirmDialog, useConfirmDialog } from '@/shared/components/ConfirmDialog';
import ValidatedTextarea from '@/shared/components/ValidatedTextarea';

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
  const { errors, setError, clearError, clearAllErrors } = useFormValidation();
  const confirmDialog = useConfirmDialog();
  
  // Define callSaved before using it in useUnsavedChanges
  const [callSaved, setCallSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  useUnsavedChanges(hasUnsavedChanges && !callSaved);
  
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState(0);
  const [callTimer, setCallTimer] = useState(0);

  // Form state
  const [callStatus, setCallStatus] = useState<'answer' | 'busy' | 'wrong_number'>('answer');
  const [customerRequirement, setCustomerRequirement] = useState('');
  const [remarks, setRemarks] = useState('');
  const [remarksInitialized, setRemarksInitialized] = useState(false);
  const [callDate, setCallDate] = useState('');
  const [callTime, setCallTime] = useState('');
  const [followUpTimeframe, setFollowUpTimeframe] = useState<'1hour' | 'tomorrow' | '1week' | '1month' | 'custom'>('tomorrow');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpPriority, setFollowUpPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [nextAction, setNextAction] = useState<'followup' | 'unqualified' | 'unreachable' | 'win' | 'lost' | null>(null);

  // Auto-start call when modal opens
  useEffect(() => {
    if (isOpen && callPhase === 'dialing') {
      // Automatically start the call after a brief delay (for modal animation)
      const timer = setTimeout(() => {
        handleStartCall();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
    
    // Set initial date and time
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    setCallDate(dateStr);
    setCallTime(timeStr);
    
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
    setHasUnsavedChanges(true);
  };

  const handleSaveCall = async () => {
    clearAllErrors();
    let hasErrors = false;

    if (!customerRequirement || customerRequirement.trim() === '') {
      setError('customerRequirement', 'Customer Requirement is required');
      hasErrors = true;
    }

    // Validate date is not in future
    if (callDate) {
      const selectedDate = new Date(callDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        setError('callDate', 'Call date cannot be in the future');
        hasErrors = true;
      }
    }

    if (hasErrors) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
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
      // Use edited date/time if provided, otherwise use recorded times
      let finalStartTime = startTime;
      let finalEndTime = endTime;
      
      if (callDate && callTime) {
        finalStartTime = new Date(`${callDate}T${callTime}`);
        if (endTime && startTime) {
          const timeDiff = endTime.getTime() - startTime.getTime();
          finalEndTime = new Date(finalStartTime.getTime() + timeDiff);
        } else {
          finalEndTime = finalStartTime;
        }
      }

      // Save call log via API
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          callerId: user.id,
          startedAt: finalStartTime,
          endedAt: finalEndTime,
          duration,
          callStatus,
          customerRequirement: customerRequirement.trim(),
          remarks: remarks || null,
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
        setHasUnsavedChanges(false);
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

  const handleNextAction = async (action: 'followup' | 'unqualified' | 'unreachable' | 'win' | 'lost' | 'update_status' | 'no_action') => {
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
    } else if (action === 'update_status') {
      // Could redirect to lead edit or show status update form
      toast({
        title: 'Update Lead Status',
        description: 'Redirecting to lead details...',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      // Reload page to show updated call log
      window.location.reload();
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
        window.location.reload();
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
        window.location.reload();
      } catch (error) {
        console.error('Failed to update lead:', error);
      }
    } else if (action === 'win') {
      // Update lead status to won via API
      try {
        await fetch(`/api/leads/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'won',
            notes: remarks,
          }),
        });
        
        toast({
          title: 'Lead Marked as Won',
          description: `${leadName} has been marked as won! 🎉`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        handleClose();
        window.location.reload();
      } catch (error) {
        console.error('Failed to update lead:', error);
      }
    } else if (action === 'lost') {
      // Update lead status to lost via API
      try {
        await fetch(`/api/leads/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'lost',
            notes: remarks,
          }),
        });
        
        toast({
          title: 'Lead Marked as Lost',
          description: `${leadName} has been marked as lost`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        handleClose();
        window.location.reload();
      } catch (error) {
        console.error('Failed to update lead:', error);
      }
    } else if (action === 'no_action') {
      handleClose();
      window.location.reload();
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
            const timeParts = followUpTime.split(':');
            const hours = timeParts[0] || '9';
            const minutes = timeParts[1] || '0';
            scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          } else {
            scheduledDateTime.setHours(9, 0, 0, 0);
          }
          break;
        case '1week':
          scheduledDateTime = new Date(now);
          scheduledDateTime.setDate(scheduledDateTime.getDate() + 7);
          if (followUpTime) {
            const timeParts = followUpTime.split(':');
            const hours = timeParts[0] || '9';
            const minutes = timeParts[1] || '0';
            scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          } else {
            scheduledDateTime.setHours(9, 0, 0, 0);
          }
          break;
        case '1month':
          scheduledDateTime = new Date(now);
          scheduledDateTime.setMonth(scheduledDateTime.getMonth() + 1);
          if (followUpTime) {
            const timeParts = followUpTime.split(':');
            const hours = timeParts[0] || '9';
            const minutes = timeParts[1] || '0';
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
          customerRequirement: customerRequirement || 'Follow-up from call',
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

  const handleCloseWithConfirm = () => {
    if (hasUnsavedChanges && !callSaved) {
      confirmDialog.onOpen();
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    // Reset all state
    setCallPhase('dialing');
    setStartTime(null);
    setEndTime(null);
    setDuration(0);
    setCallTimer(0);
    setCallStatus('answer');
    setCustomerRequirement('');
    setRemarks('');
    setRemarksInitialized(false);
    setCallDate('');
    setCallTime('');
    setFollowUpTimeframe('tomorrow');
    setFollowUpDate('');
    setFollowUpTime('');
    setFollowUpNotes('');
    setFollowUpPriority('medium');
    setNextAction(null);
    setCallSaved(false);
    setHasUnsavedChanges(false);
    clearAllErrors();
    confirmDialog.onClose();
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleCloseWithConfirm} size={{ base: 'full', md: 'xl' }} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent mx={{ base: 0, md: 4 }} my={{ base: 0, md: 8 }}>
          <ModalHeader fontSize={{ base: 'lg', md: 'xl' }}>
            {callPhase === 'dialing' && 'Make a Call'}
            {callPhase === 'calling' && 'Call in Progress'}
            {callPhase === 'ended' && 'Call Details'}
            {callPhase === 'next-action' && 'Next Action'}
            {hasUnsavedChanges && !callSaved && (
              <Text as="span" color="orange.500" fontSize="sm" ml={2}>
                (Unsaved)
              </Text>
            )}
          </ModalHeader>
          <ModalCloseButton />

        <ModalBody>
          {/* Dialing Phase */}
          {callPhase === 'dialing' && (
            <VStack spacing={6} py={{ base: 4, md: 6 }}>
              <Box textAlign="center" bg="blue.50" p={4} borderRadius="md" width="full">
                <Text fontSize="xs" color="gray.600" mb={1}>
                  Lead Details
                </Text>
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
              <Text fontSize="lg" fontWeight="bold" textAlign="center" color="blue.700">
                Where do you want to move this lead?
              </Text>

              <VStack spacing={3} width="full">
                <Button
                  width="full"
                  size="lg"
                  colorScheme="orange"
                  onClick={() => handleNextAction('followup')}
                >
                  Follow-up
                </Button>

                <Button
                  width="full"
                  size="lg"
                  colorScheme="purple"
                  onClick={() => handleNextAction('unqualified')}
                >
                  Unqualified
                </Button>

                <Button
                  width="full"
                  size="lg"
                  colorScheme="pink"
                  onClick={() => handleNextAction('unreachable')}
                >
                  Unreachable
                </Button>

                <Button
                  width="full"
                  size="lg"
                  colorScheme="green"
                  onClick={() => handleNextAction('win')}
                >
                  Win 🎉
                </Button>

                <Button
                  width="full"
                  size="lg"
                  colorScheme="red"
                  onClick={() => handleNextAction('lost')}
                >
                  Lost
                </Button>

                <Button
                  width="full"
                  size="md"
                  variant="outline"
                  mt={2}
                  onClick={() => handleNextAction('no_action')}
                >
                  Skip - Done
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

              <FormControl isInvalid={!!errors.callDate}>
                <FormLabel>Date and Time <Text as="span" color="red.500">*</Text></FormLabel>
                <HStack spacing={2}>
                  <Input
                    type="date"
                    value={callDate}
                    onChange={(e) => {
                      setCallDate(e.target.value);
                      clearError('callDate');
                    }}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <Input
                    type="time"
                    value={callTime}
                    onChange={(e) => setCallTime(e.target.value)}
                  />
                </HStack>
                {errors.callDate && (
                  <Text color="red.500" fontSize="sm" mt={1}>{errors.callDate}</Text>
                )}
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Call time (defaults to now, cannot be in future)
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Duration (minutes) - Optional</FormLabel>
                <Input
                  type="number"
                  value={duration > 0 ? Math.floor(duration / 60) : ''}
                  onChange={(e) => {
                    const mins = parseInt(e.target.value) || 0;
                    setDuration(mins * 60);
                  }}
                  placeholder="Enter duration in minutes"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Call Status <Text as="span" color="red.500">*</Text></FormLabel>
                <Select
                  value={callStatus}
                  onChange={(e) => setCallStatus(e.target.value as 'answer' | 'busy' | 'wrong_number')}
                >
                  <option value="answer">Answer</option>
                  <option value="busy">Busy</option>
                  <option value="wrong_number">Wrong Number</option>
                </Select>
              </FormControl>

              <ValidatedTextarea
                label="Detailed Customer Requirement"
                name="customerRequirement"
                value={customerRequirement}
                onChange={(e) => {
                  setCustomerRequirement(e.target.value);
                  clearError('customerRequirement');
                }}
                error={errors.customerRequirement}
                isRequired={true}
                placeholder="Enter detailed customer requirements..."
                rows={4}
                maxLength={500}
                showCharCount={true}
                helperText="This field is required"
              />

              <ValidatedTextarea
                label="Remarks (Optional)"
                name="remarks"
                value={remarks}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!remarksInitialized && value.length > 0) {
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
                    const timestampMatch = remarks.match(/^\[.+?\] /);
                    if (timestampMatch) {
                      const timestamp = timestampMatch[0];
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
                  if (remarksInitialized && (e.key === 'Backspace' || e.key === 'Delete')) {
                    const timestampMatch = remarks.match(/^\[.+?\] /);
                    if (timestampMatch) {
                      const timestamp = timestampMatch[0];
                      const cursorPos = e.currentTarget.selectionStart;
                      const selectionEnd = e.currentTarget.selectionEnd;
                      
                      if ((e.key === 'Backspace' && cursorPos <= timestamp.length) ||
                          (e.key === 'Delete' && selectionEnd < timestamp.length) ||
                          (cursorPos < timestamp.length && selectionEnd >= timestamp.length)) {
                        e.preventDefault();
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
                maxLength={1000}
                showCharCount={true}
              />
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
          {callPhase === 'ended' && !['followup', 'win', 'lost', 'unqualified', 'unreachable'].includes(nextAction || '') ? (
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
          ) : callPhase === 'next-action' || ['followup', 'win', 'lost', 'unqualified', 'unreachable'].includes(nextAction || '') ? null : (
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>

    <ConfirmDialog
      isOpen={confirmDialog.isOpen}
      onClose={confirmDialog.onClose}
      onConfirm={handleClose}
      title="Discard Call Data?"
      message="You have unsaved call details. Are you sure you want to close? All entered information will be lost."
      confirmText="Discard"
      cancelText="Keep Editing"
      confirmColorScheme="red"
    />
  </>
  );
}





