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
  Select,
  Textarea,
  Input,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  currentStatus: string;
  onSuccess?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', requiresReason: false },
  { value: 'followup', label: 'Follow-up', requiresReason: false },
  { value: 'won', label: 'Won', requiresReason: false },
  { value: 'lost', label: 'Lost', requiresReason: true },
  { value: 'unreach', label: 'Unreachable', requiresReason: true },
  { value: 'unqualified', label: 'Unqualified', requiresReason: true },
];

const LOST_REASONS = [
  'Chose Competitor',
  'Price Too High',
  'Wrong Timing',
  'Budget Constraints',
  'No Response',
  'Not Interested Anymore',
  'Requirements Mismatch',
  'Other',
];

export default function ChangeStatusModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  currentStatus,
  onSuccess,
}: ChangeStatusModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [notes, setNotes] = useState('');
  
  // Follow-up specific fields
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('09:00');
  const [followUpNotes, setFollowUpNotes] = useState('');

  useEffect(() => {
    setNewStatus(currentStatus);
  }, [currentStatus, isOpen]);

  const selectedOption = STATUS_OPTIONS.find(opt => opt.value === newStatus);
  const requiresReason = selectedOption?.requiresReason || false;

  const handleSubmit = async () => {
    // Validation
    if (newStatus === currentStatus) {
      toast({
        title: 'No Change',
        description: 'Please select a different status',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (requiresReason && !reason.trim()) {
      toast({
        title: 'Reason Required',
        description: `Please provide a reason for marking as ${selectedOption?.label}`,
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    // Follow-up specific validation
    if (newStatus === 'followup') {
      if (!followUpDate) {
        toast({
          title: 'Date Required',
          description: 'Please select a follow-up date',
          status: 'warning',
          duration: 3000,
        });
        return;
      }

      const scheduledDateTime = new Date(`${followUpDate}T${followUpTime}`);
      const now = new Date();
      
      if (scheduledDateTime <= now) {
        toast({
          title: 'Invalid Date/Time',
          description: 'Follow-up date and time must be in the future',
          status: 'error',
          duration: 5000,
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Handle follow-up status separately
      if (newStatus === 'followup') {
        const scheduledDateTime = new Date(`${followUpDate}T${followUpTime}`);
        
        // Update lead status to followup
        const leadResponse = await fetch(`/api/leads/${leadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'followup',
            notes: followUpNotes || 'Status changed to Follow-up',
          }),
        });

        if (!leadResponse.ok) {
          throw new Error('Failed to update lead status');
        }

        // Create follow-up
        const followUpResponse = await fetch('/api/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            scheduledAt: scheduledDateTime,
            status: 'pending',
            customerRequirement: followUpNotes?.trim() || 'Follow-up scheduled from status change',
            notes: followUpNotes || 'Follow-up scheduled from status change',
          }),
        });

        if (!followUpResponse.ok) {
          throw new Error('Failed to create follow-up');
        }

        toast({
          title: 'Success!',
          description: `Status updated to Follow-up and scheduled for ${scheduledDateTime.toLocaleDateString()}`,
          status: 'success',
          duration: 3000,
        });

        // Reset form
        setReason('');
        setDealValue('');
        setNotes('');
        setFollowUpDate('');
        setFollowUpTime('09:00');
        setFollowUpNotes('');
        onClose();
        
        if (onSuccess) {
          onSuccess();
        }
        return;
      }

      // Prepare update payload for other statuses
      const updatePayload: any = {
        status: newStatus,
      };

      // Handle status-specific data
      if (newStatus === 'won') {
        const wonNotes = dealValue
          ? `Deal Won! Value: ₹${dealValue}. ${notes || ''}`
          : `Deal Won! ${notes || ''}`;
        updatePayload.notes = wonNotes;
        if (dealValue) {
          updatePayload.metadata = { dealValue: parseFloat(dealValue) };
        }
      } else if (newStatus === 'lost') {
        updatePayload.customerRequirement = reason;
        updatePayload.notes = notes
          ? `Deal Lost - Reason: ${reason}. Details: ${notes}`
          : `Deal Lost - Reason: ${reason}`;
      } else if (newStatus === 'unreach') {
        updatePayload.customerRequirement = reason;
        updatePayload.notes = `Marked as Unreachable: ${reason}`;
      } else if (newStatus === 'unqualified') {
        updatePayload.customerRequirement = reason;
        updatePayload.notes = notes
          ? `Marked as Unqualified: ${reason}. Additional Notes: ${notes}`
          : `Marked as Unqualified: ${reason}`;
      } else if (notes) {
        updatePayload.notes = notes;
      }

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        const successMessage = newStatus === 'won' 
          ? `${leadName} has been marked as Won 🎉`
          : `Status updated to ${selectedOption?.label}`;

        toast({
          title: 'Success!',
          description: successMessage,
          status: 'success',
          duration: 3000,
        });

        setReason('');
        setDealValue('');
        setNotes('');
        setFollowUpDate('');
        setFollowUpTime('09:00');
        setFollowUpNotes('');
        onClose();
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error('Failed to update lead');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update lead status',
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
        <ModalHeader>Change Lead Status</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              Change status for <strong>{leadName}</strong>
            </Text>

            <FormControl isRequired>
              <FormLabel fontWeight="600">New Status</FormLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                autoFocus
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormControl>

            {/* Won-specific fields */}
            {newStatus === 'won' && (
              <>
                <FormControl>
                  <FormLabel fontWeight="600">Deal Value (Optional)</FormLabel>
                  <Input
                    type="number"
                    placeholder="Enter deal value (₹)"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Future integration with revenue tracking
                  </Text>
                </FormControl>
                <FormControl>
                  <FormLabel fontWeight="600">Notes (Optional)</FormLabel>
                  <Textarea
                    placeholder="Package details, special terms, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </FormControl>
              </>
            )}

            {/* Follow-up specific fields */}
            {newStatus === 'followup' && (
              <>
                <FormControl isRequired>
                  <FormLabel fontWeight="600">Follow-up Date (Required)</FormLabel>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontWeight="600">Follow-up Time (Required)</FormLabel>
                  <Input
                    type="time"
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                  />
                </FormControl>
              </>
            )}

            {/* Lost-specific fields */}
            {newStatus === 'lost' && (
              <>
                <FormControl isRequired>
                  <FormLabel fontWeight="600">Reason (Required)</FormLabel>
                  <Select
                    placeholder="Select a reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    {LOST_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontWeight="600">Additional Details (Optional)</FormLabel>
                  <Textarea
                    placeholder="Competitor name, specific concerns, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </FormControl>
              </>
            )}

            {/* Unreachable-specific fields */}
            {newStatus === 'unreach' && (
              <FormControl isRequired>
                <FormLabel fontWeight="600">Reason (Required)</FormLabel>
                <Textarea
                  placeholder="Why is this lead unreachable? (e.g., Phone not answering, Invalid number, etc.)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                />
              </FormControl>
            )}

            {/* Unqualified-specific fields */}
            {newStatus === 'unqualified' && (
              <FormControl isRequired>
                <FormLabel fontWeight="600">Reason (Required)</FormLabel>
                <Textarea
                  placeholder="Why is this lead unqualified? (e.g., Budget constraints, Not interested, etc.)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                />
              </FormControl>
            )}

            {/* Generic notes for other statuses */}
            {!requiresReason && newStatus !== 'won' && newStatus !== 'followup' && (
              <FormControl>
                <FormLabel fontWeight="600">Notes (Optional)</FormLabel>
                <Textarea
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </FormControl>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme={newStatus === 'won' ? 'green' : newStatus === 'lost' ? 'red' : 'blue'}
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Updating..."
          >
            Update Status
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
