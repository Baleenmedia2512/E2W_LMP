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
      // Update lead status via API with reason in customerRequirement field
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'unreach',
          customerRequirement: reason,
          notes: `Marked as Unreachable: ${reason}`,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success!',
          description: `${leadName} has been marked as unreachable`,
          status: 'success',
          duration: 3000,
        });

        setReason('');
        onClose();
        
        // Reload to show updated status
        setTimeout(() => window.location.reload(), 500);
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
        <ModalHeader>Mark Lead as Unreachable</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel fontWeight="600">Customer Requirement / Reason (Required)</FormLabel>
              <Textarea
                placeholder="Why is this lead unreachable? (e.g., Phone not answering, Invalid number, Customer requested not to call, etc.)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                autoFocus
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="orange"
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Updating..."
          >
            Mark as Unreachable
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}





