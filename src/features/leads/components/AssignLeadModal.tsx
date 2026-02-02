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
import { useAuth } from '@/shared/lib/auth/auth-context';

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
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      
      console.log('Fetched users response:', result); // Debug log
      
      if (response.ok && result.success) {
        // API returns {success: true, data: users} format
        const usersList = result.data || [];
        console.log('Users list:', usersList); // Debug log
        
        if (usersList.length === 0) {
          console.warn('No users returned from API');
          setUsers([]);
          toast({
            title: 'Notice',
            description: 'No users found in the system',
            status: 'info',
            duration: 3000,
          });
          return;
        }
        
        // Filter to show only active agents
        const activeAgents = usersList.filter((user: User) => {
          const roleName = typeof user.role === 'string' ? user.role : user.role?.name;
          console.log('User:', user.name, 'Role:', roleName); // Debug log
          
          // Include all agent-type roles (adjust based on your actual role names)
          return roleName && (
            roleName.toLowerCase().includes('agent') || 
            roleName.toLowerCase().includes('lead') ||
            roleName === 'sales_agent' || 
            roleName === 'team_lead' || 
            roleName === 'super_agent'
          );
        });
        
        console.log('Filtered agents:', activeAgents); // Debug log
        
        if (activeAgents.length === 0) {
          console.warn('No agents found after filtering');
          // Show all users if no agents found
          setUsers(usersList);
          toast({
            title: 'Notice',
            description: 'No agents found, showing all users',
            status: 'info',
            duration: 3000,
          });
        } else {
          setUsers(activeAgents);
        }
      } else {
        console.error('Failed to fetch users:', result.error || 'Unknown error');
        setUsers([]);
        toast({
          title: 'Error',
          description: result.error || 'Could not load users',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      toast({
        title: 'Error',
        description: 'Network error while loading users',
        status: 'error',
        duration: 3000,
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
          assignmentReason: reason || undefined,
          assignmentType: 'MANUAL',
          updatedById: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign lead');
      }

      // Create audit log entry with enhanced metadata
      try {
        const activityData = {
          leadId,
          userId: user?.id,
          action: 'assigned',
          fieldName: 'assignedToId',
          oldValue: currentAssignee || 'Unassigned',
          newValue: selectedUser?.name || 'Unknown',
          description: currentAssignee 
            ? `Lead reassigned from ${currentAssignee} to ${selectedUser?.name}${reason ? ` - Reason: ${reason}` : ''}` 
            : `Lead assigned to ${selectedUser?.name}${reason ? ` - Reason: ${reason}` : ''}`,
          metadata: {
            assignmentType: 'MANUAL',
            reason: reason || null,
            timestamp: new Date().toISOString(),
            previousAssigneeId: null,
            newAssigneeId: selectedUserId,
          },
        };
        
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activityData),
        }).catch(err => console.error('Failed to create audit log:', err));
      } catch (error) {
        console.error('Audit log error:', error);
      }

      // Create notification for assigned user
      try {
        const assignerName = user?.name || 'Super Agent';
        const assignedToName = selectedUser?.name || 'Unknown User';
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: selectedUserId,
            title: 'Lead Assigned',
            message: `${assignerName} assigned ${leadName} to ${assignedToName}${reason ? ` - ${reason}` : ''}`,
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





