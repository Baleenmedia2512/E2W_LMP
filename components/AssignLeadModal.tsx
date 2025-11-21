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
import { useState, useEffect } from 'react';

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
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const toast = useToast();

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setIsFetchingUsers(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      
      if (data.success) {
        // Filter only agents and super agents
        const agents = data.data.filter((user: User) => 
          user.role.name === 'Agent' || user.role.name === 'SuperAgent'
        );
        setUsers(agents);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsFetchingUsers(false);
    }
  };

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
      const res = await fetch('/api/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          assignedToId: selectedUserId,
          reason: reason || 'Manual assignment',
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Lead "${leadName}" assigned successfully`,
          status: 'success',
          duration: 3000,
        });
        
        // Trigger notification refresh and undoable action event
        window.dispatchEvent(new Event('undoable-action-created'));
        
        onSuccess();
        onClose();
        setSelectedUserId('');
        setReason('');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to assign lead',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Assign error:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign lead',
        status: 'error',
        duration: 3000,
      });
    } finally {
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
                placeholder={isFetchingUsers ? 'Loading users...' : 'Select user'}
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                isDisabled={isFetchingUsers}
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
