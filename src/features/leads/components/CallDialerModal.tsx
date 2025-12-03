'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
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
import { formatPhoneForDisplay, formatPhoneForDialer, isValidPhone } from '@/shared/utils/phone';
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
  onOpenUnreachable?: () => void;
  onOpenUnqualified?: () => void;
}

type CallPhase = 'dialing' | 'calling' | 'ended' | 'next-action';

export default function CallDialerModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  leadPhone,
  onOpenUnreachable,
  onOpenUnqualified,
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
  const [nextAction, setNextAction] = useState<'followup' | 'unqualified' | 'unreachable' | 'win' | 'lost' | 'update_status' | null>(null);
  
  // Unqualified form state
  const [unqualifiedReason, setUnqualifiedReason] = useState('');
  const [unqualifiedNotes, setUnqualifiedNotes] = useState('');
  
  // Unreachable form state
  const [unreachableReason, setUnreachableReason] = useState('');
  const [unreachableNotes, setUnreachableNotes] = useState('');

  // Auto-start call when modal opens
  useEffect(() => {
    if (isOpen && callPhase === 'dialing') {
      // US-8 Enhancement: Check for unsaved call data in localStorage
      const savedCallData = localStorage.getItem(`unsaved_call_${leadId}`);
      
      if (savedCallData) {
        try {
          const data = JSON.parse(savedCallData);
          const savedTime = data.timestamp || 0;
          const hourInMs = 60 * 60 * 1000;
          
          // Only restore if saved within last hour (prevent stale data)
          if (Date.now() - savedTime < hourInMs) {
            // Restore the call state based on saved phase
            const savedPhase = data.callPhase || 'ended';
            setCallPhase(savedPhase);
            setStartTime(data.startTime ? new Date(data.startTime) : null);
            setEndTime(data.endTime ? new Date(data.endTime) : null);
            setDuration(data.duration || 0);
            setCallStatus(data.callStatus || 'answer');
            setRemarks(data.remarks || '');
            setCallDate(data.callDate || '');
            setCallTime(data.callTime || '');
            setHasUnsavedChanges(true);
            
            // Silently restore - no toast notification needed
            // The user can see the call is in progress from the UI
            
            // Prevent auto-start if we're restoring a call
            return;
          } else {
            // Clear stale data
            localStorage.removeItem(`unsaved_call_${leadId}`);
          }
        } catch (error) {
          console.error('Failed to restore call data:', error);
          localStorage.removeItem(`unsaved_call_${leadId}`);
        }
      }
      
      // Automatically start the call after a brief delay (for modal animation)
      const timer = setTimeout(() => {
        handleStartCall();
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, leadId]);

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
    const dateStr = now.toISOString().split('T')[0] || '';
    const timeStr = now.toTimeString().slice(0, 5);
    setCallDate(dateStr);
    setCallTime(timeStr);
    
    // US-8 Enhancement: Save calling state to localStorage immediately
    const callData = {
      leadId,
      leadName,
      leadPhone,
      startTime: now.toISOString(),
      callStatus: 'answer',
      callDate: dateStr,
      callTime: timeStr,
      callPhase: 'calling',
      timestamp: Date.now()
    };
    localStorage.setItem(`unsaved_call_${leadId}`, JSON.stringify(callData));
    
    // AC-2 & AC-5: Dialer receives ONLY last 10 digits (no +91, spaces, or formatting)
    const dialerPhone = formatPhoneForDialer(leadPhone);
    
    // US-8 AC-1 & AC-4: Open dialer without closing the form
    // Mobile: Opens phone dialer app, browser stays on current page with form open
    // Desktop: Opens in new tab/window, current tab keeps form open
    if (dialerPhone && typeof window !== 'undefined') {
      // Create a temporary link to trigger the dialer
      const link = document.createElement('a');
      link.href = `tel:${dialerPhone}`;
      
      // On mobile: tel: links open the native dialer without navigation
      // On desktop: tel: links may open external apps or do nothing
      // Using click() ensures no navigation/refresh occurs
      link.click();
      
      // Clean up
      link.remove();
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
    
    // US-8 Enhancement: Save call data to localStorage to persist across page refresh
    const callData = {
      leadId,
      leadName,
      leadPhone,
      startTime: startTime?.toISOString(),
      endTime: now.toISOString(),
      duration: startTime ? Math.floor((now.getTime() - startTime.getTime()) / 1000) : 0,
      callStatus,
      remarks,
      callDate: callDate || now.toISOString().split('T')[0],
      callTime: callTime || now.toTimeString().slice(0, 5),
      callPhase: 'ended',
      timestamp: Date.now()
    };
    localStorage.setItem(`unsaved_call_${leadId}`, JSON.stringify(callData));
  };

  const handleSaveCall = async () => {
    clearAllErrors();
    let hasErrors = false;

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
          customerRequirement: remarks || 'Call logged',
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
        
        // US-8 Enhancement: Clear saved call data from localStorage
        localStorage.removeItem(`unsaved_call_${leadId}`);
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

  const handleNextAction = async (action: 'followup' | 'unqualified' | 'unreachable' | 'win' | 'lost' | 'update_status') => {
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
    
    if (action === 'followup') {
      // Set nextAction for follow-up and stay in modal to show follow-up form
      setNextAction(action);
      setCallPhase('ended');
    } else if (action === 'unqualified') {
      // Open unqualified modal and close call dialer
      if (onOpenUnqualified) {
        handleClose(); // Close the call dialer modal first
        onOpenUnqualified(); // Then open the unqualified modal
      } else {
        // Fallback: show form in same modal if no callback provided
        setNextAction(action);
        setCallPhase('ended');
      }
    } else if (action === 'unreachable') {
      // Open unreachable modal and close call dialer
      if (onOpenUnreachable) {
        handleClose(); // Close the call dialer modal first
        onOpenUnreachable(); // Then open the unreachable modal
      } else {
        // Fallback: show form in same modal if no callback provided
        setNextAction(action);
        setCallPhase('ended');
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
    } else if (action === 'update_status') {
      handleClose();
      window.location.reload();
    }
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
            const hours = parseInt(timeParts[0] || '9');
            const minutes = parseInt(timeParts[1] || '0');
            scheduledDateTime.setHours(hours, minutes, 0, 0);
          } else {
            scheduledDateTime.setHours(9, 0, 0, 0);
          }
          break;
        case '1week':
          scheduledDateTime = new Date(now);
          scheduledDateTime.setDate(scheduledDateTime.getDate() + 7);
          if (followUpTime) {
            const timeParts = followUpTime.split(':');
            const hours = parseInt(timeParts[0] || '9');
            const minutes = parseInt(timeParts[1] || '0');
            scheduledDateTime.setHours(hours, minutes, 0, 0);
          } else {
            scheduledDateTime.setHours(9, 0, 0, 0);
          }
          break;
        case '1month':
          scheduledDateTime = new Date(now);
          scheduledDateTime.setMonth(scheduledDateTime.getMonth() + 1);
          if (followUpTime) {
            const timeParts = followUpTime.split(':');
            const hours = parseInt(timeParts[0] || '9');
            const minutes = parseInt(timeParts[1] || '0');
            scheduledDateTime.setHours(hours, minutes, 0, 0);
          } else {
            scheduledDateTime.setHours(9, 0, 0, 0);
          }
          break;
        default:
          scheduledDateTime = new Date(now);
      }
    }

    // Validate that the scheduled time is in the future
    const now = new Date();
    if (scheduledDateTime <= now) {
      toast({
        title: 'Invalid Date/Time',
        description: 'Follow-up date and time must be in the future. Please select a later time.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      console.error('Scheduled time is in the past:', {
        scheduledDateTime: scheduledDateTime.toISOString(),
        now: now.toISOString(),
      });
      return;
    }

    console.log('Scheduling follow-up:', {
      scheduledDateTime: scheduledDateTime.toISOString(),
      followUpTimeframe,
      followUpDate,
      followUpTime,
    });

    try {
      // Create follow-up via API
      // Note: The API will automatically mark all previous pending follow-ups as completed
      const response = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          scheduledAt: scheduledDateTime,
          status: 'pending',
          customerRequirement: customerRequirement?.trim() || followUpNotes?.trim() || 'Follow-up from call',
          notes: followUpNotes || 'Follow-up scheduled from call',
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

        // Close modal and navigate to leads page
        handleClose();
        window.location.href = '/dashboard/leads';
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create follow-up');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to schedule follow-up';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      console.error('Follow-up error:', error);
    }
  };

  const handleSaveUnqualified = async () => {
    if (!unqualifiedReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for marking as unqualified',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'unqualified',
          customerRequirement: unqualifiedReason,
          notes: unqualifiedNotes || unqualifiedReason,
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
      window.location.href = '/dashboard/leads/unqualified';
    } catch (error) {
      console.error('Failed to update lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark lead as unqualified',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSaveUnreachable = async () => {
    if (!unreachableReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for marking as unreachable',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'unreach',
          customerRequirement: unreachableReason,
          notes: unreachableNotes || unreachableReason,
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
      window.location.href = '/dashboard/leads/unreachable';
    } catch (error) {
      console.error('Failed to update lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark lead as unreachable',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
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
    // US-8 Enhancement: Only clear localStorage if call was saved or user confirmed discard
    if (callSaved || !hasUnsavedChanges) {
      localStorage.removeItem(`unsaved_call_${leadId}`);
    }
    
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
    setUnqualifiedReason('');
    setUnqualifiedNotes('');
    setUnreachableReason('');
    setUnreachableNotes('');
    setCallSaved(false);
    setHasUnsavedChanges(false);
    clearAllErrors();
    confirmDialog.onClose();
    onClose();
  };

  const handleBackButton = () => {
    // Smart navigation based on current phase
    if (callPhase === 'ended' && (nextAction === 'followup' || nextAction === 'unqualified' || nextAction === 'unreachable')) {
      // If in any action form, go back to next action selection
      setNextAction(null);
      setCallPhase('next-action');
    } else if (callPhase === 'next-action') {
      // If in next action, go back to call details
      setCallPhase('ended');
    } else if (callPhase === 'ended') {
      // If in call details without next action, close with confirmation if unsaved
      if (hasUnsavedChanges && !callSaved) {
        confirmDialog.onOpen();
      } else {
        handleClose();
      }
    } else {
      // For dialing or calling phase, close modal
      handleClose();
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleCloseWithConfirm} size={{ base: 'full', md: 'xl' }} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent mx={{ base: 0, md: 4 }} my={{ base: 0, md: 8 }}>
          <ModalHeader fontSize={{ base: 'lg', md: 'xl' }}>
            {callPhase !== 'next-action' && (
              <HStack spacing={2}>
                <IconButton
                  aria-label="Go back"
                  icon={<HiArrowLeft />}
                  size="sm"
                  variant="ghost"
                  onClick={handleBackButton}
                />
                <Text>
                  {callPhase === 'dialing' && 'Make a Call'}
                  {callPhase === 'calling' && 'Call in Progress'}
                  {callPhase === 'ended' && 'Call Details'}
                </Text>
              </HStack>
            )}
            {callPhase === 'next-action' && (
              <Text>Next Action</Text>
            )}
            {hasUnsavedChanges && !callSaved && (
              <Text as="span" color="orange.500" fontSize="sm" ml={2}>
                (Unsaved)
              </Text>
            )}
          </ModalHeader>

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
                  {formatPhoneForDisplay(leadPhone)}
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
                  {formatPhoneForDisplay(leadPhone)}
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
                      {startTime ? startTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '--:--'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.600">
                      End Time
                    </Text>
                    <Text fontWeight="medium">
                      {endTime ? endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '--:--'}
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
                label="Remarks (Optional)"
                name="remarks"
                value={remarks}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!remarksInitialized && value.length > 0) {
                    const now = new Date();
                    const dateTimeStr = now.toLocaleString('en-GB', {
                      year: '2-digit',
                      month: '2-digit',
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
                    const dateTimeStr = now.toLocaleString('en-GB', {
                      year: '2-digit',
                      month: '2-digit',
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
              <Text fontSize="lg" fontWeight="medium" textAlign="center">
                Schedule Follow-up
              </Text>

              <FormControl>
                <FormLabel>Follow-up Timeframe</FormLabel>
                <VStack spacing={2} align="stretch">
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      colorScheme={followUpTimeframe === '1hour' ? 'blue' : 'gray'}
                      variant={followUpTimeframe === '1hour' ? 'solid' : 'outline'}
                      onClick={() => {
                        setFollowUpTimeframe('1hour');
                        const now = new Date();
                        const scheduledDateTime = new Date(now.getTime() + 60 * 60 * 1000);
                        setFollowUpDate(scheduledDateTime.toISOString().split('T')[0]!);
                        setFollowUpTime(scheduledDateTime.toTimeString().slice(0, 5));
                      }}
                      flex="1"
                    >
                      After 1 Hour
                    </Button>
                    <Button
                      size="sm"
                      colorScheme={followUpTimeframe === 'tomorrow' ? 'blue' : 'gray'}
                      variant={followUpTimeframe === 'tomorrow' ? 'solid' : 'outline'}
                      onClick={() => {
                        setFollowUpTimeframe('tomorrow');
                        const now = new Date();
                        const scheduledDateTime = new Date(now);
                        scheduledDateTime.setDate(scheduledDateTime.getDate() + 1);
                        setFollowUpDate(scheduledDateTime.toISOString().split('T')[0]!);
                        setFollowUpTime(now.toTimeString().slice(0, 5));
                      }}
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
                      onClick={() => {
                        setFollowUpTimeframe('1week');
                        const now = new Date();
                        const scheduledDateTime = new Date(now);
                        scheduledDateTime.setDate(scheduledDateTime.getDate() + 7);
                        setFollowUpDate(scheduledDateTime.toISOString().split('T')[0]!);
                        setFollowUpTime(now.toTimeString().slice(0, 5));
                      }}
                      flex="1"
                    >
                      After 1 Week
                    </Button>
                    <Button
                      size="sm"
                      colorScheme={followUpTimeframe === '1month' ? 'blue' : 'gray'}
                      variant={followUpTimeframe === '1month' ? 'solid' : 'outline'}
                      onClick={() => {
                        setFollowUpTimeframe('1month');
                        const now = new Date();
                        const scheduledDateTime = new Date(now);
                        scheduledDateTime.setMonth(scheduledDateTime.getMonth() + 1);
                        setFollowUpDate(scheduledDateTime.toISOString().split('T')[0]!);
                        setFollowUpTime(now.toTimeString().slice(0, 5));
                      }}
                      flex="1"
                    >
                      After 1 Month
                    </Button>
                  </HStack>
                  <Button
                    size="sm"
                    colorScheme={followUpTimeframe === 'custom' ? 'blue' : 'gray'}
                    variant={followUpTimeframe === 'custom' ? 'solid' : 'outline'}
                    onClick={() => {
                      setFollowUpTimeframe('custom');
                      setFollowUpDate('');
                      setFollowUpTime('09:00');
                    }}
                    width="full"
                  >
                    Custom Date
                  </Button>
                </VStack>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Follow-up Date</FormLabel>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  isReadOnly={followUpTimeframe !== 'custom'}
                  bg={followUpTimeframe !== 'custom' ? 'gray.100' : 'white'}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Follow-up Time</FormLabel>
                <Input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                  placeholder="09:00"
                  isReadOnly={followUpTimeframe !== 'custom'}
                  bg={followUpTimeframe !== 'custom' ? 'gray.100' : 'white'}
                />
              </FormControl>

              <Button
                width="full"
                colorScheme="orange"
                onClick={handleSaveFollowUp}
                isDisabled={followUpTimeframe === 'custom' && !followUpDate}
                size="lg"
              >
                Schedule Follow-up
              </Button>
            </VStack>
          )}

          {/* Unqualified Form */}
          {callPhase === 'ended' && nextAction === 'unqualified' && (
            <VStack spacing={4} align="stretch">
              <Text fontSize="lg" fontWeight="medium" textAlign="center" color="purple.700">
                Mark as Unqualified
              </Text>

              <FormControl isRequired>
                <FormLabel>Reason for Unqualified <Text as="span" color="red.500">*</Text></FormLabel>
                <Select
                  value={unqualifiedReason}
                  onChange={(e) => setUnqualifiedReason(e.target.value)}
                  placeholder="Select reason"
                >
                  <option value="Not interested">Not interested</option>
                  <option value="Budget constraints">Budget constraints</option>
                  <option value="Wrong target audience">Wrong target audience</option>
                  <option value="Already using competitor">Already using competitor</option>
                  <option value="Not decision maker">Not decision maker</option>
                  <option value="Other">Other</option>
                </Select>
              </FormControl>

              <Button
                width="full"
                colorScheme="purple"
                onClick={handleSaveUnqualified}
                isDisabled={!unqualifiedReason.trim()}
                size="lg"
              >
                Mark as Unqualified
              </Button>
            </VStack>
          )}

          {/* Unreachable Form */}
          {callPhase === 'ended' && nextAction === 'unreachable' && (
            <VStack spacing={4} align="stretch">
              <Text fontSize="lg" fontWeight="medium" textAlign="center" color="pink.700">
                Mark as Unreachable
              </Text>

              <FormControl isRequired>
                <FormLabel>Reason for Unreachable <Text as="span" color="red.500">*</Text></FormLabel>
                <Select
                  value={unreachableReason}
                  onChange={(e) => setUnreachableReason(e.target.value)}
                  placeholder="Select reason"
                >
                  <option value="Phone not answering">Phone not answering</option>
                  <option value="Number not in service">Number not in service</option>
                  <option value="Wrong number">Wrong number</option>
                  <option value="Call declined multiple times">Call declined multiple times</option>
                  <option value="Voicemail full">Voicemail full</option>
                  <option value="Other">Other</option>
                </Select>
              </FormControl>

              <Button
                width="full"
                colorScheme="pink"
                onClick={handleSaveUnreachable}
                isDisabled={!unreachableReason.trim()}
                size="lg"
              >
                Mark as Unreachable
              </Button>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter>
          {callPhase === 'ended' && !['followup', 'win', 'lost', 'unqualified', 'unreachable'].includes(nextAction || '') && (
            <Button 
              width="full"
              colorScheme="blue" 
              onClick={handleSaveCall}
              isDisabled={callSaved}
              size="lg"
            >
              {callSaved ? 'Call Saved' : 'Save Call'}
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





