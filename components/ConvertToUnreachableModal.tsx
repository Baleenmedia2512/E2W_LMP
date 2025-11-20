'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Textarea,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import { mutate } from 'swr';

interface ConvertToUnreachableModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}

export default function ConvertToUnreachableModal({
  isOpen,
  onClose,
  leadId,
  leadName,
}: ConvertToUnreachableModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for marking as unreachable',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'unreach',
          reason,
          notes: `Marked as Unreachable: ${reason}`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }

      toast({
        title: 'Lead marked as unreachable',
        description: `${leadName} has been marked as unreachable`,
        status: 'success',
        duration: 3000,
      });

      // Refresh all leads data
      mutate('/api/leads');
      mutate(`/api/leads/${leadId}`);

      setReason('');
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update lead',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Mark as Unreachable</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Reason</FormLabel>
              <Textarea
                placeholder="Why is this lead unreachable? (e.g., Phone not answering, Invalid number, etc.)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="gray"
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Converting..."
          >
            Mark as Unreachable
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
