'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  SimpleGrid,
  useToast,
  Text,
  Box,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { mutate } from 'swr';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    name: string;
  };
}

interface UsersResponse {
  success: boolean;
  data: User[];
}

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddLeadModal({ isOpen, onClose }: AddLeadModalProps) {
  const { data: session } = useSession();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  // Fetch agents for SuperAgent assignment dropdown
  const { data: usersResponse } = useSWR<UsersResponse>(
    session?.user?.role === 'SuperAgent' ? '/api/users?role=Agent' : null,
    fetcher
  );

  const agents = usersResponse?.data || [];
  const isSuperAgent = session?.user?.role === 'SuperAgent';

  // Get current date and time
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    date: currentDate,
    time: currentTime,
    source: '',
    name: '',
    campaign: '',
    phone: '',
    email: '',
    assignedToId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.phone || !formData.source) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in Client Name, Client Contact, and Client Platform',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare payload matching your API schema
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        source: formData.source,
        campaign: formData.campaign || null,
        priority: 'medium',
        assignedToId: formData.assignedToId || null,
        // Store date/time in notes for reference
        notes: `Lead created on ${formData.date} at ${formData.time}`,
      };

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create lead');
      }

      toast({
        title: 'Lead created successfully',
        description: result.message || 'The lead has been added to the system',
        status: 'success',
        duration: 3000,
      });

      // Refresh the leads list cache
      mutate('/api/leads');

      // Reset form
      setFormData({
        date: currentDate,
        time: currentTime,
        source: '',
        name: '',
        campaign: '',
        phone: '',
        email: '',
        assignedToId: '',
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Error creating lead',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleClose = () => {
    // Reset form on close
    setFormData({
      date: currentDate,
      time: currentTime,
      source: '',
      name: '',
      campaign: '',
      phone: '',
      email: '',
      assignedToId: '',
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="blue.500" fontSize="2xl">
          Add New Lead
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600">
                    Date:
                  </FormLabel>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    size="md"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600">
                    Time:
                  </FormLabel>
                  <Input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    size="md"
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={2} spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="600">
                    Client Platform:
                  </FormLabel>
                  <Select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    placeholder="Select a Platform"
                  >
                    <option value="Website">Website</option>
                    <option value="Meta">Meta</option>
                    <option value="Referral">Referral</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Direct">Direct</option>
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="600">
                    Client Name:
                  </FormLabel>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter client name"
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="600">
                    Ad Enquiry:
                  </FormLabel>
                  <Input
                    name="campaign"
                    value={formData.campaign}
                    onChange={handleChange}
                    placeholder="Campaign/Ad details"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="600">
                    Client Contact:
                  </FormLabel>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">
                  Client Email Address:
                </FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email address (optional)"
                />
              </FormControl>

              <FormControl isRequired={isSuperAgent}>
                <FormLabel fontSize="sm" fontWeight="600">
                  Handled By:
                </FormLabel>
                {isSuperAgent ? (
                  <Select
                    name="assignedToId"
                    value={formData.assignedToId}
                    onChange={handleChange}
                    placeholder="Select a Handled By"
                  >
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.email})
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Select isDisabled value={session?.user?.id}>
                    <option>{session?.user?.name} (You)</option>
                  </Select>
                )}
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                width="full"
                isLoading={loading}
                loadingText="Creating..."
                mt={2}
              >
                Submit
              </Button>
            </VStack>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
