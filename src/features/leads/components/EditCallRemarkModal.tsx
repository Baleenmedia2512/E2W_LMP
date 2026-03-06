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
  FormControl,
  FormLabel,
  Select,
  Textarea,
  useToast,
  VStack,
  Text,
  Box,
  Badge,
} from '@chakra-ui/react';
import { formatDateTime } from '@/shared/lib/date-utils';
import { useAuth } from '@/shared/lib/auth/auth-context';
import type { CallLog } from '@/shared/types';

interface EditCallRemarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  callLog?: CallLog | null; // If provided, edit mode; if null, add mode
  leadId?: string;
  leadName?: string;
  onSuccess?: () => void;
}

export default function EditCallRemarkModal({
  isOpen,
  onClose,
  callLog,
  leadId,
  leadName,
  onSuccess,
}: EditCallRemarkModalProps) {
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [callStatus, setCallStatus] = useState<string>('answer');
  const [remarks, setRemarks] = useState('');
  const [timestampPrefix, setTimestampPrefix] = useState('');

  const isEditMode = !!callLog;

  // Generate timestamp prefix for remarks
  const generateTimestampPrefix = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[now.getMonth()];
    const year = String(now.getFullYear()).slice(-2);
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    const userName = user?.name || 'User';
    return `[${day} ${month} ${year} ${hoursStr}:${minutes} ${ampm} - ${userName}]`;
  };

  // Initialize form data when callLog changes
  useEffect(() => {
    if (callLog) {
      setCallStatus(callLog.callStatus || 'answer');
      // Extract timestamp prefix and actual remark if exists
      const remarkText = callLog.remarks || '';
      const timestampMatch = remarkText.match(/^\[.*?\]\s*/);
      if (timestampMatch) {
        setTimestampPrefix(timestampMatch[0].trim());
        setRemarks(remarkText.substring(timestampMatch[0].length));
      } else {
        setTimestampPrefix('');
        setRemarks(remarkText);
      }
    } else {
      // Reset for add mode - generate new timestamp
      setCallStatus('answer');
      setRemarks('');
      setTimestampPrefix(generateTimestampPrefix());
    }
  }, [callLog, isOpen]);

  const handleSave = async () => {
    if (!remarks.trim()) {
      toast({
        title: 'Remarks required',
        description: 'Please enter call remarks',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!isEditMode && !leadId) {
      toast({
        title: 'Error',
        description: 'Lead ID is required for new call remarks',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);

    // Combine timestamp prefix with actual remark
    const fullRemark = timestampPrefix ? `${timestampPrefix} ${remarks}` : remarks;

    try {
      if (isEditMode && callLog) {
        // Update existing call log
        const response = await fetch(`/api/calls/${callLog.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            remarks: fullRemark,
            callStatus,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to update call remark');
        }

        toast({
          title: 'Success',
          description: 'Call remark updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new call log
        const now = new Date();
        const response = await fetch('/api/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            callerId: user?.id,
            startedAt: now.toISOString(),
            endedAt: now.toISOString(),
            duration: 0,
            remarks: fullRemark,
            callStatus,
            attemptNumber: 1,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to add call remark');
        }

        toast({
          title: 'Success',
          description: 'Call remark added successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving call remark:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save call remark',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {isEditMode ? 'Edit Call Remark' : 'Add Call Remark'}
          {leadName && (
            <Text fontSize="sm" fontWeight="normal" color="gray.600" mt={1}>
              {leadName}
            </Text>
          )}
          {isEditMode && callLog && (
            <Text fontSize="xs" fontWeight="normal" color="gray.500" mt={1}>
              {formatDateTime(callLog.createdAt)}
            </Text>
          )}
        </ModalHeader>

        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Call Status</FormLabel>
              <Select
                value={callStatus}
                onChange={(e) => setCallStatus(e.target.value)}
                size="sm"
              >
                <option value="answer">Answered</option>
                <option value="busy">Busy</option>
                <option value="ring_not_response">No Answer</option>
                <option value="wrong_number">Wrong Number</option>
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontSize="sm">Remarks</FormLabel>
              {timestampPrefix && (
                <Box mb={2}>
                  <Badge colorScheme="blue" fontSize="xs" px={2} py={1}>
                    {timestampPrefix}
                  </Badge>
                </Box>
              )}
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter call remarks"
                size="sm"
                rows={4}
                autoFocus
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSave}
            isLoading={loading}
            size="sm"
          >
            {isEditMode ? 'Update' : 'Add'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
