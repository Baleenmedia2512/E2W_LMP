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
  Select,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';

interface MarkAsLostModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onSuccess?: () => void;
}

const LOST_REASONS = [
  { value: 'competitor', label: 'Chose Competitor' },
  { value: 'price', label: 'Price Too High' },
  { value: 'timing', label: 'Wrong Timing' },
  { value: 'budget', label: 'Budget Constraints' },
  { value: 'no_response', label: 'No Response' },
  { value: 'not_interested', label: 'Not Interested Anymore' },
  { value: 'requirements_mismatch', label: 'Requirements Mismatch' },
  { value: 'other', label: 'Other' },
];

export default function MarkAsLostModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess,
}: MarkAsLostModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const handleSubmit = async () => {
    if (!reason) {
      toast({
        title: 'Reason required',
        description: 'Please select a reason for marking as lost',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      // Update lead status via API with reason
      const selectedReason = LOST_REASONS.find(r => r.value === reason)?.label || reason;
      const lostNotes = details
        ? `Deal Lost - Reason: ${selectedReason}. Details: ${details}`
        : `Deal Lost - Reason: ${selectedReason}`;

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'lost',
          customerRequirement: selectedReason,
          notes: lostNotes,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Lead Marked as Lost',
          description: `${leadName} has been marked as lost`,
          status: 'info',
          duration: 3000,
        });

        setReason('');
        setDetails('');
        onClose();
        
        // Trigger refresh via callback
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error('Failed to update lead');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update lead status',
        status: 'error',
        duration: 3000,
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Mark Lead as Lost</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              Please provide a reason for marking <strong>{leadName}</strong> as lost.
            </Text>

            <FormControl isRequired>
              <FormLabel fontWeight="600">Reason (Required)</FormLabel>
              <Select
                placeholder="Select a reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
              >
                {LOST_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontWeight="600">Additional Details (Optional)</FormLabel>
              <Textarea
                placeholder="Provide more context (e.g., competitor name, specific concerns, future opportunities, etc.)"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
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
            colorScheme="red"
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Updating..."
          >
            Mark as Lost
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
