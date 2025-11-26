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
  useToast,
  VStack,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { mockUsers, updateLead } from '@/lib/mock-data';

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    name: string;
  };
}

interface AssignLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  currentAssignee?: string;
  onSuccess: () => void;
}

export default function AssignLeadModal({
  isOpen,
  onClose,
  leadId,
  leadName,
  currentAssignee,
  onSuccess,
}: AssignLeadModalProps) {
  // Get users from mock data
  const users = mockUsers.filter(user => 
    user.role.name === 'Agent' || user.role.name === 'SuperAgent'
  );
  const [selectedUserId, setSelectedUserId] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user to assign',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Find the selected user
      const selectedUser = users.find(u => u.id === selectedUserId);
      if (!selectedUser) {
        toast({
          title: 'Error',
          description: 'Selected user not found',
          status: 'error',
          duration: 3000,
        });
        setIsLoading(false);
        return;
      }

      // Update lead assignment in mock data
      updateLead(leadId, {
        assignedTo: {
          id: selectedUser.id,
          name: selectedUser.name,
          email: selectedUser.email,
        },
        notes: reason || 'Manual assignment',
      });

      toast({
        title: 'Success',
        description: `Lead "${leadName}" assigned to ${selectedUser.name}`,
        status: 'success',
        duration: 3000,
      });

      onSuccess();
      onClose();
      setSelectedUserId('');
      setReason('');
      setIsLoading(false);
      
      // Reload to show updated assignment
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign lead',
        status: 'error',
        duration: 3000,
      });
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Assign Lead</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              Lead: <strong>{leadName}</strong>
            </Text>
            {currentAssignee && (
              <Text fontSize="sm" color="gray.600">
                Currently assigned to: <strong>{currentAssignee}</strong>
              </Text>
            )}

            <FormControl isRequired>
              <FormLabel>Assign To</FormLabel>
              <Select
                placeholder="Select user"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role.name}) - {user.email}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Reason (Optional)</FormLabel>
              <Textarea
                placeholder="Why are you assigning this lead?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleAssign}
            isLoading={isLoading}
            loadingText="Assigning..."
          >
            Assign Lead
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
