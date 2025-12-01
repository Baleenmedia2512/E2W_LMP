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
  Input,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { useUnsavedChanges } from '@/shared/hooks/useUnsavedChanges';
import { ConfirmDialog, useConfirmDialog } from '@/shared/components/ConfirmDialog';
import ValidatedInput from '@/shared/components/ValidatedInput';
import ValidatedTextarea from '@/shared/components/ValidatedTextarea';

interface MarkAsWonModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  onSuccess?: () => void;
}

export default function MarkAsWonModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  onSuccess,
}: MarkAsWonModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [dealValue, setDealValue] = useState('');
  const [notes, setNotes] = useState('');
  const { errors, setError, clearError, clearAllErrors } = useFormValidation();
  const confirmDialog = useConfirmDialog();
  const hasChanges = dealValue !== '' || notes !== '';
  useUnsavedChanges(hasChanges && !loading);

  const handleSubmit = async () => {
    clearAllErrors();
    
    // Validate deal value if provided
    if (dealValue && parseFloat(dealValue) < 0) {
      setError('dealValue', 'Deal value must be a positive number');
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid deal value',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      // Update lead status via API
      const wonNotes = dealValue
        ? `Deal Won! Value: ₹${dealValue}. ${notes || ''}`
        : `Deal Won! ${notes || ''}`;

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'won',
          notes: wonNotes,
          metadata: dealValue ? { dealValue: parseFloat(dealValue) } : undefined,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success! 🎉',
          description: `${leadName} has been marked as Won`,
          status: 'success',
          duration: 4000,
        });

        setDealValue('');
        setNotes('');
        clearAllErrors();
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

  const handleCloseWithConfirm = () => {
    if (hasChanges) {
      confirmDialog.onOpen();
    } else {
      handleResetAndClose();
    }
  };

  const handleResetAndClose = () => {
    setDealValue('');
    setNotes('');
    clearAllErrors();
    confirmDialog.onClose();
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleCloseWithConfirm} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Mark Lead as Won 🎉
            {hasChanges && (
              <Text as="span" color="orange.500" fontSize="sm" ml={2}>
                (Unsaved)
              </Text>
            )}
          </ModalHeader>
          <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              Congratulations on winning <strong>{leadName}</strong>!
            </Text>

            <ValidatedInput
              label="Deal Value (Optional)"
              name="dealValue"
              type="number"
              value={dealValue}
              onChange={(e) => {
                setDealValue(e.target.value);
                clearError('dealValue');
              }}
              error={errors.dealValue}
              placeholder="Enter deal value (₹)"
              min="0"
              step="0.01"
              helperText="Future integration with revenue tracking"
            />

            <ValidatedTextarea
              label="Notes (Optional)"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this win (e.g., package details, special terms, etc.)"
              rows={4}
              maxLength={500}
              showCharCount={true}
            />
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleCloseWithConfirm}>
            Cancel
          </Button>
          <Button
            colorScheme="green"
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Updating..."
          >
            Mark as Won
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    <ConfirmDialog
      isOpen={confirmDialog.isOpen}
      onClose={confirmDialog.onClose}
      onConfirm={handleResetAndClose}
      title="Discard Changes?"
      message="You have unsaved changes. Are you sure you want to close this form?"
      confirmText="Discard"
      cancelText="Keep Editing"
      confirmColorScheme="red"
    />
  </>
  );
}
