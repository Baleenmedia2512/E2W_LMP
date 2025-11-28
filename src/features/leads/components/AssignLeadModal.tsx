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
  HStack,
  Spinner,
  Badge,
  Box,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role?: string | { name: string };
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
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        console.warn('Failed to fetch users, using empty list');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Warning',
        description: 'Could not load all users',
        status: 'warning',
        duration: 2000,
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const getRoleDisplay = (role: string | { name: string } | undefined): string => {
    if (!role) return 'User';
    if (typeof role === 'string') return role;
    return role.name || 'User';
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
      const selectedUser = users.find(u => u.id === selectedUserId);
      
      // Update lead via API
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedToId: selectedUserId,
          notes: reason || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign lead');
      }

      // Create audit log entry
      try {
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            action: 'LEAD_ASSIGNED',
            details: {
              previousAssignee: currentAssignee || 'Unassigned',
              newAssignee: selectedUser?.name || 'Unknown',
              reason: reason || 'No reason provided',
              assignmentType: 'MANUAL',
            },
          }),
        }).catch(err => console.error('Failed to create audit log:', err));
      } catch (error) {
        console.error('Audit log error:', error);
      }

      // Create notification for assigned user
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: selectedUserId,
            title: 'Lead Assigned',
            message: `Lead "${leadName}" has been assigned to you${reason ? ` - ${reason}` : ''}`,
            type: 'LEAD_ASSIGNED',
            relatedLeadId: leadId,
          }),
        }).catch(err => console.error('Failed to create notification:', err));
      } catch (error) {
        console.error('Notification error:', error);
      }

      toast({
        title: 'Success',
        description: `Lead assigned to ${selectedUser?.name}`,
        status: 'success',
        duration: 3000,
      });
      onSuccess();
      onClose();
      setSelectedUserId('');
      setReason('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign lead',
        status: 'error',
        duration: 3000,
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Assign Lead</ModalHeader>
        <ModalCloseButton isDisabled={isLoading} />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box p={3} bg="blue.50" borderRadius="md">
              <Text fontSize="sm" color="gray.600">
                Lead: <strong>{leadName}</strong>
              </Text>
              {currentAssignee && (
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Currently assigned to: <Badge>{currentAssignee}</Badge>
                </Text>
              )}
            </Box>

            <FormControl isRequired>
              <FormLabel>Assign To</FormLabel>
              {isLoadingUsers ? (
                <HStack justify="center" py={4}>
                  <Spinner size="sm" />
                  <Text fontSize="sm">Loading agents...</Text>
                </HStack>
              ) : users.length === 0 ? (
                <Text fontSize="sm" color="orange.600" py={2}>
                  ⚠️ No agents available
                </Text>
              ) : (
                <Select
                  placeholder="Select user"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({getRoleDisplay(user.role)}) - {user.email}
                    </option>
                  ))}
                </Select>
              )}
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
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleAssign}
            isLoading={isLoading}
            isDisabled={isLoadingUsers || users.length === 0}
            loadingText="Assigning..."
          >
            Assign Lead
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}





