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
  Input,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import { mutate } from 'swr';

interface ConvertToUnqualifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}

export default function ConvertToUnqualifiedModal({
  isOpen,
  onClose,
  leadId,
  leadName,
}: ConvertToUnqualifiedModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [competitor, setCompetitor] = useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please provide a reason for marking as unqualified',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const notesText = competitor
        ? `Marked as Unqualified: ${reason}\nCompetitor/Notes: ${competitor}`
        : `Marked as Unqualified: ${reason}`;

      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'unqualified',
          reason,
          notes: notesText,
          metadata: competitor ? { competitor } : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update status');
      }

      toast({
        title: 'Lead marked as unqualified',
        description: `${leadName} has been marked as unqualified`,
        status: 'success',
        duration: 3000,
      });

      // Refresh all leads data
      mutate('/api/leads');
      mutate(`/api/leads/${leadId}`);

      setReason('');
      setCompetitor('');
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
        <ModalHeader>Mark as Unqualified</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Reason</FormLabel>
              <Textarea
                placeholder="Why is this lead unqualified? (e.g., Budget constraints, Not interested, etc.)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Competitor / Additional Notes (Optional)</FormLabel>
              <Input
                placeholder="e.g., Chose competitor XYZ, specific concerns"
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="yellow"
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Converting..."
          >
            Mark as Unqualified
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
